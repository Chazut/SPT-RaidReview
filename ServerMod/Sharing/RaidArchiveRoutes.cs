using System.Text.Json;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Features;

namespace RaidReview.Sharing;

internal static class RaidArchiveRoutes
{
    internal static void MapRaidArchives(this WebApplication app, RaidArchiveService archives,
        Func<string, Task<Dictionary<string, object?>>> identity, RaidReviewLogger logger)
    {
        app.MapGet("/api/raids/{raidId}/export", async (HttpContext context, string raidId) =>
        {
            await Transfer(context, archives, logger, async work =>
            {
                var result = await archives.ExportAsync(raidId, await identity(raidId), work, context.RequestAborted);
                context.Response.ContentType = "application/zip";
                context.Response.Headers.ContentDisposition = $"attachment; filename=\"{result.FileName}\"";
                context.Response.Headers.CacheControl = "no-store";
                context.Response.Headers.AccessControlExposeHeaders = "X-RR-Warning";
                if (result.Warning != null) context.Response.Headers["X-RR-Warning"] = result.Warning;
                context.Response.ContentLength = new FileInfo(result.Path).Length;
                await context.Response.SendFileAsync(result.Path, context.RequestAborted);
            });
        });
        app.MapPost("/api/raids/import", async context =>
        {
            await Transfer(context, archives, logger, async work =>
            {
                var sizeFeature = context.Features.Get<IHttpMaxRequestBodySizeFeature>();
                if (sizeFeature is { IsReadOnly: false }) sizeFeature.MaxRequestBodySize = RaidArchiveService.MaxUploadBytes;
                if (context.Request.ContentLength > RaidArchiveService.MaxUploadBytes)
                    throw new InvalidDataException("Raid archives must be 512 MB or smaller.");
                string uploaded = Path.Combine(work, "upload.zip");
                await using (var stream = File.Create(uploaded))
                    await RaidArchiveService.CopyLimitedAsync(context.Request.Body, stream,
                        RaidArchiveService.MaxUploadBytes, context.RequestAborted);
                var result = await archives.ImportAsync(uploaded, work, context.RequestAborted);
                await context.Response.WriteAsJsonAsync(result, context.RequestAborted);
            });
        });
    }

    private static async Task Transfer(HttpContext context, RaidArchiveService archives,
        RaidReviewLogger logger, Func<string, Task> action)
    {
        string? work = null;
        try
        {
            using var lease = await archives.EnterAsync(context.RequestAborted);
            work = archives.CreateWorkFolder();
            await action(work);
        }
        catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested)
        {
            logger.Warn("[RAID_TRANSFER] Request cancelled; unfinished transfer discarded.");
        }
        catch (Exception ex)
        {
            logger.Error($"[RAID_TRANSFER] {context.Request.Method} {context.Request.Path} failed", ex);
            if (context.Response.HasStarted) { context.Abort(); return; }
            context.Response.Clear();
            context.Response.StatusCode = ex switch
            {
                InvalidDataException or JsonException => 400,
                KeyNotFoundException => 404,
                InvalidOperationException => 409,
                BadHttpRequestException bad => bad.StatusCode,
                _ => 500
            };
            string message = ex switch
            {
                JsonException => "The raid archive contains invalid JSON data.",
                InvalidDataException or KeyNotFoundException or InvalidOperationException => ex.Message,
                BadHttpRequestException => "The upload was interrupted or exceeded the 512 MB limit.",
                _ => "The raid transfer failed. Check the Raid Review server log for details."
            };
            await context.Response.WriteAsJsonAsync(new { error = message });
        }
        finally { if (work != null) archives.DeleteWorkFolder(work); }
    }
}
