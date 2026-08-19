namespace Luna.StoryTime.Functions.Models;

/// <summary>Incoming suggestion payload. Website is a honeypot — humans never fill it.</summary>
public record SuggestionRequest(string? Idea, string? Name, string? Location, string? Website);
