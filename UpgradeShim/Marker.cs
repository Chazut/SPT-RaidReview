using System.Reflection;

// These assemblies replace old filenames when a release ZIP is extracted over an
// existing install. Their unique identities cannot take another mod's SQLite slot.
[assembly: AssemblyMetadata("RaidReview.UpgradePlaceholder", "sqlite-private-runtime-v1")]
