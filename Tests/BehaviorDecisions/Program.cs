using RAID_REVIEW;

var checks = 0;
void Check(string expected, string raw, string layer, string status, string category, string scenario)
{
    var actual = OrbitBehaviorDecision.Resolve(raw, layer, status, category);
    if (actual != expected) throw new Exception($"{scenario}: expected {expected}, got {actual}");
    checks++;
}

// Raid 387: extraction countdowns must retain their objective while ORBIT owns the bot.
Check("Orbit:Exfil", "9000", "OrbitBrainLayer", "Extracting", "Exfil", "SS-Speer car countdown");
Check("Orbit:Exfil", "9000", "OrbitBrainLayer", "Extracting", null, "Extraction status with missing category");
Check("SAIN:Shoot", "SAIN:Shoot", "SAIN : Combat Layer", "Extracting", "Exfil", "Old extraction telemetry cannot override combat");
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

Check("Orbit:ActionUnavailable", "9000", "OrbitBrainLayer", null, null, "Unavailable telemetry");
Check("Orbit:ChoosingObjective", "9000", "OrbitBrainLayer", "None", "", "No objective yet");
Check("Orbit:ChoosingObjective", "9000", "OrbitBrainLayer", "Failed", "ContainerLoot", "Failed objective is not looting");
Check("Orbit:ActionUnavailable", "9000", "OrbitBrainLayer", "Moving", "", "Incomplete category");
Check("Orbit:ChoosingObjective", "peaceful", "OrbitBrainLayer", "None", "", "Raid385 GamesB4Gains 298-332s");
Check("Orbit:ChoosingObjective", "SAIN:Search", "OrbitBrainLayer", "None", "", "Stale SAIN search cannot claim ORBIT transition");
Check("Orbit:ChoosingObjective", "9000", "OrbitBrainLayer", "Failed", "AmbushExtract", "Failed ambush cannot claim approach");
Check("BL:PatrolFollower", "BL:PatrolFollower", "PatrolFollower", "None", "", "Raid385 tyvas real native layer is preserved");
foreach (var (raw, layer, sain, expected) in new[] {
    ("heal", "PatrolFollower", "SAIN:Search", "heal"),
    ("peaceful", "PatrolFollower", "SAIN:FirstAid", "peaceful"),
    ("goToLootPointNode", "LootPatrol", "SAIN:Search", "goToLootPointNode"),
    ("9000", "OrbitBrainLayer", "SAIN:Search", "BL:OrbitBrainLayer"),
    ("9000", "SAIN : Combat Layer", "SAIN:StandAndShoot", "SAIN:StandAndShoot"),
    ("9000", "SAIN : Peace Layer", "peaceful", "SAIN:peaceful"),
    ("9000", "SAIN : Combat Layer", (string)null, "SAIN:ActionUnavailable"),
    ("9000", "PatrolFollower", (string)null, "BL:PatrolFollower"),
    ("9000", (string)null, "SAIN:Search", "9000"),
    ("9000", "COMET : Post-combat", "SAIN:FirstAid", "BL:COMET : Post-combat"),
}) {
    if (BehaviorOwnership.Resolve(raw, layer, sain) != expected) throw new Exception("Recorded owner: " + layer);
    checks++;
}
Check("Orbit:SearchingAmbushExtract", "9000", "OrbitBrainLayer", "Moving", "SearchingAmbushExtract", "Search extract ambush");
Check("Orbit:ApproachingAmbushExtract", "9000", "OrbitBrainLayer", "Moving", "ApproachingAmbushExtract", "Approach extract ambush");
Check("Orbit:CampingAmbushSniper", "9000", "OrbitBrainLayer", "Finished", "AmbushSniper", "Sniper hold");
Check("Orbit:ApproachingAmbushKill", "9000", "OrbitBrainLayer", "Moving", "AmbushKill", "Kill approach");
Check("Orbit:SquadCover", "9000", "OrbitBrainLayer", "Finished", "SquadCover", "Cover waiting");
Check("Orbit:Guarding", "9000", "OrbitBrainLayer", "Finished", "Quest", "Guarding");
Check("Orbit:MultiStep: D-2 (1/2) Switch", "9000", "OrbitBrainLayer", "Moving", "MultiStep: D-2 (1/2) Switch", "Multi-step retained");
foreach (var (choice, native) in new[] { ("DefendUnknown", "Freeze"), ("KeepAngle", "StandAndShoot"), ("ContinuePush", "RushEnemy"), ("Shoot", "StandAndShoot"), ("Cover", "SeekCover"), ("Push", "RushEnemy"), ("Grenade", "ThrowGrenade"), ("Hold", "Freeze"), ("Flank", "ShiftCover"), ("Search", "Search"), ("FallBack", "Retreat") })
{
    foreach (var prefix in new[] { "", "SAIN:" })
    {
        if (CometBehaviorDecision.Resolve("COMET:" + choice, prefix + native) != "COMET:" + choice) throw new Exception("COMET accepted action label");
        checks++;
    }
    foreach (var actual in new[] { "FirstAid", "SAIN:Surgery", "Orbit:ContainerLoot", "DogFight", "goToLootPointNode", "", null })
    {
        if (CometBehaviorDecision.Resolve("COMET:" + choice, actual) != actual) throw new Exception("COMET cannot overwrite an interrupted action");
        checks++;
    }
}
foreach(var native in new[] { "SAIN:DogFight", "Search", "FirstAid", "COMET:Shoot" })
{
    if (CometBehaviorDecision.Resolve("COMET:SelectTarget", native) != native) throw new Exception("A07 target selection must not claim action ownership");
    checks++;
}
foreach(var service in new[]{"FirstAid","Surgery","Stims","Reload"})
foreach(var actual in new[]{"SAIN:FirstAid","SAIN:Surgery","SAIN:Stims","SAIN:Reload","SAIN:StandAndShoot","Orbit:Guarding",""})
{
    var expected=actual=="SAIN:"+service?"COMET:"+service:actual;
    if(CometBehaviorDecision.Resolve("COMET:"+service,actual)!=expected)throw new Exception("COMET self action must match native commit");
    checks++;
}
if (CometBehaviorDecision.Resolve("COMET:FutureFeature", "Search") != "Search") throw new Exception("unknown plan must not claim ownership");
checks++;
if(CometBehaviorDecision.Resolve("COMET:DoorAmbush","SAIN:Freeze")!="SAIN:Freeze")throw new Exception("D09 diagnostic cannot masquerade as accepted behavior");
checks++;
if(CometBehaviorDecision.Resolve("COMET:DoorHold","SAIN:Freeze")!="SAIN:Freeze")throw new Exception("D10 diagnostic cannot masquerade as accepted behavior");
checks++;
if(CometBehaviorDecision.Resolve("COMET:DoorInterruption","SAIN:Search")!="SAIN:Search")throw new Exception("D12 context cannot claim native action ownership");
if(CometBehaviorDecision.Resolve("COMET:DoorEmergency","SAIN:Retreat")!="SAIN:Retreat")throw new Exception("D13 context cannot claim native action ownership");
if(CometBehaviorDecision.Resolve("COMET:FallBack","SAIN:Retreat")!="COMET:FallBack")throw new Exception("D13 accepted retreat must match native behavior");
if(CometBehaviorDecision.Resolve("COMET:FallBack","SAIN:SeekCover")!="COMET:FallBack")throw new Exception("A01 owned retreat continuation must remain COMET");
if(CometBehaviorDecision.Resolve("COMET:FallBack","SeekCover")!="COMET:FallBack")throw new Exception("A01 unprefixed native continuation");
if(CometBehaviorDecision.Resolve("","SAIN:SeekCover")!="SAIN:SeekCover")throw new Exception("Native cover after release must not acquire COMET ownership");
if(CometBehaviorDecision.Resolve("COMET:FallBack","SAIN:AvoidGrenade")!="SAIN:AvoidGrenade")throw new Exception("Urgent escape must never be presented as COMET fallback");
checks+=4;
if(CometBehaviorDecision.Resolve("COMET:DoorSupport","SAIN:Freeze")!="SAIN:Freeze")throw new Exception("D11 proposal cannot masquerade as native action");
checks++;
Console.WriteLine($"PASS: {checks} behavior ownership checks");

if(CometBehaviorDecision.Resolve("COMET:DoorReservation","SAIN:Search")!="SAIN:Search")throw new Exception("D14 reservation cannot impersonate behavior");

if(CometBehaviorDecision.Resolve("COMET:DoorEntry","SAIN:Search")!="SAIN:Search")throw new Exception("D15 diagnostic cannot impersonate native behavior");

foreach(var native in new[]{"SAIN:StandAndShoot","SAIN:DogFight","SAIN:Retreat"})
 if(CometBehaviorDecision.Resolve("COMET:CombatStep",native)!=native)throw new Exception("M01 context cannot overwrite native behavior");

foreach(var native in new[]{"SAIN:StandAndShoot","SAIN:DogFight","SAIN:Retreat","SAIN:Search"})
 if(CometBehaviorDecision.Resolve("COMET:FirePause",native)!=native)throw new Exception("M02 context cannot overwrite native behavior");

foreach(var native in new[]{"SAIN:StandAndShoot","SAIN:DogFight","SAIN:Search","SAIN:Retreat"})
 if(CometBehaviorDecision.Resolve("COMET:CornerPeek",native)!=native)throw new Exception("M03 context cannot overwrite native behavior");

foreach(var native in new[]{"SAIN:StandAndShoot","SAIN:DogFight","SAIN:Search","SAIN:Retreat","SAIN:Reload"})
 if(CometBehaviorDecision.Resolve("COMET:CombatLean",native)!=native)throw new Exception("M04 lean context cannot overwrite native behavior");

foreach(var native in new[]{"SAIN:RushEnemy","SAIN:StandAndShoot","SAIN:Retreat","SAIN:Search","SAIN:Reload"})
 if(CometBehaviorDecision.Resolve("COMET:CornerChase",native)!=native)throw new Exception("M05 chase context cannot overwrite native behavior");

foreach(var native in new[]{"SAIN:RushEnemy","SAIN:StandAndShoot","SAIN:Retreat","SAIN:Search","SAIN:Reload"})
 if(CometBehaviorDecision.Resolve("COMET:CornerPrefire",native)!=native)throw new Exception("M06 diagnostic must not overwrite native behavior");

foreach(var native in new[]{"SAIN:Search","SAIN:RushEnemy","SAIN:HoldInCover","SAIN:Retreat"})
 if(CometBehaviorDecision.Resolve("COMET:AngleWatch",native)!=native)throw new Exception("M07 diagnostic must not overwrite native behavior");

foreach(var native in new[]{"SAIN:Freeze","SAIN:Search","SAIN:Retreat","ORBIT:Loot"})
 if(CometBehaviorDecision.Resolve("COMET:HoldAngle",native)!=native)throw new Exception("M08 diagnostic must not overwrite native behavior");

foreach(var native in new[]{"SAIN:SeekCover","SAIN:Retreat","SAIN:Reload","ORBIT:Loot"})
 if(CometBehaviorDecision.Resolve("COMET:CoverTravel",native)!=native)throw new Exception("M09 diagnostic must retain native behavior");

foreach(var native in new[]{"SAIN:SeekCover","SAIN:Retreat","SAIN:RunAway","SAIN:RushEnemy"})
 if(CometBehaviorDecision.Resolve("COMET:AdsTravel",native)!=native)throw new Exception("M10 diagnostic must retain native behavior");

foreach(var native in new[]{"SAIN:SeekCover","SAIN:Retreat","SAIN:AvoidGrenade"})
 if(CometBehaviorDecision.Resolve("COMET:RetreatWeave",native)!=native)throw new Exception("M11 preserves native action");

foreach(var native in new[]{"SAIN:Search","SAIN:Retreat","SAIN:RushEnemy","SAIN:StandAndShoot","ORBIT:Loot"})
 if(CometBehaviorDecision.Resolve("COMET:TacticalJump",native)!=native)throw new Exception("M12 diagnostics preserve behavior colors");

foreach(var stage in new[]{"Cover","Medical","Reload","Hands","Watch","Regroup","Check"}) {
 var label="COMET:PostCombat"+stage;
 if(CometBehaviorDecision.ResolvePostCombat(label,"COMET : Post-combat","9000",false)!=label)throw new Exception("H04 sampled action");
 foreach(var layer in new[]{"SAIN : Combat Layer","OrbitBrainLayer",""})
 if(CometBehaviorDecision.ResolvePostCombat(label,layer,"native",false)!="native")throw new Exception("H04 cannot own other layers");
 if(CometBehaviorDecision.ResolvePostCombat(label,"COMET : Post-combat","native",true)!="native")throw new Exception("H04 cannot own ghosts");
}
if(CometBehaviorDecision.ResolvePostCombat("COMET:PostCombatUnknown","COMET : Post-combat","native",false)!="native")throw new Exception("H04 unknown state");
Console.WriteLine("36 H04 behavior ownership checks passed");

int s01Checks=0;
foreach(var label in new[]{"COMET:CrossfireMoving","COMET:CrossfireHolding","COMET:CrossfirePlanning","COMET:Unknown",""})
foreach(var layer in new[]{"COMET : Crossfire","COMET : Post-combat","SAIN : Combat Layer","OrbitBrainLayer",""})
foreach(var ghost in new[]{true,false}) {
 var expected=!ghost&&layer=="COMET : Crossfire"&&(label=="COMET:CrossfireMoving"||label=="COMET:CrossfireHolding")?label:"native";
 if(CometBehaviorDecision.ResolveCrossfire(label,layer,"native",ghost)!=expected)throw new Exception("S01 sampled ownership "+label+layer+ghost);
 s01Checks++;
}
Console.WriteLine($"{s01Checks} S01 behavior ownership checks passed");

int s02Checks=0;
foreach(var label in new[]{"COMET:CrossfireEntranceMoving","COMET:CrossfireEntranceWatching","COMET:CrossfireEntranceEntering","COMET:CrossfireEntranceUnknown"})
foreach(var layer in new[]{"COMET : Crossfire","COMET : Post-combat","SAIN : Combat Layer","OrbitBrainLayer",""})
foreach(var ghost in new[]{true,false}) {
 var expected=!ghost&&layer=="COMET : Crossfire"&&!label.EndsWith("Unknown")?label:"native";
 if(CometBehaviorDecision.ResolveCrossfire(label,layer,"native",ghost)!=expected)throw new Exception("S02 sampled ownership "+label+layer+ghost);
 s02Checks++;
}
Console.WriteLine($"{s02Checks} S02 behavior ownership checks passed");

int s03Checks=0;
foreach(var label in new[]{"COMET:CrossfireManeuverMoving","COMET:CrossfireManeuverHolding","COMET:CrossfireManeuverSupporting","COMET:CrossfireManeuverSuppressing","COMET:CrossfireManeuverRear","COMET:CrossfireManeuverUnknown"})
foreach(var layer in new[]{"COMET : Crossfire","COMET : Post-combat","SAIN : Combat Layer","OrbitBrainLayer",""})
foreach(var ghost in new[]{false,true}){
 var expected=!ghost&&layer=="COMET : Crossfire"&&!label.EndsWith("Unknown")?label:"native";
 if(CometBehaviorDecision.ResolveCrossfire(label,layer,"native",ghost)!=expected)throw new Exception("S03 sampled ownership "+label+layer+ghost);
 s03Checks++;
}
Console.WriteLine($"{s03Checks} S03 behavior ownership checks passed");

int s04Checks=0;
foreach(var label in new[]{"COMET:CrossfireCoverMateMoving","COMET:CrossfireCoverMateHolding","COMET:CrossfireCoverMateUnknown"})
foreach(var layer in new[]{"COMET : Crossfire","COMET : Post-combat","SAIN : Combat Layer","OrbitBrainLayer",""})
foreach(var ghost in new[]{false,true}){
 var expected=!ghost&&layer=="COMET : Crossfire"&&!label.EndsWith("Unknown")?label:"native";
 if(CometBehaviorDecision.ResolveCrossfire(label,layer,"native",ghost)!=expected)throw new Exception("S04 sampled ownership "+label+layer+ghost);
 s04Checks++;
}
Console.WriteLine($"{s04Checks} S04 behavior ownership checks passed");

int s05Checks=0;
foreach(var label in new[]{"COMET:CrossfireTradePushing","COMET:CrossfireTradeMoving","COMET:CrossfireTradeWatching","COMET:CrossfireTradeUnknown"})
foreach(var layer in new[]{"COMET : Crossfire","SAIN : Combat","ORBIT", "", "COMET"})foreach(bool ghost in new[]{false,true})
{
 var expected=!ghost&&layer=="COMET : Crossfire"&&!label.EndsWith("Unknown")?label:"native";
 if(CometBehaviorDecision.ResolveCrossfire(label,layer,"native",ghost)!=expected)throw new Exception("S05 sampled ownership "+label+layer+ghost);
 s05Checks++;
}
Console.WriteLine($"{s05Checks} S05 behavior ownership checks passed");

int s06Checks=0;
foreach(var label in new[]{"COMET:CrossfireStormMoving","COMET:CrossfireStormReady","COMET:CrossfireStormUnknown"})
foreach(var layer in new[]{"COMET : Crossfire","SAIN : Combat Layer","OrbitBrainLayer",""})
foreach(var ghost in new[]{true,false}) {
 var expected=!ghost&&layer=="COMET : Crossfire"&&label=="COMET:CrossfireStormMoving"?label:"native";
 if(CometBehaviorDecision.ResolveCrossfire(label,layer,"native",ghost)!=expected)throw new Exception("S06 sampled ownership "+label+layer+ghost);
 s06Checks++;
}
Console.WriteLine($"{s06Checks} S06 behavior ownership checks passed");

var cleanupCapture=new CometCleanupCapture();
cleanupCapture.Remember("old","profile",12);cleanupCapture.Remember("new","profile",20);
if(cleanupCapture.Take("missing",out _) || !cleanupCapture.Take("old",out var oldCleanup) || oldCleanup.Time!=12 || cleanupCapture.Take("old",out _))throw new Exception("C13 late capture must match exact COMET session once");
if(!cleanupCapture.Take("new",out var newCleanup)||newCleanup.Time!=20)throw new Exception("C13 next raid isolation");
for(int i=0;i<10;i++)cleanupCapture.Remember(i.ToString(),"profile",i);
if(cleanupCapture.Take("0",out _) || !cleanupCapture.Take("9",out _))throw new Exception("C13 bounded ended raid metadata");
cleanupCapture.Clear();if(cleanupCapture.Take("8",out _))throw new Exception("C13 detach clears metadata");
Console.WriteLine("C13 cleanup capture: exact session, once-only, bounded history and teardown passed.");

if(CometBehaviorDecision.ResolveMagazineRecovery("COMET : Recover magazine","9000",false)!="COMET:RecoverMagazine")throw new Exception("recovery layer missing");
foreach(var layer in new[]{"SAIN : Combat Layer","OrbitBrainLayer",null})if(CometBehaviorDecision.ResolveMagazineRecovery(layer,"native",false)!="native")throw new Exception("foreign layer attributed to recovery");
if(CometBehaviorDecision.ResolveMagazineRecovery("COMET : Recover magazine","native",true)!="native")throw new Exception("ghost recovery attributed");
