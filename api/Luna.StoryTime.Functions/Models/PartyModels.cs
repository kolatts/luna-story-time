using System.Text.Json;
using System.Text.Json.Serialization;
using Azure;
using Azure.Data.Tables;

namespace Luna.StoryTime.Functions.Models;

/// <summary>Marker wrapper so DI can hold two TableClients (suggestions + party rooms).</summary>
public sealed record PartyRoomsTable(TableClient Client);

public class PartyRoomEntity : ITableEntity
{
    public string PartitionKey { get; set; } = "ROOM";
    public string RowKey { get; set; } = string.Empty; // room code
    public DateTimeOffset? Timestamp { get; set; }
    public ETag ETag { get; set; }

    public string HostId { get; set; } = string.Empty;
    public string Phase { get; set; } = "lobby"; // lobby | playing | done
    public string PlayersJson { get; set; } = "[]";
    public string? SnapshotJson { get; set; }
    public int SnapshotVersion { get; set; }
    public string? ResultJson { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

/// <summary>Server-side player record (secret never leaves in room payloads).</summary>
public class PartyPlayer
{
    [JsonPropertyName("id")] public string Id { get; set; } = string.Empty;
    [JsonPropertyName("secret")] public string Secret { get; set; } = string.Empty;
    [JsonPropertyName("side")] public string? Side { get; set; } // patrol | snackers
    [JsonPropertyName("character")] public string? Character { get; set; }
    [JsonPropertyName("ready")] public bool Ready { get; set; }
    [JsonPropertyName("lastSeen")] public long LastSeen { get; set; } // unix ms
}

public class PartyPlayerUpdateRequest
{
    public string? PlayerId { get; set; }
    public string? Secret { get; set; }
    public string? Side { get; set; }
    public string? Character { get; set; }
    public bool? Ready { get; set; }
}

public class PartyCommandRequest
{
    public string? PlayerId { get; set; }
    public string? Secret { get; set; }
    public JsonElement Cmd { get; set; }
}

public class PartySnapshotRequest
{
    public string? PlayerId { get; set; }
    public string? Secret { get; set; }
    public JsonElement Snapshot { get; set; }
    public string? Phase { get; set; }
    public JsonElement? Result { get; set; }
    /// <summary>Highest command RowKey the host has applied; older entities get pruned.</summary>
    public string? Consumed { get; set; }
}

public class PartyAuthRequest
{
    public string? PlayerId { get; set; }
    public string? Secret { get; set; }
}
