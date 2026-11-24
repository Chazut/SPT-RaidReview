using System.IO.Compression;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using RaidReview;
using RaidReview.Database;
using RaidReview.FileSystem;
using RaidReview.PostRaid;
using RaidReview.Sharing;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;

var root = Path.Combine(Path.GetTempPath(), "RR-transfer-" + Guid.NewGuid().ToString("N"));
Directory.CreateDirectory(root);
int checks = 0;
void Check(bool ok, string message) { if (!ok) throw new Exception(message); checks++; }
var logger = new RaidReviewLogger();
var sourceData = Path.Combine(root, "source");
var targetData = Path.Combine(root, "target");
if (args.Length == 4 && args[0] == "--verify-comet-replay")
{
    await CometReplayRoundTrip.Run(root, args[1], args[2], args[3]);
    return;
}
if (args.Length == 3 && args[0] == "--serve")
{
    string fixture = Path.GetFullPath(args[1]);
    string previewMod = Path.Combine(root, "preview-mod");
    string complete = Path.Combine(previewMod, "data");
    Directory.CreateDirectory(Path.Combine(complete, "positions"));
    File.Copy(Path.Combine(fixture, "raid_review_mod.db"), Path.Combine(complete, "raid_review_mod.db"));
    foreach (var path in Directory.GetFiles(Path.Combine(fixture, "positions")))
        File.Copy(path, Path.Combine(complete, "positions", Path.GetFileName(path)));
    using var webDb = new DatabaseService(); await webDb.InitializeAsync(complete);
    var webFiles = new DataFileService(); webFiles.Initialize(complete);
    var webCompiler = new RaidPositionCompiler(webFiles, logger);
    var config = new RaidReview.Config.RaidReviewConfig { WebClientPort = 17829, WebSocketPort = 17828, AutoDelete = false };
    var sessions = new RaidReview.Session.SessionManager(logger, config);
    var resolver = new ItemResolver(previewMod, logger);
    var webHandler = new RaidReview.WebSocket.WsPacketHandler(webDb, sessions, webFiles, logger, resolver);
    var web = new RaidReview.Http.RaidReviewWebServer(config, webDb, webFiles, logger, webHandler, webCompiler, previewMod);
    await web.StartAsync();
    Console.WriteLine($"PREVIEW http://127.0.0.1:17829 data={complete} stopFile={args[2]}");
    while (!File.Exists(args[2])) await Task.Delay(500);
    return;
}
using var source = new DatabaseService();
using var target = new DatabaseService();
await source.InitializeAsync(sourceData);
await target.InitializeAsync(targetData);
var sourceFiles = new DataFileService(); sourceFiles.Initialize(sourceData);
var targetFiles = new DataFileService(); targetFiles.Initialize(targetData);
var sourceCompiler = new RaidPositionCompiler(sourceFiles, logger);
var targetCompiler = new RaidPositionCompiler(targetFiles, logger);
var exporter = new RaidArchiveService(source, sourceFiles, sourceCompiler, logger, sourceData);
var importer = new RaidArchiveService(target, targetFiles, targetCompiler, logger, targetData);
string raidId = Guid.NewGuid().ToString();
string localRaidId = Guid.NewGuid().ToString();

async Task Seed(DatabaseService db, string id)
{
    foreach (var table in RaidArchiveService.Tables)
    {
        var schema = await db.QueryAsync($"PRAGMA table_info(\"{table}\")");
        var values = new Dictionary<string, object?>();
        foreach (var c in schema)
        {
            string name = c["name"]!.ToString()!, type = c["type"]!.ToString()!;
            if (name == "id" || name.StartsWith("imported")) continue;
            values[name] = type == "INTEGER" ? (object)1L : type == "REAL" ? 1.25 : "recorded";
            if (name == "raidId") values[name] = id;
            if (name == "profileId") values[name] = "player-1";
            if (name == "timeInRaid") values[name] = "120000";
            if (name == "exitStatus") values[name] = "Survived";
            if (name == "created_at") values[name] = "2026-10-20 00:00:00";
            if (name == "type") values[name] = table == "raid" ? "SCAV" : "HUMAN";
            if (name == "team") values[name] = "Savage";
            if (name == "location") values[name] = "interchange";
            if (name == "locationVariant") values[name] = "interchange_rework";
            if (name == "name") values[name] = "Recker";
        }
        var names = values.Keys.ToArray();
        await db.ExecuteAsync($"INSERT INTO \"{table}\" ({string.Join(",", names.Select(n => "\"" + n + "\""))}) VALUES ({string.Join(",", names.Select((_, i) => "$v" + i))})",
            values.Values.Select((v, i) => ("$v" + i, v)).ToArray());
    }
}
await Seed(source, raidId);
await Seed(target, localRaidId);
await source.ExecuteAsync("UPDATE comet_decision SET detail=$detail WHERE raidId=$id", ("$id", raidId),
    ("$detail", """{"doorRoomClear":{"state":"completed","reason":"clear-entry-arrival-confirmed","door":"door","target":"enemy","source":"heard","personality":"Chad","chance":30,"roll":0,"variantRoll":0,"variant":"grenade","contactAge":1,"knownX":0,"knownY":0,"knownZ":5,"x":0,"y":0,"z":2,"coveredDestination":true,"doorOpenObserved":true,"feintAttempted":false,"feint":"none","feintOutcome":"not-attempted","throwRequested":true,"throwAccepted":true,"grenadeItem":"grenade","projectile":5,"projectileObserved":true,"explosionConfirmed":true,"grenadeOutcome":"explosion-confirmed","dangerRadius":8,"blastPause":0.5,"fuseEstimate":3.5,"movementRequested":true,"movementAccepted":true,"movementObserved":true,"thresholdCrossed":true,"arrived":true,"weaponReady":true,"elapsed":6.099999999999994,"validFor":1.5,"alternatives":["Direct entry: eligible","Grenade entry: eligible","Resume native combat/search if the selected plan becomes invalid"]},"doorRoomClearConfig":{"enabled":true,"chances":{"GigaChad":40,"Chad":30,"Wreckless":35,"Normal":15,"Rat":0,"SnappingTurtle":0,"Coward":0,"Timmy":0},"contactLifetime":10,"grenadePreference":50,"allowFeint":true,"minimumAmmo":50,"minimumStamina":35,"depthMin":2,"depthMax":3,"blastPauseMin":0.3,"blastPauseMax":0.7,"targetCooldown":60},"doorFakeMedical":{"state":"holstering","reason":"fake-medical-stop-requested","interrupted":"","door":"test-door","target":"known","source":"heard","personality":"Chad","grenade":"","weapon":"rifle","reaction":"not-observed","chance":20,"roll":12,"knownX":0,"knownY":0,"knownZ":4,"contactAge":3,"elapsed":0.5,"coverVerified":true,"drawRequested":true,"callbackCompleted":true,"callbackSucceeded":true,"handsObserved":true,"holsterRequested":true,"holsterAccepted":false,"weaponReady":false,"guard":false,"recoveryFailed":false,"holsterAttempts":1,"validFor":1.5,"alternatives":["Normal SAIN search"],"kind":"heal","medicalPreference":50,"styleRoll":12,"grenadeEligible":true,"medicalEligible":"heal","medical":{"kind":"heal","item":"med-kit","bodyPart":"LeftArm","resourceBefore":100,"resourceAfter":100,"consumptionObserved":false,"consumptionEvidence":"not-observed","useCallbackCompleted":false,"useCallbackSucceeded":false,"nativeStopRequested":true,"medicalHandoff":false,"cooldownRestored":true}},"doorFakeMedicalConfig":{"enabled":true,"stimulators":true,"preference":50},"doorFakeGrenade":{"state":"holstering","reason":"fake-holster-accepted","interrupted":"","door":"test-door","target":"known","source":"heard","personality":"Chad","grenade":"nade","weapon":"rifle","reaction":"not-observed","chance":20,"roll":12,"knownX":0,"knownY":0,"knownZ":4,"contactAge":3,"elapsed":0.5,"coverVerified":true,"drawRequested":true,"callbackCompleted":true,"callbackSucceeded":true,"handsObserved":true,"holsterRequested":true,"holsterAccepted":true,"weaponReady":false,"guard":true,"recoveryFailed":false,"holsterAttempts":1,"validFor":1.5,"alternatives":["Normal SAIN search"]},"doorFakeGrenadeConfig":{"enabled":true,"chances":{"GigaChad":30,"Chad":20,"Normal":10,"Wreckless":5,"Rat":0,"SnappingTurtle":0,"Coward":0,"Timmy":0},"doorDistance":3,"contactDistance":10,"contactLifetime":15,"targetCooldown":60,"cooldown":20},"doorStepPeek":{"state":"observing","reason":"step-arrival-observed","parent":"D02","door":"test-door","target":"known","source":"heard","personality":"Chad","purpose":"check-known-side-of-opening","chance":50,"roll":12,"peek":1,"completed":0,"knownX":0,"knownY":0,"knownZ":4,"contactAge":3,"stackX":-1.2,"stackY":0,"stackZ":-0.9,"pointX":-0.4,"pointY":0,"pointZ":-0.9,"lookX":0.3,"lookY":1.3,"lookZ":0.6,"actualX":-0.4,"actualY":0,"actualZ":-0.9,"pose":1,"actualPose":1,"poseObserved":true,"movementAccepted":true,"movementObserved":true,"arrived":true,"returnAccepted":false,"returned":false,"looking":true,"visualAcquired":false,"observation":0.2,"requiredObservation":0.6,"rest":0,"requiredRest":0.7,"elapsed":0.6,"remaining":5.4,"validFor":1.5,"alternatives":["Second angle must differ","Normal SAIN search remains available"]},"doorStepPeekConfig":{"enabled":true,"chance":50,"maximumPeeks":2,"distance":0.8,"observationMin":0.4,"observationMax":0.8,"restMin":0.5,"restMax":1,"limit":6,"varyPosture":true},"doorRunBy":{"state":"across","reason":"run-by-movement-accepted","style":"run-by","door":"test-door","target":"known","source":"heard","personality":"Chad","chance":25,"roll":12,"styleRoll":20,"preference":40,"jumpEligible":true,"runEligible":true,"jumpReason":"","runReason":"","knownX":0,"knownY":0,"knownZ":4,"contactAge":3,"stamina":50,"forwardSpeed":3,"distanceMoved":1,"elapsed":0.5,"remaining":5.5,"turnElapsed":0,"watchElapsed":0,"doorOpenObserved":true,"movementAccepted":true,"sprintObserved":true,"farArrived":false,"sprintExitObserved":false,"returnAccepted":false,"returned":false,"visualAcquired":false,"validFor":1.5,"alternatives":["Jump: eligible","Run-by: eligible","Normal SAIN search"]},"doorReconConfig":{"cooldown":45,"chances":{"Chad":25}},"doorRunByConfig":{"enabled":true,"preference":40,"fallback":true,"minimumStamina":35,"turnDelay":0.35,"limit":6,"watch":2},"doorJumpPeek":{"state":"airborne","reason":"peek-takeoff-observed","door":"test-door","target":"known","source":"heard","personality":"Normal","chance":10,"roll":5,"knownX":0,"knownY":0,"knownZ":3,"contactAge":3,"stamina":50,"forwardSpeed":1.4,"runUpDistance":0.3,"elapsed":0.5,"remaining":3.5,"observationElapsed":0,"doorOpenObserved":true,"movementAccepted":true,"jumpRequested":true,"takeoffObserved":true,"landingObserved":false,"visualAcquired":false,"returned":false,"validFor":1.5,"alternatives":["Normal SAIN search remains available."]},"doorJumpPeekConfig":{"enabled":true,"minimumStamina":35,"minimumSpeed":1.2,"observation":0.4,"limit":4,"cooldown":45,"returnJump":false},"doorApproach":{"state":"approaching","reason":"door-approaching","target":"known","source":"heard","door":"test-door","side":"right","knownX":0,"knownY":0,"knownZ":3,"contactAge":3,"x":1.2,"y":0,"z":-0.9,"pathLength":4,"elapsed":1,"remaining":11,"requested":true,"movementAccepted":true,"moved":true,"arrived":false,"validFor":1.5,"candidates":[{"door":"nearest","side":"left","eligible":false,"reason":"door-point-occupied"},{"door":"test-door","side":"right","eligible":true,"reason":"door-reachable-protected-frame","pathLength":4,"score":4}]},"doorApproachConfig":{"enabled":true,"doorDistance":8,"contactDistance":12,"unseenDelay":1.5,"contactLifetime":60,"approachLimit":12},"environmentContext":{"reported":"outdoor","source":"ai-zone+eft-environment","aiIndoorZone":false,"eftIndoor":false,"conflict":false,"age":0.1,"ceiling":"detected","ceilingHeight":3,"ceilingAge":0.1,"checkedDistance":20,"probeReason":"overhead-surface","purpose":"grenade-preparation","influence":"observation-only","validFor":0.4},"environmentConfig":{"enabled":true,"refresh":0.5,"movement":1,"ceilingDistance":20},"searchAbandonment":{"state":"abandoned","reason":"search-check-position-empty","target":"known","silence":23,"requiredSilence":20,"inspected":3,"requiredInspection":3,"distance":2,"memoryRemaining":30,"validFor":3,"interruptions":1,"forgetRequested":true,"forgetObserved":true},"silentSearch":{"state":"observed","reason":"silent-search-reevaluate","target":"heard","personality":"Normal","silence":15,"delay":15,"remaining":10,"validFor":1.5,"bonus":15,"accepted":true,"actionObserved":true,"movementObserved":false,"walking":true,"x":3,"y":2,"z":7},"silentSearchConfig":{"enabled":true,"scoreBonus":15},"impact":{"state":"observed","active":true,"evidence":"impact-sector","sectorYaw":180,"remaining":3,"validFor":1.5,"nativeAccepted":true,"actionObserved":true,"movementObserved":false},"impactConfig":{"memory":3,"minimumInterval":0.5},"closeDetection":{"state":"acquired","visualAcquired":true,"attentionBefore":2.25,"attentionAfter":1},"floorHearing":{"state":"blocked","reason":"floor-range-cut","floors":1,"nativeRange":40,"finalRange":24,"allowed":false},"gunfire":{"state":"look","reason":"gunfire-orbit-keeps-objective","owner":"ORBIT","distance":175,"applied":true,"remaining":2,"validFor":1.5,"passToSain":false,"searchObserved":false},"quiet":{"state":"crouch","action":"Search","applied":true,"active":true,"validFor":1.5,"used":3,"remaining":17,"chance":0.7,"roll":0.1},"hearing":{"signal":42,"source":"enemy-b","kind":"Sprint","outcome":"heard","age":0.3,"distance":14},"handoff":{"state":"native-observed","fromAction":"Search","nativeCombat":"Retreat","nativeObserved":true,"retryRemaining":0.8},"progress":{"state":"blocked","reason":"progress-stalled","holdSeconds":14,"stalledSeconds":5,"retryRemaining":8,"failures":1,"reconsider":true},"coverResponse":{"state":"quick-cover","eta":0.4,"exposedSeconds":0.25,"coverDelta":20},"opportunity":{"episode":1,"cue":"surgery","state":"usable","heardAt":10,"age":2,"remaining":10,"eta":3,"bonus":20},"opponent":{"state":"estimated","target":"enemy-b","evidence":[{"kind":"weapon","value":"shotgun","source":"seen-hands","age":2,"confidence":0.48}]},"threat":{"previous":"enemy-a","selected":"enemy-b","reason":"threat-recent-attacker","emergency":true,"candidates":[{"target":"enemy-b","eligible":true,"score":120,"hit":98}]},"fear":{"level":0.8,"target":0.9,"panic":true,"transition":"panic-enter","panicChangedAt":9,"at":10,"injury":0.125,"allyDeath":0.29,"outnumbered":0.15,"suppression":0.1,"scoreCap":15},"mixing":{"mistake":{"state":"mistake-selected","best":"Shoot","before":"Shoot","selected":"Cover","bestScore":80,"selectedScore":66,"scoreLoss":0.175,"chance":0.05,"roll":0.02,"at":10,"nextAllowedAt":20,"seed":"a05abcd","drawIndex":1},"state":"weighted-roll","seed":"1234abcd","roll":0.7,"opportunity":4,"options":[{"decision":"Shoot","score":76,"probability":0.24}]}}"""));
var d08ArchiveDetail = File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"d08-door-search.json"));
var previousDetails = (await source.QuerySingleAsync("SELECT detail FROM comet_decision WHERE raidId=$id",("$id",raidId)))!["detail"]!.ToString()!;
var combinedDetails = JsonNode.Parse(previousDetails)!.AsObject();
var journalPages=JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"journal-summary.json")))!.AsArray();
foreach(var page in JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"control-summary.json")))!.AsArray())journalPages.Add(page!.DeepClone());
foreach(var page in journalPages)
{
    var projected=RaidReview.Http.CometMapEvent.Project(new Dictionary<string,object?>{{"feature",page!["feature"]!.GetValue<string>()},{"detail",page.ToJsonString()}});
    var journal=(JsonElement)((Dictionary<string,object?>)projected["detail"]!)["journalReport"]!;
    Check(journal.GetProperty("part").GetInt32()==page["journalReport"]!["part"]!.GetValue<int>(),"T01/T03 compact projection keeps report page");
}
combinedDetails["journalReport"]=journalPages[1]!["journalReport"]!.DeepClone();
combinedDetails["combatJournal"]=new JsonObject{["kind"]="hit-taken",["damage"]=42};
combinedDetails["controlJournal"]=new JsonObject{["kind"]="long-wait",["owner"]="recovery",["blocker"]="medical-in-progress"};
combinedDetails["weaponJournal"]=new JsonObject{["change"]=new JsonObject{["state"]="ready",["request"]=7}};
var t02Pages=JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"t02-summary.json")))!.AsArray();
foreach(var page in t02Pages)
{
    var projected=RaidReview.Http.CometMapEvent.Project(new Dictionary<string,object?>{{"feature","T02"},{"detail",page!.ToJsonString()}});
    var counter=(JsonElement)((Dictionary<string,object?>)projected["detail"]!)["tacticCounters"]!;
    Check(counter.GetProperty("part").GetInt32()==page["tacticCounters"]!["part"]!.GetValue<int>(),"T02 compact projection preserves page identity");
}
combinedDetails["tacticCounters"]=t02Pages[1]!["tacticCounters"]!.DeepClone();
combinedDetails["cornerPeek"]=JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"m03-corner-peek.json")))!["cornerPeek"]!.DeepClone();
combinedDetails["cornerChase"]=JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"m05-corner-chase.json")))!["cornerChase"]!.DeepClone();
combinedDetails["angleWatch"]=JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"m07-angle-watch.json")))!["angleWatch"]!.DeepClone();
combinedDetails["outdoorRelocation"]=JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"m13-outdoor-relocation.json")))!["outdoorRelocation"]!.DeepClone();
combinedDetails["tacticalJump"]=JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"m12-tactical-jump.json")))!["tacticalJump"]!.DeepClone();
combinedDetails["retreatWeave"]=JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"m11-retreat-weave.json")))!["retreatWeave"]!.DeepClone();
combinedDetails["adsTravel"]=JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"m10-ads-travel.json")))!["adsTravel"]!.DeepClone();
combinedDetails["coverTravel"]=JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"m09-cover-travel.json")))!["coverTravel"]!.DeepClone();
combinedDetails["holdAngle"]=JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"m08-hold-angle.json")))!["holdAngle"]!.DeepClone();
combinedDetails["cornerPrefire"]=JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"m06-corner-prefire.json")))!["cornerPrefire"]!.DeepClone();
combinedDetails["combatLean"]=JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"m04-combat-lean.json")))!["combatLean"]!.DeepClone();
combinedDetails["firePause"]=JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"m02-fire-pause.json")))!["firePause"]!.DeepClone();
combinedDetails["previousDoorRoomClear"] = combinedDetails["doorRoomClear"]!.DeepClone();
foreach(var part in JsonNode.Parse(d08ArchiveDetail)!.AsObject()) combinedDetails[part.Key]=part.Value?.DeepClone();
combinedDetails["doorInterruption"]=JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"d12-door-interruption.json")))!["doorInterruption"]!.DeepClone();
combinedDetails["doorEmergency"]=JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"d13-door-emergency.json")))!["doorEmergency"]!.DeepClone();
combinedDetails["doorReservation"]=JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"d14-door-reservation.json")))!["doorReservation"]!.DeepClone();
combinedDetails["pistolSwap"]=JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"w02-pistol-swap.json")))!["pistolSwap"]!.DeepClone();
combinedDetails["weaponReturn"]=JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"w03-weapon-return.json")))!["weaponReturn"]!.DeepClone();
combinedDetails["quickReload"]=JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"w04-quick-reload.json")))!["quickReload"]!.DeepClone();
combinedDetails["weaponRange"]=JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"w05-weapon-range.json")))!["weaponRange"]!.DeepClone();
combinedDetails["grenadeTrajectory"]=JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"g02-grenade-trajectory.json")))!["grenadeTrajectory"]!.DeepClone();
combinedDetails["grenadeChoice"]=JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"g03-grenade-choice.json")))!["grenadeChoice"]!.DeepClone();
combinedDetails["ownGrenadeSafety"]=JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"g04-own-grenade.json")))!["ownGrenadeSafety"]!.DeepClone();
combinedDetails["grenadeReaction"]=JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"g05-grenade-reaction.json")))!["grenadeReaction"]!.DeepClone();
combinedDetails["flashContinuity"]=JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"g09-flash-continuity.json")))!["flashContinuity"]!.DeepClone();
combinedDetails["crossfire"]=JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"s01-crossfire.json")))!["crossfire"]!.DeepClone();
combinedDetails["fireLane"]=JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"s07-fire-lane.json")))!["fireLane"]!.DeepClone();
var c03ArchiveDetail=JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"c03-geometry.json")))!;
combinedDetails["doorSpatial"]=c03ArchiveDetail["doorSpatial"]!.DeepClone();
combinedDetails["doorSpatialConfig"]=c03ArchiveDetail["doorSpatialConfig"]!.DeepClone();
var c03Projection=RaidReview.Http.CometMapEvent.Project(new Dictionary<string,object?>{{"feature","C03"},{"detail",c03ArchiveDetail.ToJsonString()}});
var c03Compact=(Dictionary<string,object?>)c03Projection["detail"]!;
Check(c03Compact.ContainsKey("doorSpatial")&&!c03Compact.ContainsKey("doorSpatialConfig"),"C03 compact evidence without config");
Check(((JsonElement)c03Compact["doorSpatial"]!).GetProperty("margin").GetDouble()==.55,"C03 exact projection");
var c04ArchiveDetail=JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"c04-motion.json")))!;
combinedDetails["doorMotion"]=c04ArchiveDetail["doorMotion"]!.DeepClone();
combinedDetails["doorMotionConfig"]=c04ArchiveDetail["doorMotionConfig"]!.DeepClone();
var c04Projection=RaidReview.Http.CometMapEvent.Project(new Dictionary<string,object?>{{"feature","C04"},{"detail",c04ArchiveDetail.ToJsonString()}});
var c04Compact=(Dictionary<string,object?>)c04Projection["detail"]!;
Check(c04Compact.ContainsKey("doorMotion")&&!c04Compact.ContainsKey("doorMotionConfig"),"C04 compact evidence without config");
Check(((JsonElement)c04Compact["doorMotion"]!).GetProperty("targetAngle").GetDouble()==-90,"C04 exact projection");
var c14ArchiveDetail=JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"c14-preset.json")))!;
var u01ArchiveDetail=JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"u01-preset.json")))!;
combinedDetails["cometPreset"]=u01ArchiveDetail["cometPreset"]!.DeepClone();
var u01Projection=RaidReview.Http.CometMapEvent.Project(new Dictionary<string,object?>{{"feature","U01"},{"detail",u01ArchiveDetail.ToJsonString()}});
Check(((JsonElement)((Dictionary<string,object?>)u01Projection["detail"]!)["cometPreset"]!).GetProperty("baseProfile").GetString()=="Easy","U01 selected difficulty survives projection");
Check(((JsonElement)((Dictionary<string,object?>)u01Projection["detail"]!)["configRevision"]!).GetInt32()==38,"U01 revision survives compact projection");
var u07ArchiveDetail=JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"u07-preset.json")))!;
combinedDetails["cometPreset"]=u07ArchiveDetail["cometPreset"]!.DeepClone();
var u07Projection=RaidReview.Http.CometMapEvent.Project(new Dictionary<string,object?>{{"feature","U01"},{"detail",u07ArchiveDetail.ToJsonString()}});
var u07Projected=(JsonElement)((Dictionary<string,object?>)u07Projection["detail"]!)["cometPreset"]!;
Check(u07Projected.GetProperty("presetName").GetString()=="My Customs setup"&&u07Projected.GetProperty("presetRevision").GetInt32()==3,"U07 personal identity survives compact projection");
Check(u07Projected.GetProperty("modifiedSincePreset").GetBoolean(),"U07 subsequent edits survive compact projection");
combinedDetails["sainPreset"]=c14ArchiveDetail["sainPreset"]!.DeepClone();
var c14Projection=RaidReview.Http.CometMapEvent.Project(new Dictionary<string,object?>{{"feature","C14"},{"detail",c14ArchiveDetail.ToJsonString()}});
Check(((JsonElement)((Dictionary<string,object?>)c14Projection["detail"]!)["sainPreset"]!).GetProperty("name").GetString()=="Selected OFF","C14 selected preset survives projection");
Check(((JsonElement)((Dictionary<string,object?>)c14Projection["detail"]!)["configRevision"]!).GetInt32()==17,"C14 revision survives compact projection");
var c13ArchiveDetail=JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"c13-cleanup.json")))!;
combinedDetails["raidCleanup"]=c13ArchiveDetail["raidCleanup"]!.DeepClone();
var c13Projection=RaidReview.Http.CometMapEvent.Project(new Dictionary<string,object?>{{"feature","C13"},{"detail",c13ArchiveDetail.ToJsonString()}});
Check(((JsonElement)((Dictionary<string,object?>)c13Projection["detail"]!)["raidCleanup"]!).GetProperty("remainingBots").GetInt32()==0,"C13 projection preserves cleanup counts");
var c10ArchiveDetail=JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"c10-validity.json")))!;
combinedDetails["validity"]=c10ArchiveDetail["validity"]!.DeepClone();
var c10Projection=RaidReview.Http.CometMapEvent.Project(new Dictionary<string,object?>{{"feature","C10"},{"detail",c10ArchiveDetail.ToJsonString()}});
var c10Compact=(Dictionary<string,object?>)c10Projection["detail"]!;
Check(c10Compact.ContainsKey("validity"),"C10 compact evidence");
Check(((JsonElement)c10Compact["validity"]!).GetProperty("operation").GetString()=="movement","C10 exact projection");
var c09ArchiveDetail=JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"c09-lifecycle.json")))!;
combinedDetails["lifecycle"]=c09ArchiveDetail["lifecycle"]!.DeepClone();
var c09Projection=RaidReview.Http.CometMapEvent.Project(new Dictionary<string,object?>{{"feature","C09"},{"detail",c09ArchiveDetail.ToJsonString()}});
var c09Compact=(Dictionary<string,object?>)c09Projection["detail"]!;
Check(c09Compact.ContainsKey("lifecycle"),"C09 compact evidence");
Check(((JsonElement)c09Compact["lifecycle"]!).GetProperty("state").GetString()=="dead","C09 exact projection");
var c08ArchiveDetail=JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"c08-fault-isolation.json")))!;
combinedDetails["faultIsolation"]=c08ArchiveDetail["faultIsolation"]!.DeepClone();
combinedDetails["faultIsolationConfig"]=c08ArchiveDetail["faultIsolationConfig"]!.DeepClone();
var c08Projection=RaidReview.Http.CometMapEvent.Project(new Dictionary<string,object?>{{"feature","C08"},{"detail",c08ArchiveDetail.ToJsonString()}});
var c08Compact=(Dictionary<string,object?>)c08Projection["detail"]!;
Check(c08Compact.ContainsKey("faultIsolation")&&!c08Compact.ContainsKey("faultIsolationConfig"),"C08 compact evidence without config");
Check(((JsonElement)c08Compact["faultIsolation"]!).GetProperty("retryIn").GetDouble()==5,"C08 exact projection");
var i02ArchiveDetail=JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"i02-control.json")))!;
combinedDetails["controlHandoff"]=i02ArchiveDetail["controlHandoff"]!.DeepClone();
var i02Projection=RaidReview.Http.CometMapEvent.Project(new Dictionary<string,object?>{{"feature","I02"},{"detail",i02ArchiveDetail.ToJsonString()}});
var i02Compact=(Dictionary<string,object?>)i02Projection["detail"]!;
Check(i02Compact.ContainsKey("controlHandoff"),"I02 compact owner evidence included");
Check(((JsonElement)i02Compact["controlHandoff"]!).GetProperty("owner").GetString()==i02ArchiveDetail["controlHandoff"]!["owner"]!.GetValue<string>(),"I02 compact actual owner preserved");
var c07ArchiveDetail=JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"c07-cover-scan.json")))!;
combinedDetails["coverScan"]=c07ArchiveDetail["coverScan"]!.DeepClone();
combinedDetails["coverScanConfig"]=c07ArchiveDetail["coverScanConfig"]!.DeepClone();
var c07Projection=RaidReview.Http.CometMapEvent.Project(new Dictionary<string,object?>{{"feature","C07"},{"detail",c07ArchiveDetail.ToJsonString()}});
var c07Compact=(Dictionary<string,object?>)c07Projection["detail"]!;
Check(c07Compact.ContainsKey("coverScan")&&!c07Compact.ContainsKey("coverScanConfig"),"C07 compact evidence without config");
Check(((JsonElement)c07Compact["coverScan"]!).GetProperty("elapsed").GetDouble()==4,"C07 exact projection");
var c06ArchiveDetail=JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"c06-recovery.json")))!;
combinedDetails["movementRecovery"]=c06ArchiveDetail["movementRecovery"]!.DeepClone();
combinedDetails["movementRecoveryConfig"]=c06ArchiveDetail["movementRecoveryConfig"]!.DeepClone();
var c06Projection=RaidReview.Http.CometMapEvent.Project(new Dictionary<string,object?>{{"feature","C06"},{"detail",c06ArchiveDetail.ToJsonString()}});
var c06Compact=(Dictionary<string,object?>)c06Projection["detail"]!;
Check(c06Compact.ContainsKey("movementRecovery")&&!c06Compact.ContainsKey("movementRecoveryConfig"),"C06 compact evidence without config");
Check(((JsonElement)c06Compact["movementRecovery"]!).GetProperty("stalledSeconds").GetDouble()==3,"C06 exact projection");
var c05ArchiveDetail=JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"c05-closing.json")))!;
combinedDetails["doorClosing"]=c05ArchiveDetail["doorClosing"]!.DeepClone();
combinedDetails["doorClosingConfig"]=c05ArchiveDetail["doorClosingConfig"]!.DeepClone();
var c05Projection=RaidReview.Http.CometMapEvent.Project(new Dictionary<string,object?>{{"feature","C05"},{"detail",c05ArchiveDetail.ToJsonString()}});
var c05Compact=(Dictionary<string,object?>)c05Projection["detail"]!;
Check(c05Compact.ContainsKey("doorClosing")&&!c05Compact.ContainsKey("doorClosingConfig"),"C05 compact evidence without config");
Check(((JsonElement)c05Compact["doorClosing"]!).GetProperty("occupiedRadius").GetDouble()==1.5,"C05 exact projection");
var c02ArchiveDetail=JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"c02-recovery.json")))!;
combinedDetails["doorRecovery"]=c02ArchiveDetail["doorRecovery"]!.DeepClone();
combinedDetails["doorRecoveryConfig"]=c02ArchiveDetail["doorRecoveryConfig"]!.DeepClone();
var c02Projection=RaidReview.Http.CometMapEvent.Project(new Dictionary<string,object?>{{"feature","C02"},{"detail",c02ArchiveDetail.ToJsonString()}});
var c02Compact=(Dictionary<string,object?>)c02Projection["detail"]!;
Check(c02Compact.ContainsKey("doorRecovery")&&!c02Compact.ContainsKey("doorRecoveryConfig"),"C02 compact evidence without config");
Check(((JsonElement)c02Compact["doorRecovery"]!).GetProperty("requested").GetBoolean(),"C02 exact projection");
var c01ArchiveDetail=JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"c01-transit.json")))!;
combinedDetails["doorTransit"]=c01ArchiveDetail["doorTransit"]!.DeepClone();
combinedDetails["doorTransitConfig"]=c01ArchiveDetail["doorTransitConfig"]!.DeepClone();
var c01Projection=RaidReview.Http.CometMapEvent.Project(new Dictionary<string,object?>{{"feature","C01"},{"detail",c01ArchiveDetail.ToJsonString()}});
var c01Compact=(Dictionary<string,object?>)c01Projection["detail"]!;
Check(c01Compact.ContainsKey("doorTransit")&&!c01Compact.ContainsKey("doorTransitConfig"),"C01 compact evidence without config");
Check(((JsonElement)c01Compact["doorTransit"]!).GetProperty("requested").GetBoolean(),"C01 exact projection");
var e04ArchiveDetail=JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"e04-outcome.json")))!;
combinedDetails["outcome"]=e04ArchiveDetail["outcome"]!.DeepClone();
combinedDetails["outcomeConfig"]=e04ArchiveDetail["outcomeConfig"]!.DeepClone();
var e04Projection=RaidReview.Http.CometMapEvent.Project(new Dictionary<string,object?>{{"feature","E04"},{"detail",e04ArchiveDetail.ToJsonString()}});
var e04Compact=(Dictionary<string,object?>)e04Projection["detail"]!;
Check(e04Compact.ContainsKey("outcome")&&!e04Compact.ContainsKey("outcomeConfig"),"E04 compact evidence without config");
Check(((JsonElement)e04Compact["outcome"]!).GetProperty("result").GetString()=="favorable","E04 exact projection");
var e03ArchiveDetail=JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"e03-encounter.json")))!;
combinedDetails["encounter"]=e03ArchiveDetail["encounter"]!.DeepClone();
combinedDetails["encounterConfig"]=e03ArchiveDetail["encounterConfig"]!.DeepClone();
var e03Projection=RaidReview.Http.CometMapEvent.Project(new Dictionary<string,object?>{{"feature","E03"},{"detail",e03ArchiveDetail.ToJsonString()}});
var e03Compact=(Dictionary<string,object?>)e03Projection["detail"]!;
Check(e03Compact.ContainsKey("encounter")&&!e03Compact.ContainsKey("encounterConfig"),"E03 compact map preserves evidence, omits config");
Check(((JsonElement)e03Compact["encounter"]!).GetProperty("observations").GetArrayLength()==3,"E03 projection clones observation history");
combinedDetails["restLights"]=JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"l03-rest-lights.json")))!["restLights"]!.DeepClone();
combinedDetails["tacticalDevices"]=JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"l02-tactical-devices.json")))!["tacticalDevices"]!.DeepClone();
combinedDetails["lightDiscipline"]=JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"l01-light-discipline.json")))!["lightDiscipline"]!.DeepClone();
combinedDetails["squadVoice"]=JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"s09-squad-voice.json")))!["squadVoice"]!.DeepClone();
combinedDetails["squadFire"]=JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"s08-squad-fire.json")))!["squadFire"]!.DeepClone();
combinedDetails["crossfire"]!["storm"]=JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"s06-squad-storm.json")))!["crossfire"]!["storm"]!.DeepClone();
combinedDetails["crossfire"]!["trade"]=JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"s05-squad-trade.json")))!["crossfire"]!["trade"]!.DeepClone();
combinedDetails["crossfire"]!["coverMate"]=JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"s04-cover-mate.json")))!["crossfire"]!["coverMate"]!.DeepClone();
combinedDetails["crossfire"]!["maneuver"]=JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"s03-squad-maneuver.json")))!["crossfire"]!["maneuver"]!.DeepClone();
combinedDetails["crossfire"]!["entrance"]=JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"s02-secondary-entrance.json")))!["crossfire"]!["entrance"]!.DeepClone();
combinedDetails["readyStance"]=JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"h05-ready-stance.json")))!["readyStance"]!.DeepClone();
combinedDetails["postCombat"]=JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"h04-post-combat.json")))!["postCombat"]!.DeepClone();
combinedDetails["medicalPosture"]=JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"h03-medical-posture.json")))!["medicalPosture"]!.DeepClone();
combinedDetails["surgeryInterruption"]=JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"h02-surgery-interruption.json")))!["surgeryInterruption"]!.DeepClone();
combinedDetails["medicalChoice"]=JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"h01-medical-choice.json")))!["medicalChoice"]!.DeepClone();
combinedDetails["explosionAwareness"]=JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"g10-explosion-awareness.json")))!["explosionAwareness"]!.DeepClone();
combinedDetails["gasExposure"]=JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"g08-gas-exposure.json")))!["gasExposure"]!.DeepClone();
combinedDetails["grenadeFilter"]=JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"g07-grenade-filter.json")))!["grenadeFilter"]!.DeepClone();
combinedDetails["grenadeDispersion"]=JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"g06-grenade-dispersion.json")))!["grenadeDispersion"]!.DeepClone();
combinedDetails["grenadeJudgment"]=JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"g01-grenade-judgment.json")))!["grenadeJudgment"]!.DeepClone();
combinedDetails["handsRecovery"]=JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"w10-hands-recovery.json")))!["handsRecovery"]!.DeepClone();
combinedDetails["recoilRecovery"]=JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"w09-recoil-recovery.json")))!["recoilRecovery"]!.DeepClone();
combinedDetails["shotGeometry"]=JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"w08-shot-geometry.json")))!["shotGeometry"]!.DeepClone();
combinedDetails["suppressionDiscipline"]=JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"w07-suppression-discipline.json")))!["suppressionDiscipline"]!.DeepClone();
combinedDetails["weaponSync"]=JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"w06-weapon-sync.json")))!["weaponSync"]!.DeepClone();
combinedDetails["reloadTiming"]=JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"w01-reload-timing.json")))!["reloadTiming"]!.DeepClone();
combinedDetails["coverFeint"]=JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"m14-cover-feint.json")))!["coverFeint"]!.DeepClone();
combinedDetails["doorSupport"]=JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"d11-door-support.json")))!["doorSupport"]!.DeepClone();
var d10ArchiveDetail=JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"d10-door-hold.json")))!.AsObject();
combinedDetails["doorHold"]=d10ArchiveDetail["doorHold"]!.DeepClone();
combinedDetails["retainedDoorAmbush"]=d10ArchiveDetail["doorAmbush"]!.DeepClone();
var d09ArchiveDetail=JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"d09-door-ambush.json")))!.AsObject();
combinedDetails["doorAmbush"]=d09ArchiveDetail["doorAmbush"]!.DeepClone();
combinedDetails["doorAmbushConfig"]=d09ArchiveDetail["doorAmbushConfig"]!.DeepClone();
await source.ExecuteAsync("UPDATE comet_decision SET feature='D08',decision='DoorSearchClear',stage='evaluated',detail=$detail WHERE raidId=$id",("$id",raidId),("$detail",combinedDetails.ToJsonString()));
// A replayed event must not create two entries; the same sequence in another raid is valid.
await source.ExecuteAsync(@"INSERT OR IGNORE INTO comet_decision
    (raidId,time,cometSession,sequence,profileId,name,feature,decision,stage,reason,detail)
    SELECT raidId,time,cometSession,sequence,profileId,name,feature,decision,stage,reason,detail
    FROM comet_decision WHERE raidId=$id", ("$id", raidId));
Check((await source.QueryAsync("SELECT * FROM comet_decision WHERE raidId=$id", ("$id", raidId))).Count == 1,
    "COMET duplicate session/sequence is idempotent in SQLite");
await ProfileLoadingTests.Run(root,source,sourceFiles,logger,sourceCompiler,raidId,Check);
if (args.Contains("--profiles-only"))
{
    Console.WriteLine($"PASS {checks} profile loading checks");
    return;
}
var identity = new Dictionary<string, object?> { ["profileName"] = "Recker (headless)", ["isHeadless"] = true, ["type"] = "SCAV" };
sourceFiles.WriteFile("positions", "", "", raidId + "_positions",
    "profileId,time,x,y,z,dir,raid_id,health,maxHealth,decision,ghost,bodyYaw\n" +
    $"player-1,1000,1,2,3,45,{raidId},440,440,Search,false,80\n" +
    $"player-1,2000,4,5,6,90,{raidId},440,440,Quest,true,90\n");
var work = exporter.CreateWorkFolder();
var exported = await exporter.ExportAsync(raidId, identity, work, default);
Check(exported.Warning == null, "Positions included");
using (var z = ZipFile.OpenRead(exported.Path))
{
    Check(z.Entries.Count == RaidArchiveService.Tables.Length + 2, "All registered tables, positions and manifest exported");
    Check(z.Entries.Any(e => e.FullName.Contains("comet_decision")), "COMET decision history included in shared ZIP");
    Check(!z.Entries.Any(e => e.FullName.Contains("profile.json")), "No SPT profile files");
}
async Task<RaidArchiveService.ImportResult> Import(string path, CancellationToken ct = default)
{
    string temp = importer.CreateWorkFolder();
    try { return await importer.ImportAsync(path, temp, ct); }
    finally { importer.DeleteWorkFolder(temp); }
}
var result = await Import(exported.Path);
Check(!result.AlreadyExists && result.RaidId == raidId, "New raid imported");
foreach (string table in RaidArchiveService.Tables)
{
    var a = (await source.QueryAsync($"SELECT * FROM {table} WHERE raidId=$id", ("$id", raidId))).Single();
    var b = (await target.QueryAsync($"SELECT * FROM {table} WHERE raidId=$id", ("$id", raidId))).Single();
    Check(!Equals(a["id"], b["id"]), "Local row ID allocated: " + table);
    foreach (string key in a.Keys.Where(k => k != "id" && !k.StartsWith("imported")))
        Check(Equals(a[key], b[key]), $"Preserved {table}.{key}");
    Check((await target.QueryAsync($"SELECT * FROM {table} WHERE raidId=$id", ("$id", localRaidId))).Count == 1, "Local raid preserved");
}
string compiledName = $"{raidId}_V4_positions.json";
Check(File.ReadAllBytes(Path.Combine(sourceData, "positions", compiledName))
    .SequenceEqual(File.ReadAllBytes(Path.Combine(targetData, "positions", compiledName))), "Exact positions preserved");
var importedRow = (await target.QuerySingleAsync("SELECT * FROM raid WHERE raidId=$id", ("$id", raidId)))!;
RecordingIdentity.Apply(importedRow, "wrong local username", []);
Check(importedRow["profileName"]?.ToString() == "Recker (headless)" && importedRow["isHeadless"] is true, "Headless identity survives");
Check((await Import(exported.Path)).AlreadyExists, "Duplicate is recognized without overwriting");

string Mutation(string suffix, Action<Dictionary<string, byte[]>> edit, bool updateHashes = true)
{
    using var input = ZipFile.OpenRead(exported.Path);
    var entries = input.Entries.ToDictionary(e => e.FullName, e => { using var stream = e.Open(); using var memory = new MemoryStream(); stream.CopyTo(memory); return memory.ToArray(); });
    edit(entries);
    var manifest = JsonNode.Parse(entries["manifest.json"])!;
    if (updateHashes)
        foreach (var (name, data) in entries.Where(kv => kv.Key != "manifest.json"))
            if (manifest["files"]![name] is JsonNode part)
            {
                part["bytes"] = data.Length;
                part["sha256"] = Convert.ToHexString(SHA256.HashData(data));
            }
    entries["manifest.json"] = Encoding.UTF8.GetBytes(manifest.ToJsonString());
    string path = Path.Combine(root, suffix + ".zip");
    using var output = ZipFile.Open(path, ZipArchiveMode.Create);
    foreach (var (name, bytes) in entries) { using var stream = output.CreateEntry(name).Open(); stream.Write(bytes); }
    return path;
}
async Task Reject(string path, string description)
{
    try { await Import(path); throw new Exception("Accepted " + description); }
    catch (Exception ex) when (ex is InvalidDataException or JsonException or System.Data.Common.DbException) { checks++; }
    Check((await target.QueryAsync("SELECT * FROM raid")).Count == 2, "Failed import changed no raids: " + description);
}
await Reject(Mutation("corrupt", e => e["tables/player.json"] = "[]"u8.ToArray(), false), "bad checksum");
await Reject(Mutation("missing", e => e.Remove("positions.json")), "missing positions");
await Reject(Mutation("traversal", e => e["../escape.txt"] = "bad"u8.ToArray()), "path traversal");
await Reject(Mutation("version", e => {
    var m = JsonNode.Parse(e["manifest.json"])!; m["version"] = 100; e["manifest.json"] = Encoding.UTF8.GetBytes(m.ToJsonString());
}), "future version");
await Reject(Mutation("foreign", e => {
    var rows = JsonNode.Parse(e["tables/kills.json"])!; rows[0]!["raidId"] = localRaidId;
    e["tables/kills.json"] = Encoding.UTF8.GetBytes(rows.ToJsonString());
}), "foreign raid event");
await Reject(Mutation("bad-position", e => e["positions.json"] = "{\"player-1\":[{\"x\":\"NaN\",\"y\":2,\"z\":3,\"time\":0}]}"u8.ToArray()), "bad positions");
await Reject(Mutation("truncated-position", e => e["positions.json"] = "{\"player-1\":["u8.ToArray()), "truncated positions");
await Reject(Mutation("sql-column", e => {
    var rows = JsonNode.Parse(e["tables/kills.json"])!; rows[0]!["invalid\"; DROP TABLE raid; --"] = 1;
    e["tables/kills.json"] = Encoding.UTF8.GetBytes(rows.ToJsonString());
}), "unknown SQL column");

// A constraint violation late in the import rolls back already inserted parent/child rows.
string rollbackId = Guid.NewGuid().ToString();
var rollback = Mutation("rollback", e => {
    foreach (var name in e.Keys.ToArray()) e[name] = Encoding.UTF8.GetBytes(Encoding.UTF8.GetString(e[name]).Replace(raidId, rollbackId));
    var rows = JsonNode.Parse(e["tables/switch_state.json"])!.AsArray(); rows.Add(rows[0]!.DeepClone());
    e["tables/switch_state.json"] = Encoding.UTF8.GetBytes(rows.ToJsonString());
    var m = JsonNode.Parse(e["manifest.json"])!; m["files"]!["tables/switch_state.json"]!["rows"] = 2;
    e["manifest.json"] = Encoding.UTF8.GetBytes(m.ToJsonString());
});
await Reject(rollback, "transaction rollback");
Check(!File.Exists(Path.Combine(targetData, "positions", rollbackId + "_V4_positions.json")), "No orphan replay after rollback");
using (var cancelled = new CancellationTokenSource())
{
    cancelled.Cancel();
    try { await Import(exported.Path, cancelled.Token); throw new Exception("Cancellation ignored"); }
    catch (OperationCanceledException) { checks++; }
}

// Import/export remains usable after source CSV cleanup.
sourceFiles.DeleteFile("positions", "", "", raidId + "_positions");
string compiledWork = exporter.CreateWorkFolder();
Check((await exporter.ExportAsync(raidId, identity, compiledWork, default)).Warning == null, "Compiled-only export");
sourceFiles.DeleteFile("positions", "", "", compiledName);
string noPositionsWork = exporter.CreateWorkFolder();
var noPositions = await exporter.ExportAsync(raidId, identity, noPositionsWork, default);
Check(noPositions.Warning != null, "Missing positions explicitly reported");
source.QueueWrite("UPDATE raid SET exitName=$name WHERE raidId=$id", ("$name", "Queued final update"), ("$id", raidId));
string queuedWork = exporter.CreateWorkFolder();
var queuedExport = await exporter.ExportAsync(raidId, identity, queuedWork, default);
using (var z = ZipFile.OpenRead(queuedExport.Path))
using (var doc = await JsonDocument.ParseAsync(z.GetEntry("tables/raid.json")!.Open()))
    Check(doc.RootElement[0].GetProperty("exitName").GetString() == "Queued final update", "Export flushes pending recording events");

// Private-cache deferred snapshots must not lock out recording writes.
await using (var snapshot = await source.OpenTransferConnectionAsync(default))
{
    using var read = snapshot.CreateCommand();
    read.CommandText = "BEGIN DEFERRED; SELECT COUNT(*) FROM raid";
    await read.ExecuteScalarAsync();
    await source.ExecuteAsync("UPDATE raid SET exitName='Concurrent recording' WHERE raidId=$id", ("$id", raidId)).WaitAsync(TimeSpan.FromSeconds(2));
    Check(true, "WAL snapshot allows recording writes");
    read.CommandText = "ROLLBACK";
    await read.ExecuteNonQueryAsync();
}

string bigId = Guid.NewGuid().ToString();
await Seed(source, bigId);
string bigPosition = Path.Combine(sourceData, "positions", bigId + "_V4_positions.json");
await using (var output = File.Create(bigPosition))
await using (var writer = new Utf8JsonWriter(output))
{
    writer.WriteStartObject(); writer.WritePropertyName("player-1"); writer.WriteStartArray();
    var noise = new byte[1536];
    for (int i = 0; i < 25_000; i++)
    {
        RandomNumberGenerator.Fill(noise);
        writer.WriteStartObject();
        writer.WriteNumber("time", i); writer.WriteNumber("x", i); writer.WriteNumber("y", 1); writer.WriteNumber("z", 2);
        writer.WriteString("profileId", "player-1"); writer.WriteString("raidId", bigId);
        writer.WriteString("decision", Convert.ToBase64String(noise));
        writer.WriteEndObject();
        if (writer.BytesPending > 64 * 1024) await writer.FlushAsync();
    }
    writer.WriteEndArray(); writer.WriteEndObject();
}
string bigWork = exporter.CreateWorkFolder();
var bigArchive = await exporter.ExportAsync(bigId, identity, bigWork, default);
Check(new FileInfo(bigArchive.Path).Length > 30_000_000, "Large archive exceeds Kestrel default upload limit");

// Exercise real HTTP endpoints, including uploads larger than Kestrel's default 30 MB.
var builder = WebApplication.CreateBuilder();
builder.WebHost.UseUrls("http://127.0.0.1:0");
builder.Logging.ClearProviders();
await using var app = builder.Build();
app.MapRaidArchives(importer, async id => (await target.QuerySingleAsync("SELECT * FROM raid WHERE raidId=$id", ("$id", id)))!, logger);
await app.StartAsync();
string url = app.Services.GetRequiredService<IServer>().Features.Get<IServerAddressesFeature>()!.Addresses.Single();
using var client = new HttpClient { BaseAddress = new Uri(url), Timeout = TimeSpan.FromMinutes(3) };
using (var body = new StreamContent(File.OpenRead(exported.Path)))
{
    var response = await client.PostAsync("/api/raids/import", body);
    Check(response.IsSuccessStatusCode, "HTTP upload succeeds");
    Check((await response.Content.ReadAsStringAsync()).Contains("\"alreadyExists\":true"), "HTTP duplicate feedback");
}
var invalidZipResponse = await client.PostAsync("/api/raids/import", new StringContent("broken"));
Check(invalidZipResponse.StatusCode == System.Net.HttpStatusCode.BadRequest, "Malformed ZIP returns clear 400");
Check((await invalidZipResponse.Content.ReadAsStringAsync()).Contains("not a valid raid ZIP"), "Malformed ZIP error is understandable");
var downloaded = await client.GetAsync("/api/raids/" + raidId + "/export");
Check(downloaded.IsSuccessStatusCode && downloaded.Content.Headers.ContentType?.MediaType == "application/zip", "HTTP export download");
Check(downloaded.Content.Headers.ContentDisposition?.FileName?.Contains(raidId) == true, "Download filename");
using (var body = new StreamContent(File.OpenRead(bigArchive.Path)))
{
    var response = await client.PostAsync("/api/raids/import", body);
    Check(response.IsSuccessStatusCode, "Large HTTP upload: " + await response.Content.ReadAsStringAsync());
    Check(SHA256.HashData(File.ReadAllBytes(bigPosition)).SequenceEqual(
        SHA256.HashData(File.ReadAllBytes(Path.Combine(targetData, "positions", bigId + "_V4_positions.json")))),
        "Large replay survives HTTP import exactly");
}
await app.StopAsync();

if (args.Length == 2 && args[0] == "--real-data")
{
    // Caller supplies an isolated SQLite backup, never the live game directory.
    string realData = Path.GetFullPath(args[1]);
    Check(realData.StartsWith(Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../../../work")) + Path.DirectorySeparatorChar,
        StringComparison.OrdinalIgnoreCase), "Real fixture is an isolated workspace backup");
    using var realDb = new DatabaseService();
    await realDb.InitializeAsync(realData);
    var realFiles = new DataFileService(); realFiles.Initialize(realData);
    var realCompiler = new RaidPositionCompiler(realFiles, logger);
    var realExporter = new RaidArchiveService(realDb, realFiles, realCompiler, logger, realData);
    var realRaid = (await realDb.QuerySingleAsync("SELECT * FROM raid WHERE exitStatus<>'' AND timeInRaid>10 ORDER BY id DESC LIMIT 1"))!;
    string realId = realRaid["raidId"]!.ToString()!;
    string realWork = realExporter.CreateWorkFolder();
    var archive = await realExporter.ExportAsync(realId, realRaid, realWork, default);
    Check(!(await Import(archive.Path)).AlreadyExists, "Real raid imported");
    foreach (var table in RaidArchiveService.Tables)
    {
        var before = await realDb.QueryAsync($"SELECT * FROM {table} WHERE raidId=$id ORDER BY id", ("$id", realId));
        var after = await target.QueryAsync($"SELECT * FROM {table} WHERE raidId=$id ORDER BY id", ("$id", realId));
        Check(before.Count == after.Count, "Real row count: " + table);
        for (int i = 0; i < before.Count; i++)
            foreach (var key in before[i].Keys.Where(k => k != "id" && !k.StartsWith("imported")))
                Check(Equals(before[i][key], after[i][key]), "Real data preserved: " + table + "." + key);
    }
    string realPositionName = realId + "_V4_positions.json";
    Check(SHA256.HashData(File.ReadAllBytes(Path.Combine(realData, "positions", realPositionName))).SequenceEqual(
        SHA256.HashData(File.ReadAllBytes(Path.Combine(targetData, "positions", realPositionName)))), "Real positions hash preserved");
    realExporter.DeleteWorkFolder(realWork);
    Console.WriteLine("Real round-trip: " + realId);
}

var cleanupConfig = new RaidReview.Config.RaidReviewConfig { AutoDelete = true, AutoDeleteLimit = 1, AutoDeleteUnfinishedRaids = true };
var cleanupSessions = new RaidReview.Session.SessionManager(logger, cleanupConfig);
var gc = new RaidReview.DataIntegrity.GarbageCollector(target, targetFiles, logger, cleanupConfig, cleanupSessions);
var cleanupHandler = new RaidReview.WebSocket.WsPacketHandler(target, cleanupSessions, targetFiles, logger, null!);
async Task<string> StartCleanupRaid(string profile, string age)
{
    var payload = JsonSerializer.Serialize(new { sessionId = profile, profileId = profile, location = "factory", time = "12:00", type = "PMC", timeInRaid = 2 });
    await cleanupHandler.HandleMessageAsync(JsonSerializer.SerializeToUtf8Bytes(new { Action = "START", Payload = payload }));
    var id = cleanupSessions.GetProfile(profile)!.RaidId!;
    await target.ExecuteAsync("UPDATE raid SET created_at=datetime('now',$age) WHERE raidId=$id", ("$age", age), ("$id", id));
    targetFiles.WriteFile("positions", "", "", id + "_positions", "raw");
    targetFiles.WriteFile("positions", "", "", id + "_V4_positions.json", "[]");
    return id;
}
async Task CheckCleanupRaid(string id, bool retained)
{
    var row = await target.QuerySingleAsync("SELECT raidId FROM raid WHERE raidId=$id", ("$id", id));
    Check((row != null) == retained, $"Cleanup row retention for {id} should be {retained}");
    foreach (var suffix in new[] { "_positions", "_V4_positions.json" })
        Check(targetFiles.FileExists("positions", "", "", id + suffix) == retained, $"Cleanup file retention for {id}{suffix} should be {retained}");
}
var activeRaid = await StartCleanupRaid("long-running", "-215 minutes");
var oldOrphan = await StartCleanupRaid("old-orphan", "-215 minutes");
var recentOrphan = await StartCleanupRaid("recent-orphan", "-30 minutes");
cleanupSessions.RemoveRaid(oldOrphan, "simulated timeout");
cleanupSessions.RemoveRaid(recentOrphan, "simulated timeout");
await gc.CollectOldRaidsAsync();
Check(await target.QuerySingleAsync("SELECT raidId FROM raid WHERE raidId=$id", ("$id", localRaidId)) != null,
    "Newer unfinished raids do not consume the completed-raid quota");
cleanupConfig.AutoDeleteLimit = 0;
await gc.CollectOldRaidsAsync();
await CheckCleanupRaid(activeRaid, true);
await CheckCleanupRaid(recentOrphan, true);
await gc.CollectUnfinishedRaidsAsync(TimeSpan.FromHours(3));
await CheckCleanupRaid(activeRaid, true);
await CheckCleanupRaid(oldOrphan, false);
await CheckCleanupRaid(recentOrphan, true);
await gc.CollectUnfinishedRaidsAsync();
await CheckCleanupRaid(activeRaid, true);
await CheckCleanupRaid(recentOrphan, false);
cleanupSessions.RemoveRaid(activeRaid, "end of test");
Check(await target.QuerySingleAsync("SELECT * FROM raid WHERE raidId=$id", ("$id", raidId)) != null, "Imported raid retained by automatic cleanup");
Check(await target.QuerySingleAsync("SELECT * FROM raid WHERE raidId=$id", ("$id", localRaidId)) == null, "Normal raid retention still works");
Check(!Directory.EnumerateDirectories(Path.Combine(targetData, "transfers")).Any(), "Transfer workspaces cleaned");
checks += await PbtCaptureTests.Run(root);
Console.WriteLine($"PASS RaidTransfer: {checks} checks. Isolated data: {root}");

var magazineProjection=RaidReview.Http.CometMapEvent.Project(new Dictionary<string,object?>{{"stage","arrived"},{"detail","{\"magazineRecovery\":{\"magazine\":\"original-mag\",\"x\":1}}"}});
Check(((Dictionary<string,object?>)magazineProjection["detail"]!).ContainsKey("magazineRecovery"),"compact map preserves magazine recovery payload");
