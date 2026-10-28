namespace RaidReview
{
    public class RaidReviewLogger
    {
        public List<Exception> Errors = new();
        public void Log(string text) { }
        public void Debug(string text) { }
        public void Error(string text, Exception ex) => Errors.Add(ex);
    }
}
namespace RaidReview.Database
{
    public class DatabaseService
    {
        public List<string> Sql = new();
        public (string, object)[] LastArgs;
        public Task ExecuteAsync(string sql, params (string, object)[] args) { Sql.Add(sql); LastArgs=args; return Task.CompletedTask; }
        public void QueueWrite(string sql, params (string, object)[] args) { Sql.Add(sql); }
        public Task ExecuteBatchAsync(string sql, IEnumerable<(string,object)[]> args) { Sql.Add(sql); return Task.CompletedTask; }
        public Task<List<Dictionary<string,object>>> QueryAsync(string sql, params (string,object)[] args) => Task.FromResult(new List<Dictionary<string,object>>());
    }
}
namespace RaidReview.FileSystem
{
    public class DataFileService
    {
        public List<(string File,string Header,string Rows)> Writes = new();
        public bool Flushed;
        public Dictionary<string, string> Contents = new();
        public string? ReadFile(string a,string b,string c,string file) => Contents.GetValueOrDefault(file);
        public void WriteFile(string a,string b,string c,string file,string contents) => Contents[file] = contents;
        public void AppendLineBuffered(string a,string b,string c,string file,string header,string rows) => Writes.Add((file,header,rows));
        public void FlushAndCloseAll() => Flushed=true;
    }
}
namespace RaidReview.Session
{
    public class SessionManagerPlayer { public string ProfileId, RaidId; }
    public class SessionManagerRaid { public string RaidId; public Dictionary<string,string> Players; }
    public class SessionManager
    {
        public Dictionary<string,SessionManagerPlayer> Profiles = new();
        public SessionManagerPlayer GetProfile(string id) => Profiles.GetValueOrDefault(id);
        public void AddProfile(string id, SessionManagerPlayer p) => Profiles[id]=p;
        public void AddRaid(string id, SessionManagerRaid r) { }
        public void PingProfile(string id) { }
        public void PingRaid(string id) { }
        public void RemoveRaid(string id, string reason) { foreach(var p in Profiles.Values.Where(p=>p.RaidId==id)) p.RaidId=null; }
    }
}
namespace RaidReview.PostRaid
{
    public class ItemResolver { public string ResolveShortName(string id)=>id; public int ResolvePrice(string id)=>1;
        public string ResolveName(string name,string id)=>string.IsNullOrWhiteSpace(name)?id:name;
        public string ResolveContainerName(string name,string id)=>string.IsNullOrWhiteSpace(name)?id:name; }
}
