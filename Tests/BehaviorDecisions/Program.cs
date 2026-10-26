using RAID_REVIEW;

var checks = 0;
void Check(string expected, string raw, string layer, string status, string category, string scenario)
{
    var actual = OrbitBehaviorDecision.Resolve(raw, layer, status, category);
    if (actual != expected) throw new Exception($"{scenario}: expected {expected}, got {actual}");
    checks++;
}

// Raid 330: Gosdep's recorded action was 9000 while OrbitBrainLayer owned
// his movement and loot. His vanilla combat phases must retain their labels.
Check("Orbit:ContainerLoot", "9000", "OrbitBrainLayer", "Moving", "ContainerLoot", "Gosdep 00:05");
Check("Orbit:ContainerLoot", "9000", "OrbitBrainLayer", "Looting", "ContainerLoot", "Gosdep 00:17");
Check("Orbit:LooseLoot", "9000", "OrbitBrainLayer", "Moving", "LooseLoot", "Gosdep 00:19");
Check("runToCover", "runToCover", "AssaultHaveEnemy", "Moving", "ContainerLoot", "Combat handoff with stale objective");
Check("holdPosition", "holdPosition", "AssaultEnemyFar", null, null, "Gosdep vanilla cover");
Check("Orbit:ContainerLoot", "9000", "OrbitBrainLayer", "Looting", "ContainerLoot", "Gosdep after combat and in Ghost");
Check("goToEnemy", "goToEnemy", "Help", "Moving", "LooseLoot", "Gosdep final combat");
Check("goToLootPointNode", "goToLootPointNode", "LootPatrol", null, null, "Reanimator vanilla loot");

foreach (var raw in new[] { "9000", "9001", "9004", "9157", "peaceful", "SAIN:Peace", "SAIN:Search" })
{
    Check("Orbit:LooseLoot", raw, "OrbitBrainLayer", "Moving", "LooseLoot", "Registration order or stale SAIN state");
    foreach (var layer in new[] { "SAIN : Combat Layer", "LootPatrol", "PatrolAssaultLayer", "OtherMod", null, "" })
        Check(raw, raw, layer, "Moving", "LooseLoot", "Objective alone does not prove ownership");
}

Check("9000", "9000", "OrbitBrainLayer", null, null, "Unavailable telemetry");
Check("9000", "9000", "OrbitBrainLayer", "None", "", "No objective yet");
Check("9000", "9000", "OrbitBrainLayer", "Failed", "ContainerLoot", "Failed objective is not looting");
Check("9000", "9000", "OrbitBrainLayer", "Moving", "", "Incomplete category");
Check("Orbit:SearchingAmbushExtract", "9000", "OrbitBrainLayer", "Moving", "SearchingAmbushExtract", "Search extract ambush");
Check("Orbit:ApproachingAmbushExtract", "9000", "OrbitBrainLayer", "Moving", "ApproachingAmbushExtract", "Approach extract ambush");
Check("Orbit:CampingAmbushSniper", "9000", "OrbitBrainLayer", "Finished", "AmbushSniper", "Sniper hold");
Check("Orbit:ApproachingAmbushKill", "9000", "OrbitBrainLayer", "Moving", "AmbushKill", "Kill approach");
Check("Orbit:SquadCover", "9000", "OrbitBrainLayer", "Finished", "SquadCover", "Cover waiting");
Check("Orbit:Guarding", "9000", "OrbitBrainLayer", "Finished", "Quest", "Guarding");
Check("Orbit:MultiStep: D-2 (1/2) Switch", "9000", "OrbitBrainLayer", "Moving", "MultiStep: D-2 (1/2) Switch", "Multi-step retained");
Console.WriteLine($"PASS: {checks} behavior ownership checks");
