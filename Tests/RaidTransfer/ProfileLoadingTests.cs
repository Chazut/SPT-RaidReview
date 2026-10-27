using System.Reflection;
using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using RaidReview;
using RaidReview.Config;
using RaidReview.Database;
using RaidReview.FileSystem;
using RaidReview.Http;
using RaidReview.PostRaid;
using RaidReview.Session;
using RaidReview.WebSocket;

internal static class ProfileLoadingTests
{
    internal static async Task Run(string root, DatabaseService db, DataFileService files,
        RaidReviewLogger logger, RaidPositionCompiler compiler, string raidId, Action<bool,string> check)
    {
        var runtime=Path.Combine(root,"profile-test-runtime");
        var directory=Path.Combine(runtime,"user","profiles");
        var mod=Path.Combine(runtime,"user","mods","RaidReview");
        Directory.CreateDirectory(mod);
        check((await ProfileNames.ReadAsync(directory)).Count==0,"missing profile directory does not hide raids");
        Directory.CreateDirectory(directory);
        var profile=Path.Combine(directory,"valid.json");
        await File.WriteAllTextAsync(profile,"""{"info":{"id":"player-1","username":"Test user"}}""");
        var hash=SHA256.HashData(await File.ReadAllBytesAsync(profile));
        var config=new RaidReviewConfig();
        var handler=new WsPacketHandler(db,new SessionManager(logger,config),files,logger,new ItemResolver(mod,logger));
        var server=new RaidReviewWebServer(config,db,files,logger,handler,compiler,mod);
        var builder=WebApplication.CreateBuilder();
        builder.WebHost.UseUrls("http://127.0.0.1:0");builder.Logging.ClearProviders();
        await using var app=builder.Build();
        typeof(RaidReviewWebServer).GetMethod("RegisterApiRoutes",BindingFlags.Instance|BindingFlags.NonPublic)!
            .Invoke(server,new object[]{app});
        await app.StartAsync();
        var url=app.Services.GetRequiredService<IServer>().Features.Get<IServerAddressesFeature>()!.Addresses.Single();
        using var client=new HttpClient{BaseAddress=new Uri(url)};
        var extra=Path.Combine(directory,"extra.json");
        foreach(var json in new[]{"[]","[{}]","null","42","true","\"text\"","{}","{",
            "{\"info\":[]}","{\"info\":null}","{\"info\":1}",
            "{\"info\":{\"id\":[],\"username\":\"wrong\"}}",
            "{\"info\":{\"id\":\"player-1\",\"username\":[]}}",
            "{\"info\":{\"id\":null,\"username\":\"wrong\"}}",
            "{\"info\":{\"id\":\"player-1\",\"username\":null}}",
            "{\"info\":{\"id\":\"\",\"username\":\"wrong\"}}",
            "{\"info\":{\"id\":\"player-1\",\"username\":\" \"}}"})
        {
            await File.WriteAllTextAsync(extra,json);
            var names=await ProfileNames.ReadAsync(directory);
            check(names.Count==1&&names["player-1"]=="Test user","invalid shape ignored: "+json);
            foreach(var endpoint in new[]{"/api/profile/all","/api/raids","/api/profile/player-1/raids/all","/api/raids/"+raidId})
            {
                using var response=await client.GetAsync(endpoint);
                check(response.IsSuccessStatusCode,"HTTP profile/raid route succeeds: "+endpoint+" / "+json);
                using var document=JsonDocument.Parse(await response.Content.ReadAsStringAsync());
                var value=document.RootElement;
                if(endpoint=="/api/profile/all")
                    check(value.GetProperty("player-1").GetProperty("info").GetProperty("username").GetString()=="Test user",
                        "profile selector keeps valid names");
                else
                {
                    if(value.ValueKind==JsonValueKind.Array) value=value.EnumerateArray().Single();
                    check(value.GetProperty("raidId").GetString()==raidId&&value.GetProperty("profileName").GetString()=="Test user",
                        "recorded raid remains visible with correct owner");
                }
            }
        }
        await File.WriteAllTextAsync(extra,"{\"info\":{\"id\":\"headless\",\"username\":\"Headless_6acf7c122b70675b98bf862a\"}}");
        check((await ProfileNames.ReadAsync(directory)).Count==2,"valid headless profiles remain supported");
        using(var locked=File.Open(extra,FileMode.Open,FileAccess.ReadWrite,FileShare.None))
            check((await ProfileNames.ReadAsync(directory))["player-1"]=="Test user","locked unrelated file cannot hide good profiles");
        var after=SHA256.HashData(await File.ReadAllBytesAsync(profile));
        check(hash.SequenceEqual(after),"profile loading never rewrites user files");
        using(var response=await client.GetAsync("/api/raids/"+raidId+"/export"))
            check(response.IsSuccessStatusCode&&response.Content.Headers.ContentType?.MediaType=="application/zip",
                "profile fallback also allows raid export");
        await app.StopAsync();
    }
}
