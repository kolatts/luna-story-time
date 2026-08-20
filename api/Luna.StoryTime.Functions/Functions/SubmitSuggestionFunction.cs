using System.Text.Json;
using Azure;
using Azure.Data.Tables;
using Luna.StoryTime.Functions.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;

namespace Luna.StoryTime.Functions.Functions;

public class SubmitSuggestionFunction(
    TableClient tableClient,
    IHttpClientFactory httpClientFactory,
    ILogger<SubmitSuggestionFunction> logger)
{
    private const int IdeaMinLength = 3;
    private const int IdeaMaxLength = 500;
    private const int NameMaxLength = 50;
    private const int LocationMaxLength = 100;
    private const int DailyCap = 10;
    private const string TurnstileVerifyUrl = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    [Function("SubmitSuggestion")]
    public async Task<IActionResult> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "suggestions")] HttpRequest req)
    {
        SuggestionRequest? request;
        try
        {
            request = await JsonSerializer.DeserializeAsync<SuggestionRequest>(req.Body, JsonOptions);
        }
        catch (JsonException)
        {
            request = null;
        }

        if (request is null)
        {
            return Friendly400("That didn't look like a story idea. Please try again.");
        }

        // Honeypot: bots fill every field. Pretend success, write nothing.
        if (!string.IsNullOrWhiteSpace(request.Website))
        {
            return new OkObjectResult(new { ok = true });
        }

        var idea = request.Idea?.Trim();
        if (string.IsNullOrEmpty(idea) || idea.Length < IdeaMinLength)
        {
            return Friendly400("Please tell us a little more about your story idea.");
        }
        if (idea.Length > IdeaMaxLength)
        {
            return Friendly400($"That's a big dream! Please keep it under {IdeaMaxLength} letters.");
        }

        var name = Truncate(request.Name, NameMaxLength);
        var location = Truncate(request.Location, LocationMaxLength);

        if (!await VerifyTurnstileAsync(request.TurnstileToken))
        {
            return Friendly400("The magic gate didn't open — please try the check again.");
        }

        if (!await TryCountTowardDailyCapAsync())
        {
            return new ObjectResult(new { ok = false, message = "The castle mailbox is full for today — please come back tomorrow!" })
            {
                StatusCode = StatusCodes.Status429TooManyRequests,
            };
        }

        var entity = new SuggestionEntity
        {
            IdeaText = idea,
            SubmitterName = name,
            SubmitterLocation = location,
        };
        await tableClient.AddEntityAsync(entity);

        logger.LogInformation("Stored story suggestion {RowKey} ({Length} chars)", entity.RowKey, idea.Length);
        return new OkObjectResult(new { ok = true });
    }

    /// <summary>
    /// Server-side Cloudflare Turnstile check (never trust the client). Mirrors
    /// imagile-app's TurnstileVerificationService. Skipped when TURNSTILE_SECRET
    /// is not configured (local dev); fails open on Cloudflare outages so a
    /// Cloudflare blip never swallows a kid's story idea.
    /// </summary>
    private async Task<bool> VerifyTurnstileAsync(string? token)
    {
        var secret = Environment.GetEnvironmentVariable("TURNSTILE_SECRET");
        if (string.IsNullOrWhiteSpace(secret))
        {
            return true;
        }
        if (string.IsNullOrWhiteSpace(token))
        {
            return false;
        }

        try
        {
            var client = httpClientFactory.CreateClient();
            using var response = await client.PostAsync(TurnstileVerifyUrl, new FormUrlEncodedContent(
                new Dictionary<string, string> { ["secret"] = secret, ["response"] = token }));
            using var doc = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync());
            return doc.RootElement.TryGetProperty("success", out var success) && success.GetBoolean();
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or JsonException)
        {
            logger.LogWarning(ex, "Turnstile siteverify unreachable; allowing submission");
            return true;
        }
    }

    private static string? Truncate(string? value, int maxLength)
    {
        var trimmed = value?.Trim();
        if (string.IsNullOrEmpty(trimmed))
        {
            return null;
        }
        return trimmed.Length <= maxLength ? trimmed : trimmed[..maxLength];
    }

    private static BadRequestObjectResult Friendly400(string message) =>
        new(new { ok = false, message });

    /// <summary>
    /// ETag-guarded daily counter (PartitionKey META, RowKey daily-yyyyMMdd).
    /// Returns false once the cap is reached. Fails open on persistent conflicts —
    /// losing a count is better than losing a kid's story idea.
    /// </summary>
    private async Task<bool> TryCountTowardDailyCapAsync()
    {
        var rowKey = $"daily-{DateTime.UtcNow:yyyyMMdd}";

        for (var attempt = 0; attempt < 3; attempt++)
        {
            try
            {
                TableEntity counter;
                try
                {
                    counter = (await tableClient.GetEntityAsync<TableEntity>("META", rowKey)).Value;
                }
                catch (RequestFailedException ex) when (ex.Status == StatusCodes.Status404NotFound)
                {
                    await tableClient.AddEntityAsync(new TableEntity("META", rowKey) { ["Count"] = 1 });
                    return true;
                }

                var count = counter.GetInt32("Count") ?? 0;
                if (count >= DailyCap)
                {
                    return false;
                }

                counter["Count"] = count + 1;
                await tableClient.UpdateEntityAsync(counter, counter.ETag, TableUpdateMode.Merge);
                return true;
            }
            catch (RequestFailedException ex) when (
                ex.Status is StatusCodes.Status409Conflict or StatusCodes.Status412PreconditionFailed)
            {
                // Another request raced us — retry with fresh state.
            }
        }

        logger.LogWarning("Daily-cap counter contention; allowing suggestion without counting");
        return true;
    }
}
