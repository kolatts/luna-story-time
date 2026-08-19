using Azure;
using Azure.Data.Tables;

namespace Luna.StoryTime.Functions.Models;

public class SuggestionEntity : ITableEntity
{
    public const string SuggestionPartition = "SUGGESTION";
    public const string StatusNew = "New";

    public string PartitionKey { get; set; } = SuggestionPartition;
    public string RowKey { get; set; } = NewRowKey();
    public DateTimeOffset? Timestamp { get; set; }
    public ETag ETag { get; set; }

    public string IdeaText { get; set; } = "";
    public string? SubmitterName { get; set; }
    public string? SubmitterLocation { get; set; }
    public DateTimeOffset SubmittedUtc { get; set; } = DateTimeOffset.UtcNow;
    public string Status { get; set; } = StatusNew;

    // Inverted ticks so newest suggestions sort first lexically
    private static string NewRowKey() =>
        $"{DateTime.MaxValue.Ticks - DateTimeOffset.UtcNow.UtcTicks:D19}-{Guid.NewGuid():N}";
}
