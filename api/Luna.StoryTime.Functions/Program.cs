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

builder.Services.AddSingleton(_ =>
{
    var connectionString = Environment.GetEnvironmentVariable("AzureWebJobsStorage")
        ?? throw new InvalidOperationException("AzureWebJobsStorage is not configured.");
    return new TableClient(connectionString, "StorySuggestions");
});

builder.Build().Run();
