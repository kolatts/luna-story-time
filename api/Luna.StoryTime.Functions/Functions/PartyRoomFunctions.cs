using System.Text.Json;
using Azure;
using Azure.Data.Tables;
using Luna.StoryTime.Functions.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;

namespace Luna.StoryTime.Functions.Functions;

/// <summary>
/// Polling "mailbox" multiplayer backend for The Birthday Party Patrol (party/SPEC.md).
/// The room creator's browser is the authoritative game server; these endpoints only
/// relay lobby state, guest commands, and host snapshots through the PartyRooms table.
/// </summary>
public class PartyRoomFunctions(PartyRoomsTable partyTable, ILogger<PartyRoomFunctions> logger)
{
    private const int MaxPlayers = 4;
    // No I/O/L/U — kids read these aloud across the room.
    private const string CodeAlphabet = "ABCDEFGHJKMNPQRSTVWXYZ";
    private static readonly HashSet<string> KnownCharacters =
        ["moon", "babylady", "cottontail", "winds", "shock", "elysian", "unicorn", "leeblebeest"];
    private static readonly TimeSpan RoomLifetime = TimeSpan.FromHours(24);

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    private TableClient Table => partyTable.Client;

    // ---------------------------------------------------------------- create

    [Function("PartyCreateRoom")]
    public async Task<IActionResult> Create(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "party/rooms")] HttpRequest req)
    {
        await CleanupOldRoomsAsync();

        var player = NewPlayer();
        var entity = new PartyRoomEntity
        {
            HostId = player.Id,
            PlayersJson = JsonSerializer.Serialize(new List<PartyPlayer> { player }, JsonOptions),
        };

        for (var attempt = 0; attempt < 5; attempt++)
        {
            entity.RowKey = NewRoomCode();
            try
            {
                await Table.AddEntityAsync(entity);
                return new OkObjectResult(new { ok = true, code = entity.RowKey, playerId = player.Id, secret = player.Secret });
            }
            catch (RequestFailedException ex) when (ex.Status == StatusCodes.Status409Conflict)
            {
                // Code collision — roll again.
            }
        }

        return new ObjectResult(new { ok = false, message = "The castle ran out of door keys — please try again." })
        {
            StatusCode = StatusCodes.Status503ServiceUnavailable,
        };
    }

    // ------------------------------------------------------------------ join

    [Function("PartyJoinRoom")]
    public async Task<IActionResult> Join(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "party/rooms/{code}/join")] HttpRequest req,
        string code)
    {
        code = NormalizeCode(code);
        PartyPlayer? player = null;

        var result = await MutateRoomAsync(code, room =>
        {
            if (room.Phase != "lobby")
            {
                return Friendly(StatusCodes.Status410Gone, "That party has already started — ask for a new code!");
            }

            var players = ReadPlayers(room);
            if (players.Count >= MaxPlayers)
            {
                return Friendly(StatusCodes.Status409Conflict, "That party is full — four friends are already inside!");
            }

            player = NewPlayer();
            players.Add(player);
            room.PlayersJson = JsonSerializer.Serialize(players, JsonOptions);
            return null;
        });

        if (result is not null)
        {
            return result;
        }

        var entity = await GetRoomAsync(code);
        return new OkObjectResult(new
        {
            ok = true,
            playerId = player!.Id,
            secret = player.Secret,
            room = RoomPayload(entity!, includeCommandsAfter: null, commands: null),
        });
    }

    // -------------------------------------------------------- player update

    [Function("PartyUpdatePlayer")]
    public async Task<IActionResult> UpdatePlayer(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "party/rooms/{code}/player")] HttpRequest req,
        string code)
    {
        code = NormalizeCode(code);
        var body = await ReadBodyAsync<PartyPlayerUpdateRequest>(req);
        if (body?.PlayerId is null || body.Secret is null)
        {
            return Friendly(StatusCodes.Status400BadRequest, "Missing player info.");
        }

        var result = await MutateRoomAsync(code, room =>
        {
            var players = ReadPlayers(room);
            var me = players.FirstOrDefault(p => p.Id == body.PlayerId && p.Secret == body.Secret);
            if (me is null)
            {
                return Friendly(StatusCodes.Status403Forbidden, "That door key doesn't fit this room.");
            }

            if (body.Side is not null)
            {
                if (body.Side is not ("patrol" or "snackers"))
                {
                    return Friendly(StatusCodes.Status400BadRequest, "Unknown side.");
                }
                if (me.Side != body.Side)
                {
                    me.Side = body.Side;
                    me.Character = null; // side switch clears the pick
                    me.Ready = false;
                }
            }

            if (body.Character is not null)
            {
                if (!KnownCharacters.Contains(body.Character))
                {
                    return Friendly(StatusCodes.Status400BadRequest, "Unknown character.");
                }
                var taken = players.Any(p => p.Id != me.Id && p.Character == body.Character);
                if (taken)
                {
                    return Friendly(StatusCodes.Status409Conflict, "A friend already picked that character!");
                }
                me.Character = body.Character;
            }

            if (body.Ready is not null)
            {
                me.Ready = body.Ready.Value;
            }

            me.LastSeen = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            room.PlayersJson = JsonSerializer.Serialize(players, JsonOptions);
            return null;
        });

        if (result is not null)
        {
            return result;
        }

        var entity = await GetRoomAsync(code);
        return new OkObjectResult(new { ok = true, room = RoomPayload(entity!, null, null) });
    }

    // ----------------------------------------------------------- start/reset

    [Function("PartyStartRoom")]
    public Task<IActionResult> Start(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "party/rooms/{code}/start")] HttpRequest req,
        string code) => HostPhaseChangeAsync(req, code, toPhase: "playing");

    [Function("PartyResetRoom")]
    public Task<IActionResult> Reset(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "party/rooms/{code}/reset")] HttpRequest req,
        string code) => HostPhaseChangeAsync(req, code, toPhase: "lobby");

    private async Task<IActionResult> HostPhaseChangeAsync(HttpRequest req, string code, string toPhase)
    {
        code = NormalizeCode(code);
        var body = await ReadBodyAsync<PartyAuthRequest>(req);
        if (body?.PlayerId is null || body.Secret is null)
        {
            return Friendly(StatusCodes.Status400BadRequest, "Missing player info.");
        }

        var result = await MutateRoomAsync(code, room =>
        {
            var players = ReadPlayers(room);
            var me = players.FirstOrDefault(p => p.Id == body.PlayerId && p.Secret == body.Secret);
            if (me is null || room.HostId != me.Id)
            {
                return Friendly(StatusCodes.Status403Forbidden, "Only the party host can do that.");
            }

            room.Phase = toPhase;
            if (toPhase == "lobby")
            {
                room.SnapshotJson = null;
                room.SnapshotVersion = 0;
                room.ResultJson = null;
                foreach (var p in players)
                {
                    p.Ready = false;
                }
                room.PlayersJson = JsonSerializer.Serialize(players, JsonOptions);
            }
            return null;
        });

        if (result is not null)
        {
            return result;
        }

        var entity = await GetRoomAsync(code);
        return new OkObjectResult(new { ok = true, room = RoomPayload(entity!, null, null) });
    }

    // ------------------------------------------------------------------- get

    [Function("PartyGetRoom")]
    public async Task<IActionResult> Get(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "party/rooms/{code}")] HttpRequest req,
        string code)
    {
        code = NormalizeCode(code);
        var entity = await GetRoomAsync(code);
        if (entity is null)
        {
            return Friendly(StatusCodes.Status404NotFound, "No party behind that code — check the letters!");
        }

        List<object>? commands = null;
        string? after = req.Query.ContainsKey("after") ? (string?)req.Query["after"] : null;
        if (after is not null)
        {
            commands = [];
            var filter = TableClient.CreateQueryFilter(
                $"PartitionKey eq {code} and RowKey gt {after}");
            await foreach (var cmd in Table.QueryAsync<TableEntity>(filter, maxPerPage: 100))
            {
                commands.Add(new
                {
                    rk = cmd.RowKey,
                    playerId = cmd.GetString("PlayerId"),
                    cmd = JsonSerializer.Deserialize<JsonElement>(cmd.GetString("CmdJson") ?? "{}"),
                });
                if (commands.Count >= 200)
                {
                    break;
                }
            }
        }

        return new OkObjectResult(RoomPayload(entity, after, commands));
    }

    // --------------------------------------------------------------- command

    [Function("PartyPostCommand")]
    public async Task<IActionResult> PostCommand(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "party/rooms/{code}/command")] HttpRequest req,
        string code)
    {
        code = NormalizeCode(code);
        var body = await ReadBodyAsync<PartyCommandRequest>(req);
        if (body?.PlayerId is null || body.Secret is null)
        {
            return Friendly(StatusCodes.Status400BadRequest, "Missing player info.");
        }

        var entity = await GetRoomAsync(code);
        if (entity is null)
        {
            return Friendly(StatusCodes.Status404NotFound, "No party behind that code.");
        }
        var players = ReadPlayers(entity);
        if (!players.Any(p => p.Id == body.PlayerId && p.Secret == body.Secret))
        {
            return Friendly(StatusCodes.Status403Forbidden, "That door key doesn't fit this room.");
        }

        var cmdJson = body.Cmd.ValueKind == JsonValueKind.Undefined ? "{}" : body.Cmd.GetRawText();
        if (cmdJson.Length > 2048)
        {
            return Friendly(StatusCodes.Status400BadRequest, "Command too large.");
        }

        var rk = $"{DateTimeOffset.UtcNow.UtcTicks:D19}-{Guid.NewGuid():N}"[..28];
        await Table.AddEntityAsync(new TableEntity(code, rk)
        {
            ["PlayerId"] = body.PlayerId,
            ["CmdJson"] = cmdJson,
        });

        return new OkObjectResult(new { ok = true, rk });
    }

    // -------------------------------------------------------------- snapshot

    [Function("PartyPostSnapshot")]
    public async Task<IActionResult> PostSnapshot(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "party/rooms/{code}/snapshot")] HttpRequest req,
        string code)
    {
        code = NormalizeCode(code);
        var body = await ReadBodyAsync<PartySnapshotRequest>(req);
        if (body?.PlayerId is null || body.Secret is null)
        {
            return Friendly(StatusCodes.Status400BadRequest, "Missing player info.");
        }

        var result = await MutateRoomAsync(code, room =>
        {
            var players = ReadPlayers(room);
            var me = players.FirstOrDefault(p => p.Id == body.PlayerId && p.Secret == body.Secret);
            if (me is null || room.HostId != me.Id)
            {
                return Friendly(StatusCodes.Status403Forbidden, "Only the party host can post the game state.");
            }

            if (body.Snapshot.ValueKind is not (JsonValueKind.Undefined or JsonValueKind.Null))
            {
                room.SnapshotJson = body.Snapshot.GetRawText();
                room.SnapshotVersion++;
            }
            if (body.Phase is "playing" or "done")
            {
                room.Phase = body.Phase;
            }
            if (body.Result is { ValueKind: not (JsonValueKind.Undefined or JsonValueKind.Null) } res)
            {
                room.ResultJson = res.GetRawText();
            }

            me.LastSeen = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            room.PlayersJson = JsonSerializer.Serialize(players, JsonOptions);
            return null;
        });

        if (result is not null)
        {
            return result;
        }

        if (!string.IsNullOrEmpty(body.Consumed))
        {
            await PruneCommandsAsync(code, body.Consumed);
        }

        return new OkObjectResult(new { ok = true });
    }

    // --------------------------------------------------------------- helpers

    private static PartyPlayer NewPlayer() => new()
    {
        Id = Guid.NewGuid().ToString("N")[..8],
        Secret = Guid.NewGuid().ToString("N"),
        LastSeen = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
    };

    private static string NewRoomCode()
    {
        var chars = new char[4];
        for (var i = 0; i < chars.Length; i++)
        {
            chars[i] = CodeAlphabet[Random.Shared.Next(CodeAlphabet.Length)];
        }
        return new string(chars);
    }

    private static string NormalizeCode(string code) => code.Trim().ToUpperInvariant();

    private static List<PartyPlayer> ReadPlayers(PartyRoomEntity room) =>
        JsonSerializer.Deserialize<List<PartyPlayer>>(room.PlayersJson, JsonOptions) ?? [];

    private async Task<PartyRoomEntity?> GetRoomAsync(string code)
    {
        try
        {
            return (await Table.GetEntityAsync<PartyRoomEntity>("ROOM", code)).Value;
        }
        catch (RequestFailedException ex) when (ex.Status == StatusCodes.Status404NotFound)
        {
            return null;
        }
    }

    /// <summary>
    /// ETag-guarded read-mutate-write with retries (same pattern as the suggestion
    /// daily-cap counter). The mutator returns a non-null IActionResult to abort.
    /// </summary>
    private async Task<IActionResult?> MutateRoomAsync(string code, Func<PartyRoomEntity, IActionResult?> mutate)
    {
        for (var attempt = 0; attempt < 4; attempt++)
        {
            var room = await GetRoomAsync(code);
            if (room is null)
            {
                return Friendly(StatusCodes.Status404NotFound, "No party behind that code — check the letters!");
            }

            var abort = mutate(room);
            if (abort is not null)
            {
                return abort;
            }

            try
            {
                await Table.UpdateEntityAsync(room, room.ETag, TableUpdateMode.Replace);
                return null;
            }
            catch (RequestFailedException ex) when (
                ex.Status is StatusCodes.Status409Conflict or StatusCodes.Status412PreconditionFailed)
            {
                // Someone raced us — re-read and retry.
            }
        }

        return Friendly(StatusCodes.Status409Conflict, "The castle doors are busy — try again!");
    }

    private object RoomPayload(PartyRoomEntity room, string? includeCommandsAfter, List<object>? commands)
    {
        var players = ReadPlayers(room).Select(p => new
        {
            id = p.Id,
            side = p.Side,
            character = p.Character,
            ready = p.Ready,
            isHost = p.Id == room.HostId,
            lastSeen = p.LastSeen,
        });

        return new
        {
            ok = true,
            code = room.RowKey,
            phase = room.Phase,
            hostId = room.HostId,
            players,
            snapshotVersion = room.SnapshotVersion,
            snapshot = room.SnapshotJson is null ? (JsonElement?)null : JsonSerializer.Deserialize<JsonElement>(room.SnapshotJson),
            result = room.ResultJson is null ? (JsonElement?)null : JsonSerializer.Deserialize<JsonElement>(room.ResultJson),
            commands,
            serverTime = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
        };
    }

    private async Task PruneCommandsAsync(string code, string upToRk)
    {
        try
        {
            var filter = TableClient.CreateQueryFilter(
                $"PartitionKey eq {code} and RowKey le {upToRk}");
            var deletions = new List<Task>();
            await foreach (var cmd in Table.QueryAsync<TableEntity>(filter, maxPerPage: 100, select: ["PartitionKey", "RowKey"]))
            {
                deletions.Add(Table.DeleteEntityAsync(cmd.PartitionKey, cmd.RowKey));
                if (deletions.Count >= 200)
                {
                    break;
                }
            }
            await Task.WhenAll(deletions);
        }
        catch (RequestFailedException ex)
        {
            logger.LogWarning(ex, "Best-effort command prune failed for room {Code}", code);
        }
    }

    /// <summary>Best-effort sweep of stale rooms (and their queued commands) on room creation.</summary>
    private async Task CleanupOldRoomsAsync()
    {
        try
        {
            var cutoff = DateTimeOffset.UtcNow - RoomLifetime;
            var filter = TableClient.CreateQueryFilter(
                $"PartitionKey eq {"ROOM"} and CreatedAt lt {cutoff}");
            var stale = new List<string>();
            await foreach (var room in Table.QueryAsync<PartyRoomEntity>(filter, maxPerPage: 25))
            {
                stale.Add(room.RowKey);
                if (stale.Count >= 25)
                {
                    break;
                }
            }

            foreach (var code in stale)
            {
                await PruneCommandsAsync(code, upToRk: "9999999999999999999-zzzz");
                await Table.DeleteEntityAsync("ROOM", code);
            }
        }
        catch (RequestFailedException ex)
        {
            logger.LogWarning(ex, "Best-effort stale-room cleanup failed");
        }
    }

    private static async Task<T?> ReadBodyAsync<T>(HttpRequest req) where T : class
    {
        try
        {
            return await JsonSerializer.DeserializeAsync<T>(req.Body, JsonOptions);
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private static ObjectResult Friendly(int statusCode, string message) =>
        new(new { ok = false, message }) { StatusCode = statusCode };
}
