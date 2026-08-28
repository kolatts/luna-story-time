using Azure.Data.Tables;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

var builder = FunctionsApplication.CreateBuilder(args);

builder.ConfigureFunctionsWebApplication();

builder.Services
    .AddApplicationInsightsTelemetryWorkerService()
    .ConfigureFunctionsApplicationInsights();

builder.Services.AddHttpClient();

builder.Services.AddSingleton(_ =>
{
    var client = new TableClient(StorageConnectionString(), "StorySuggestions");
    client.CreateIfNotExists();
    return client;
});

builder.Services.AddSingleton(_ =>
{
    var client = new TableClient(StorageConnectionString(), "PartyRooms");
    client.CreateIfNotExists();
    return new Luna.StoryTime.Functions.Models.PartyRoomsTable(client);
});

static string StorageConnectionString() =>
    Environment.GetEnvironmentVariable("AzureWebJobsStorage")
        ?? throw new InvalidOperationException("AzureWebJobsStorage is not configured.");

builder.Build().Run();
