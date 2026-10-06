using System.Data.Common;
using System.Linq.Expressions;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Runtime.Loader;

namespace RaidReview.Database;

// SPT loads every top-level mod DLL into one context. Keep our provider and its
// native bindings private so other mods can use a different SQLite version.
internal sealed class SqliteRuntime : AssemblyLoadContext
{
    private static readonly Lazy<SqliteRuntime> Instance = new(() => new SqliteRuntime());
    private static readonly HashSet<string> PrivateAssemblies = new(StringComparer.OrdinalIgnoreCase)
    {
        "Microsoft.Data.Sqlite", "SQLitePCLRaw.core",
        "SQLitePCLRaw.provider.e_sqlite3", "SQLitePCLRaw.batteries_v2"
    };

    private readonly string _managedDirectory;
    private readonly Func<string, DbConnection> _create;
    private readonly Assembly _sqlite;
    private readonly Assembly _provider;
    private readonly string _nativePath = string.Empty;
    private readonly IntPtr _nativeHandle;

    private SqliteRuntime() : base("RaidReview.SQLite", isCollectible: false)
    {
        var modDirectory = Path.GetDirectoryName(typeof(SqliteRuntime).Assembly.Location)!;
        _managedDirectory = Path.Combine(modDirectory, "lib", "sqlite");
        // Fail before opening any database if an installation omitted private dependencies.
        foreach (var name in PrivateAssemblies)
        {
            var path = Path.Combine(_managedDirectory, name + ".dll");
            if (!File.Exists(path)) throw new FileNotFoundException("Raid Review private SQLite dependency is missing.", path);
        }

        var platform = OperatingSystem.IsWindows() ? "win" : OperatingSystem.IsMacOS() ? "osx" : "linux";
        var architecture = RuntimeInformation.ProcessArchitecture.ToString().ToLowerInvariant();
        var library = OperatingSystem.IsWindows() ? "e_sqlite3.dll"
            : OperatingSystem.IsMacOS() ? "libe_sqlite3.dylib" : "libe_sqlite3.so";
        var runtimes = Path.Combine(modDirectory, "runtimes");
        var candidates = new[] { RuntimeInformation.RuntimeIdentifier, platform + "-" + architecture }
            .Distinct().Select(rid => Path.Combine(runtimes, rid, "native", library)).ToArray();
        var failures = new List<string>();
        foreach (var path in candidates)
        {
            if (!File.Exists(path)) { failures.Add(path + " (missing)"); continue; }
            try { _nativeHandle = NativeLibrary.Load(path); _nativePath = path; break; }
            catch (Exception ex) when (ex is DllNotFoundException or BadImageFormatException)
            { failures.Add(path + ": " + ex.Message); }
        }
        if (_nativeHandle == IntPtr.Zero)
            throw new DllNotFoundException("Raid Review private SQLite native runtime could not be loaded: " + string.Join("; ", failures));

        _provider = LoadFromAssemblyName(new AssemblyName("SQLitePCLRaw.provider.e_sqlite3"));
        NativeLibrary.SetDllImportResolver(_provider, (name, _, _) => name == "e_sqlite3" ? _nativeHandle : IntPtr.Zero);
        var batteries = LoadFromAssemblyName(new AssemblyName("SQLitePCLRaw.batteries_v2"));
        batteries.GetType("SQLitePCL.Batteries_V2", throwOnError: true)!.GetMethod("Init")!.Invoke(null, null);
        _sqlite = LoadFromAssemblyName(new AssemblyName("Microsoft.Data.Sqlite"));

        // Cross the context boundary using framework types only. Compile the constructor
        // once, keeping reflection out of the pooled connection / per-packet hot path.
        var connection = _sqlite.GetType("Microsoft.Data.Sqlite.SqliteConnection", throwOnError: true)!;
        var argument = Expression.Parameter(typeof(string), "connectionString");
        _create = Expression.Lambda<Func<string, DbConnection>>(
            Expression.Convert(Expression.New(connection.GetConstructor([typeof(string)])!, argument), typeof(DbConnection)), argument).Compile();
    }

    protected override Assembly? Load(AssemblyName assemblyName)
    {
        if (assemblyName.Name == null || !PrivateAssemblies.Contains(assemblyName.Name)) return null;
        // Never fall back to a different mod's SQLite, including an incomplete installation.
        return LoadFromAssemblyPath(Path.Combine(_managedDirectory, assemblyName.Name + ".dll"));
    }

    internal static void Initialize(Action<string>? log)
    {
        var runtime = Instance.Value;
        log?.Invoke($"[RAID-REVIEW] SQLite isolated runtime: sqlite={runtime._sqlite.GetName().Version}, provider={runtime._provider.GetName().Version}, native={runtime._nativePath}");
    }

    internal static DbConnection CreateConnection(string connectionString) => Instance.Value._create(connectionString);
}
