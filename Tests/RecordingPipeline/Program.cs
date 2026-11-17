using System.Collections.Concurrent;
using System.Text;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using RAID_REVIEW;
using RaidReview.WebSocket;
using RaidReview.Database;
using RaidReview.Session;
using RaidReview.FileSystem;

class Program
{
    private static int checks;
    static void Check(bool condition, string description)
    {
        if (!condition) throw new Exception(description);
        checks++;
    }
    static void Wait(Func<bool> condition) => Check(SpinWait.SpinUntil(condition, 5000), "worker timed out");
    static string Serialize(string action, object payload) => JsonConvert.SerializeObject(new WsPayload
        { Action=action, Payload=JsonConvert.SerializeObject(payload) });

    static async Task Main()
    {
        CometCounterCaptureTests.Run(Check);
        FikaRecordingTests.Run(Check);
        InventoryTests.Run(Check);
        foreach (var (x,z,yaw) in new[] { (0f,1f,0f), (1f,0f,90f), (0f,-1f,180f), (-1f,0f,270f), (1f,1f,45f), (-1f,1f,315f) })
        {
            Check(Math.Abs(BodyOrientation.FromForward(x,z,false)!.Value-yaw)<0.001f, "body forward has a signed full-circle yaw");
            Check(BodyOrientation.FromForward(x,z,true)==null, "Ghost never records stale body rotation");
        }
        foreach (var (x,z) in new[] { (0f,0f), (float.NaN,1f), (1f,float.PositiveInfinity), (float.NegativeInfinity,0f) })
            Check(BodyOrientation.FromForward(x,z,false)==null, "invalid or vertical-only body forward is unavailable");
        var sleepingSample = new TrackingPlayerData("s","a",0,0,0,0,0,100,100,ghost:true);
        var sleepingWire = JObject.Parse(JsonConvert.SerializeObject(sleepingSample, new JsonSerializerSettings { NullValueHandling=NullValueHandling.Ignore }));
        Check(sleepingWire.ContainsKey("bodyYaw") && sleepingWire["bodyYaw"]!.Type==JTokenType.Null,
            "null orientation keeps its CSV column even when serializer ignores other nulls");
        foreach (var side in new[] { EFT.EPlayerSide.Savage, EFT.EPlayerSide.Usec, EFT.EPlayerSide.Bear })
        {
            foreach (var isAI in new[] { false, true })
            {
                var participant = new TrackingPlayer {
                    profileId = "participant", team = side,
                    type = RecordingPlayerIdentity.Type(isAI, side),
                    name = RecordingPlayerIdentity.Name(isAI, "Scav name", "fums")
                };
                Check(isAI ? participant.type != "HUMAN" : participant.type == "HUMAN", "human identity survives every faction");
                Check(participant.name == (isAI ? "Scav name" : "fums"), "human account name preferred, bot name preserved");
                var wire = JsonConvert.SerializeObject(participant.Snapshot());
                var row = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object?>>(wire)!;
                var presentation = new Dictionary<string, object?> { ["profileId"] = "host", ["type"] = "PMC" };
                RaidReview.PostRaid.RecordingIdentity.Apply(presentation, "Headless_0123456789abcdef01234567", new[] { row });
                Check((string?)presentation["type"] == (!isAI && side == EFT.EPlayerSide.Savage ? "SCAV" : "PMC"), "serialized player faction determines headless raid type");
                Check((string?)presentation["profileName"] == (isAI ? "Headless" : "fums (headless)"), "serialized human name determines headless label");
                Check((string?)presentation["profileId"] == "host" && participant.profileId == "participant", "recording and participant IDs remain intact");
            }
        }
        foreach (var nickname in new[] { null, "", " " })
            Check(RecordingPlayerIdentity.Name(false, "Fallback", nickname) == "Fallback", "missing PMC name retains recorded nickname");
        Check(RecordingPlayerIdentity.Type(true, EFT.EPlayerSide.Savage) == "SCAV|SCAV", "AI Scav default remains intact before role mapping");
        var container = new TrackingLooseLootItem { templateId = "contents", containerTemplateId = "root-template", inContainer = true };
        Check(JObject.Parse(JsonConvert.SerializeObject(container)).Value<string>("containerTemplateId") == "root-template", "container root template survives the client wire model");
        Check(JsonConvert.DeserializeObject<TrackingLooseLootItem>("{\"inContainer\":true}")!.containerTemplateId == "", "old loose-loot payloads default to missing container metadata");
        var camp = new TrackingOrbitMainObjective { type = "ExtractCamp", campUntilTimeExtract = true, campElapsed = 1900 };
        var campJson = JObject.Parse(JsonConvert.SerializeObject(camp));
        Check(campJson.Value<bool>("campUntilTimeExtract") && campJson.Value<float>("campElapsed") == 1900,
            "record final extract-camp semantics for replay");
        Check(!JsonConvert.DeserializeObject<TrackingOrbitMainObjective>("{\"type\":\"ExtractCamp\",\"campTargetDuration\":63}")!.campUntilTimeExtract,
            "legacy extract camps retain timed semantics");
        var owner = Environment.CurrentManagedThreadId;
        var output = new ConcurrentQueue<string>();
        using (var worker = new OrderedPacketSender(2048, (action,payload) =>
        {
            if (Environment.CurrentManagedThreadId == owner) throw new Exception("serialized on capture thread");
            return Serialize(action,payload);
        }, output.Enqueue, reason=>throw new Exception(reason)))
        {
            Check(worker.BeginRaid(), "start first raid");
            for (int i=0;i<500;i++) Check(worker.Enqueue(i==0 ? "START" : "POSITION_BATCH", new { n=i }), "accepted");
            worker.Enqueue("AIRDROP_FLIGHT", new { n=500 });
            worker.Enqueue("END", new { n=501 });
            Check(worker.BeginRaid(), "new raid may queue behind prior END");
            worker.Enqueue("START", new { n=502 });
            Wait(()=>worker.Snapshot().Sent==503);
            var packets=output.ToArray();
            Check(packets.Length==503,"all packets retained");
            for(int i=0;i<packets.Length;i++)
                Check(JObject.Parse(JObject.Parse(packets[i])["Payload"].Value<string>())["n"].Value<int>()==i,"FIFO order");
            Check(worker.Snapshot().Bytes>0 && worker.Snapshot().SerializeMs>0,"sender metrics");
            Check(!worker.Faulted && worker.Snapshot().Dropped==0,"normal stream complete");
        }
        using (var entered = new ManualResetEventSlim())
        using (var release = new ManualResetEventSlim())
        {
            int errors=0;
            using var worker = new OrderedPacketSender(2, Serialize, s=>{ entered.Set(); release.Wait(5000); }, _=>Interlocked.Increment(ref errors));
            worker.Enqueue("START", 0); Check(entered.Wait(5000),"transport blocked");
            worker.Enqueue("PLAYER", 1); worker.Enqueue("POSITION_BATCH", 2);
            Check(!worker.Enqueue("END",3),"overflow rejected");
            Check(worker.Faulted && errors==1,"overflow surfaced once");
            Check(worker.Snapshot().Dropped==3,"overflow counts queued loss");
            Check(!worker.BeginRaid(),"cannot reset while failed transport busy");
            release.Set(); Wait(()=>worker.Snapshot().Pending==0);
            Check(worker.BeginRaid(),"next raid can recover after drain");
            worker.Enqueue("START",4); Wait(()=>worker.Snapshot().Sent==2);
        }
        int failures=0;
        using (var failed = new OrderedPacketSender(4, Serialize, _=>throw new IOException("offline"), _=>Interlocked.Increment(ref failures)))
        {
            failed.Enqueue("START", 0); Wait(()=>failed.Faulted);
            Check(!failed.Enqueue("END",1),"no successful END after failure");
            Wait(()=>failures==1); Check(failed.Snapshot().Dropped>=1,"failed packet counted");
        }
        using (var badJson = new OrderedPacketSender(4, (_,__)=>throw new Exception("serialize"), _=>throw new Exception("must not send"), _=>{}))
        {
            badJson.Enqueue("START",0); Wait(()=>badJson.Faulted); Check(badJson.Snapshot().Sent==0,"serialization failure cannot send");
        }
        // Mutable records are cloned before queueing; vectors remain JSON strings for the database.
        var player=new TrackingPlayer { sessionId="s",profileId="p", name="Before" };
        var copy=player.Snapshot(); player.name="After"; Check(copy.name=="Before","player detached");
        var raid=new TrackingRaid { sessionId="s",exitName="Before" };var raidCopy=raid.Snapshot();raid.exitName="After";
        Check(raidCopy.exitName=="Before","raid detached");
        var ballistic=new TrackingBallistic { source=new JsonPosition(new UnityEngine.Vector3(1,2,3)) };
        var vector=JObject.Parse(JsonConvert.SerializeObject(ballistic))["source"];
        Check(vector.Type==JTokenType.String && JObject.Parse(vector.Value<string>())["x"].Value<float>()==1,"nested vector schema");

        // Ghosts remain registered and alive. Death/despawn retire records after one final observation.
        RecordingRoster.Reset(); Telemetry.Packets.Clear();
        var alive=new EFT.Player {ProfileId="ghost"}; var dead=new EFT.Player {ProfileId="dead",KillerId="killer"};dead.HealthController.IsAlive=false;
        var world=new EFT.GameWorld();world.AllPlayersEverExisted.AddRange(new[]{alive,dead});RecordingRoster.Seed(world);
        Check(RecordingRoster.Snapshot().Count==2,"initial historical seed");
        Check(RecordingRoster.Observe(alive),"alive ghost retained");Check(!RecordingRoster.Observe(dead),"dead retired");
        Check(RecordingRoster.Snapshot().Count==1,"history excluded from next tick");
        RecordingRoster.Observe(alive);Check(Telemetry.Packets.Count==2,"unchanged statuses coalesced");
        RecordingRoster.Depart(alive);Check(!RecordingRoster.Observe(alive),"live despawn retired");
        Check(((TrackingPlayerDeadOrUnspawned)Telemetry.Packets.Last().Payload).status==PlayerStatus.Unspawned,"despawn status");
        Check(RecordingRoster.Snapshot().Count==0,"empty active roster");
        var replacement=new EFT.Player {ProfileId="ghost"};RecordingRoster.Add(replacement);RecordingRoster.Depart(alive);
        Check(RecordingRoster.Observe(replacement),"late removal cannot retire replacement");
        RecordingRoster.Reset();Check(RecordingRoster.Snapshot().Count==0,"raid teardown releases players");

        // Headless END occurs after the world and its health controllers are gone.
        RecordingRoster.Reset(); Telemetry.Packets.Clear();
        var survivor = new EFT.Player { ProfileId = "headless-survivor" };
        RecordingRoster.Add(survivor); RecordingRoster.Observe(survivor);
        survivor.HealthController = null;
        RecordingRoster.Depart(survivor);
        RecordingRoster.Finish(false);
        Check(Telemetry.Packets.Count == 1 && ((TrackingPlayerDeadOrUnspawned)Telemetry.Packets[0].Payload).status == PlayerStatus.Alive,
            "destroyed headless world cannot turn the last living state into removal");
        RecordingRoster.Reset(); Telemetry.Packets.Clear();
        var finalDeath = new EFT.Player { ProfileId = "final-death", KillerId = "killer" };
        RecordingRoster.Add(finalDeath); RecordingRoster.Observe(finalDeath);
        finalDeath.HealthController.IsAlive = false;
        RecordingRoster.Finish(true);
        Check(((TrackingPlayerDeadOrUnspawned)Telemetry.Packets.Last().Payload).status == PlayerStatus.Dead,
            "intact world still captures a final death");
        RecordingRoster.Reset();

        TerminalStatusTests.Run(Check);
        GasDeathTests.Run(Check);
        await ServerCompatibility();
        Console.WriteLine($"PASS {checks} recording pipeline checks");
    }
    static async Task ServerCompatibility()
    {
        var db=new DatabaseService();var sessions=new SessionManager();var files=new DataFileService();var log=new RaidReview.RaidReviewLogger();
        var handler=new WsPacketHandler(db,sessions,files,log,new RaidReview.PostRaid.ItemResolver());
        async Task Packet(string action,object payload)=>await handler.HandleMessageAsync(Encoding.UTF8.GetBytes(Serialize(action,payload)));
        await Packet("START",new {sessionId="s",profileId="s"});
        Check(sessions.GetProfile("s").RaidId!=null,"server START session");
        await Packet("KILL", new TrackingRaidKill { sessionId="s",time=100,profileId="gas",killedId="gas",type="HotGases",
            weapon="Gas explosion",bodyPart="",positionKilled=new JsonPosition(new UnityEngine.Vector3(1,2,3)),positionKiller=new JsonPosition(new UnityEngine.Vector3(1,2,3)) });
        Check(db.LastArgs.Single(a=>a.Item1=="$type").Item2.ToString()=="HotGases","gas damage type survives KILL serialization and storage");
        Check(db.LastArgs.Single(a=>a.Item1=="$profileId").Item2.ToString()==db.LastArgs.Single(a=>a.Item1=="$killedId").Item2.ToString(),"environmental death has no fabricated killer");
        foreach (var (stage, time) in new[] { ("selected", 100), ("accepted", 101), ("released", 105) })
        foreach (var feature in new[] { "A01", "A02", "A03", "A07" })
        {
            string detail = """{"schema":1,"fear":{"level":0.8,"target":0.9,"panic":true,"transition":"panic-enter","panicChangedAt":9,"at":10,"injury":0.125,"allyDeath":0.29,"outnumbered":0.15,"suppression":0.1,"scoreCap":15},"mixing":{"mistake":{"state":"mistake-selected","best":"Shoot","before":"Shoot","selected":"Cover","bestScore":80,"selectedScore":66,"scoreLoss":0.175,"chance":0.05,"roll":0.02,"at":10,"nextAllowedAt":20,"seed":"a05abcd","drawIndex":1},"seed":"1234abcd","state":"weighted-roll","roll":0.7,"opportunity":4,"options":[{"decision":"Shoot","probability":0.24}]},"continuity":{"remaining":0.7,"lostFor":0.1,"fireAuthorized":false},"visible":{"coverRouteRisk":0.3},"candidates":[{"decision":"Push","eligible":false,"reason":"additional-known-threat"}]}""";
            if (feature == "A07") detail = """{"threat":{"previous":"enemy-a","selected":"enemy-b","reason":"threat-recent-attacker","trigger":"new-hit","emergency":true,"margin":0.2,"holdRemaining":2,"candidates":[{"target":"enemy-b","eligible":true,"source":"heard","age":0.1,"hit":98,"score":120}]}}""";
            await Packet("COMET_DECISION", new { sessionId="s", cometSession="comet-1", sequence=time, profileId="a", name="Test PMC", feature, decision=feature=="A07"?"SelectTarget":feature=="A03"?"KeepAngle":feature=="A02"?"Cover":"Hold", stage, reason="test", time, detail });
            Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()==feature, "COMET feature survives wire");
            Check(db.Sql.Last().Contains("comet_decision"), "COMET event stored independently of positions");
            Check(db.LastArgs.Single(a=>a.Item1=="$stage").Item2.ToString()==stage, "COMET lifecycle stage survives wire");
            Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==detail, "COMET rejected alternatives survive wire");
            Check(db.LastArgs.Single(a=>a.Item1=="$raidId").Item2.ToString()==sessions.GetProfile("s").RaidId, "COMET server resolves authoritative raid identity");
        }
        const string gunfireDetail = """{"schema":1,"gunfire":{"state":"look","reason":"gunfire-orbit-keeps-objective","owner":"ORBIT","distance":175,"applied":true,"passToSain":false,"searchObserved":false,"remaining":2,"validFor":1.5},"gunfireConfig":{"lookDuration":3}}""";
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=106,profileId="a",name="Test PMC",feature="P03",decision="GunfireReaction",stage="evaluated",reason="gunfire-orbit-keeps-objective",time=106,detail=gunfireDetail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="P03","P03 feature survives real packet handler");
        Check(db.LastArgs.Single(a=>a.Item1=="$stage").Item2.ToString()=="evaluated","P03 hearing does not become accepted action");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==gunfireDetail,"P03 lease, native owner and contact distinction survive storage");
        const string floorDetail = """{"schema":1,"floorHearing":{"state":"blocked","reason":"floor-range-cut","floors":1,"nativeRange":40,"finalRange":24,"distance":30,"allowed":false,"nativeAudible":true},"floorConfig":{"oneFloorOther":0.6}}""";
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=107,profileId="a",name="Test PMC",feature="P04",decision="FloorHearing",stage="evaluated",reason="floor-range-cut",time=107,detail=floorDetail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="P04","P04 feature survives packet handler");
        Check(db.LastArgs.Single(a=>a.Item1=="$stage").Item2.ToString()=="evaluated","P04 is not combat ownership");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==floorDetail,"P04 negative perception and range evidence survive storage");
        const string closeDetail = """{"schema":1,"closeDetection":{"state":"acquired","reason":"close-native-visual-acquired","target":"enemy","distance":3,"attentionBefore":2.25,"attentionAfter":1,"nativeModifier":9,"finalModifier":4,"visualAcquired":true,"correctionAge":0.2},"closeConfig":{"startDistance":6,"fullDistance":3,"reductionPercent":100}}""";
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=108,profileId="a",name="Test PMC",feature="P05",decision="CloseDetection",stage="evaluated",reason="close-native-visual-acquired",time=108,detail=closeDetail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="P05","P05 feature survives packet handler");
        Check(db.LastArgs.Single(a=>a.Item1=="$stage").Item2.ToString()=="evaluated","P05 does not become action ownership");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==closeDetail,"P05 native acquisition, numeric evidence and settings survive storage");
        const string impactDetail = """{"schema":1,"impact":{"state":"observed","reason":"impact-defensive-action-observed","active":true,"evidence":"impact-sector","sectorYaw":180,"remaining":3,"validFor":1.5,"nativeAccepted":true,"actionObserved":true,"movementObserved":false},"impactConfig":{"enabled":true,"memory":3,"minimumInterval":0.5}}""";
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=109,profileId="a",name="Test PMC",feature="P07",decision="ImpactReaction",stage="evaluated",reason="impact-defensive-action-observed",time=109,detail=impactDetail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="P07","P07 feature survives packet handler");
        Check(db.LastArgs.Single(a=>a.Item1=="$stage").Item2.ToString()=="evaluated","P07 explicit observation remains independent");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==impactDetail,"P07 impact/action/motion distinction and config survive storage");
        const string silentDetail = """{"silentSearch":{"state":"observed","reason":"silent-search-reevaluate","target":"heard","personality":"Normal","silence":15,"delay":15,"remaining":10,"validFor":1.5,"bonus":15,"accepted":true,"actionObserved":true,"movementObserved":false,"walking":true,"x":3,"y":2,"z":7},"silentSearchConfig":{"enabled":true,"scoreBonus":15}}""";
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=110,profileId="a",name="Test PMC",feature="P08",decision="SilentSearch",stage="evaluated",reason="silent-search-reevaluate",time=110,detail=silentDetail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="P08","P08 feature survives packet handler");
        Check(db.LastArgs.Single(a=>a.Item1=="$stage").Item2.ToString()=="evaluated","P08 observation does not become action ownership");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==silentDetail,"P08 known position, acceptance, motion and config survive storage");
        var angleDetail=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"m07-angle-watch.json"));
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=134,profileId="a",name="Test PMC",feature="M07",decision="AngleWatch",stage="evaluated",reason="angle-prepare-known-approach",time=134,detail=angleDetail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="M07","M07 feature persisted");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==angleDetail,"M07 personal evidence, requested and observed gaze survive storage");
        var weaponReturnDetail=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"w03-weapon-return.json"));
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=153,profileId="a",name="Test PMC",feature="W03",decision="WeaponReturn",stage="evaluated",reason="weapon-target-in-hands",time=153,detail=weaponReturnDetail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="W03","W03 persisted");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==weaponReturnDetail,"W03 ammo, requested/accepted/in-hands evidence and alternatives retained");
        var quickReloadDetail=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"w04-quick-reload.json"));
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=154,profileId="a",name="Test PMC",feature="W04",decision="QuickReload",stage="evaluated",reason="quick-drop-observed",time=154,detail=quickReloadDetail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="W04","W04 persisted");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==quickReloadDetail,"W04 request, drop and native operation evidence and alternatives retained");
        var weaponRangeDetail=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"w05-weapon-range.json"));
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=155,profileId="a",name="Test PMC",feature="W05",decision="WeaponRange",stage="evaluated",reason="weapon-target-in-hands",time=155,detail=weaponRangeDetail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="W05","W05 persisted");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==weaponRangeDetail,"W05 equipment comparison and actual hands evidence and alternatives retained");
        var trajectoryDetail=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"g02-grenade-trajectory.json"));
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=162,profileId="a",name="Test PMC",feature="G02",decision="GrenadeTrajectory",stage="evaluated",reason="trajectory-execution-validated",time=162,detail=trajectoryDetail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="G02","G02 persisted");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==trajectoryDetail,"G02 actual aim and alternatives retained");
        var choiceDetail=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"g03-grenade-choice.json"));
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=163,profileId="a",name="Test PMC",feature="G03",decision="GrenadeChoice",stage="evaluated",reason="choice-execution-validated",time=163,detail=choiceDetail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="G03","G03 persisted");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==choiceDetail,"G03 actual aim and alternatives retained");
        var ownSafetyDetail=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"g04-own-grenade.json"));
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=164,profileId="a",name="Test PMC",feature="G04",decision="OwnGrenadeSafety",stage="evaluated",reason="own-grenade-native-escape",time=164,detail=ownSafetyDetail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="G04","G04 persisted");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==ownSafetyDetail,"G04 actual danger and alternatives retained");
        var reactionDetail=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"g05-grenade-reaction.json"));
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=165,profileId="a",name="Test PMC",feature="G05",decision="GrenadeReaction",stage="evaluated",reason="grenade-safe-route-selected",time=165,detail=reactionDetail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="G05","G05 persisted");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==reactionDetail,"G05 actual danger and alternatives retained");
        var s01Detail=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"s01-crossfire.json"));
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=176,profileId="a",name="Test PMC",feature="S01",decision="Crossfire",stage="evaluated",reason="crossfire-useful-angle",time=176,detail=s01Detail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="S01","S01 persisted");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==s01Detail,"S01 support, angle, reason and alternatives retained");
        var s04Detail=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"s04-cover-mate.json"));
        var c03Detail=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"c03-geometry.json"));
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=192,profileId="a",name="Test PMC",feature="C03",decision="DoorGeometry",stage="evaluated",reason="geometry-live-panel-clearance",time=192,detail=c03Detail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="C03","C03 recorded as observation");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==c03Detail,"C03 exact evidence retained");
        var c04Detail=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"c04-motion.json"));
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=193,profileId="a",name="Test PMC",feature="C04",decision="DoorMotion",stage="evaluated",reason="motion-push-away-requested",time=192,detail=c04Detail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="C04","C04 recorded as observation");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==c04Detail,"C04 exact evidence retained");
        var c14Detail=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"c14-preset.json"));
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=194,profileId="",name="SAIN preset",feature="C14",decision="SainPreset",stage="context",reason="initial",time=193,detail=c14Detail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="C14","C14 raid context persisted without bot identity");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==c14Detail,"C14 selected preset and server revision preserved");
        var c13Detail=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"c13-cleanup.json"));
        var u01Detail=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"u01-preset.json"));
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=195,profileId="",name="COMET difficulty",feature="U01",decision="CometPreset",stage="context",reason="raid-config-loaded",time=194,detail=u01Detail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="U01","U01 raid context persisted without bot identity");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==u01Detail,"U01 profile, customization and revision preserved");
        var u07Detail=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"u07-preset.json"));
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=196,profileId="",name="COMET difficulty",feature="U01",decision="CometPreset",stage="context",reason="raid-config-loaded",time=195,detail=u07Detail});
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==u07Detail,"U07 personal identity and subsequent edits preserved verbatim");
        var i02Detail=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"i02-control.json"));
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=197,profileId="p1",name="PMC",feature="I02",decision="ControlHandoff",stage="evaluated",reason="control-takeover-observed",time=196,detail=i02Detail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="I02","I02 owner change persisted");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==i02Detail,"I02 owner, timing and pending state preserved verbatim");
        string c13Session=JObject.Parse(c13Detail)["session"]!.Value<string>()!;
        string c13Raid=sessions.GetProfile("s").RaidId;
        await Packet("COMET_SESSION",new{sessionId="s",cometSession=c13Session});
        sessions.GetProfile("s").RaidId=null; // END detaches the profile.
        await Packet("COMET_DECISION",new{sessionId="s",cometSession=c13Session,sequence=200,profileId="",name="Raid cleanup",feature="C13",decision="RaidCleanup",stage="cleanup",reason="world-ended",time=200,detail=c13Detail});
        Check(db.LastArgs.Single(a=>a.Item1=="$raidId").Item2.ToString()==c13Raid,"C13 summary stored after END detached the profile");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==c13Detail,"C13 failures and counts retained");
        sessions.GetProfile("s").RaidId="next-raid";
        await Packet("COMET_DECISION",new{sessionId="s",cometSession=c13Session,sequence=200,profileId="",name="Raid cleanup",feature="C13",decision="RaidCleanup",stage="cleanup",reason="world-ended",time=200,detail=c13Detail});
        Check(db.LastArgs.Single(a=>a.Item1=="$raidId").Item2.ToString()==c13Raid,"C13 old cleanup cannot follow profile into next raid");
        var t02Pages=JArray.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"t02-summary.json")));
        foreach(var page in t02Pages)
        {
            page["session"]=c13Session;
            var detail=page.ToString(Formatting.None);
            await Packet("COMET_DECISION",new{sessionId="s",cometSession=c13Session,sequence=(long)page["sequence"]!,profileId="",name="Raid counters",feature="T02",decision="TacticCounters",stage="summary",reason="raid-ended",time=200,detail});
            Check(db.LastArgs.Single(a=>a.Item1=="$raidId").Item2.ToString()==c13Raid,"T02 late page is routed to its registered raid, not the next raid");
            Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==detail,"T02 complete summary preserved verbatim");
        }
        foreach(var page in JArray.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"journal-summary.json"))))
        {
            string feature=(string)page["feature"]!,detail=page.ToString(Newtonsoft.Json.Formatting.None);
            await Packet("COMET_DECISION",new{sessionId="s",cometSession=c13Session,sequence=(long)page["sequence"]!,profileId="",name="Raid report",feature,decision="Journal",stage="summary",reason="raid-ended",time=200,detail});
            Check(db.LastArgs.Single(a=>a.Item1=="$raidId").Item2.ToString()==c13Raid,"T01/T03 late pages stay with original raid");
            Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==detail,"T01/T03 report payload preserved");
        }
        var beforeUnknownSummary=db.LastArgs;
        await Packet("COMET_DECISION",new{sessionId="s",cometSession="unregistered-summary",feature="T02",stage="summary"});
        Check(ReferenceEquals(db.LastArgs,beforeUnknownSummary),"T02 unregistered summary rejected");
        var c13Prior=db.LastArgs;
        await Packet("COMET_DECISION",new{sessionId="s",cometSession=new string('a',32),feature="C13",stage="cleanup"});
        Check(ReferenceEquals(db.LastArgs,c13Prior),"unregistered C13 cleanup rejected instead of assigned to current raid");
        sessions.GetProfile("s").RaidId=c13Raid;
        var c10Detail=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"c10-validity.json"));
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=199,profileId="a",name="Test PMC",feature="C10",decision="Validity",stage="evaluated",reason="owner-not-alive",time=198,detail=c10Detail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="C10","C10 recorded as observation");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==c10Detail,"C10 exact evidence retained");
        var c09Detail=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"c09-lifecycle.json"));
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=198,profileId="a",name="Test PMC",feature="C09",decision="Lifecycle",stage="evaluated",reason="lifecycle-dead-bot-ended",time=197,detail=c09Detail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="C09","C09 recorded as observation");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==c09Detail,"C09 exact evidence retained");
        var c08Detail=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"c08-fault-isolation.json"));
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=197,profileId="a",name="Test PMC",feature="C08",decision="FaultIsolation",stage="evaluated",reason="fault-retry-delay",time=196,detail=c08Detail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="C08","C08 recorded as observation");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==c08Detail,"C08 exact evidence retained");
        var c07Detail=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"c07-cover-scan.json"));
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=196,profileId="a",name="Test PMC",feature="C07",decision="CoverScan",stage="evaluated",reason="cover-scan-retaining-results",time=195,detail=c07Detail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="C07","C07 recorded as observation");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==c07Detail,"C07 exact evidence retained");
        var c06Detail=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"c06-recovery.json"));
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=195,profileId="a",name="Test PMC",feature="C06",decision="MovementRecovery",stage="evaluated",reason="recovery-repath-requested",time=194,detail=c06Detail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="C06","C06 recorded as observation");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==c06Detail,"C06 exact evidence retained");
        var c05Detail=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"c05-closing.json"));
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=194,profileId="a",name="Test PMC",feature="C05",decision="DoorClosing",stage="evaluated",reason="closing-interaction-started",time=193,detail=c05Detail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="C05","C05 recorded as observation");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==c05Detail,"C05 exact evidence retained");
        var c02Detail=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"c02-recovery.json"));
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=191,profileId="a",name="Test PMC",feature="C02",decision="DoorRecovery",stage="evaluated",reason="recovery-door-on-route",time=191,detail=c02Detail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="C02","C02 recorded as observation");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==c02Detail,"C02 exact evidence retained");
        var c01Detail=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"c01-transit.json"));
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=190,profileId="a",name="Test PMC",feature="C01",decision="DoorTransit",stage="evaluated",reason="transit-door-on-route",time=190,detail=c01Detail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="C01","C01 recorded as observation");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==c01Detail,"C01 exact evidence retained");
        var e04Detail=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"e04-outcome.json"));
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=189,profileId="a",name="Test PMC",feature="E04",decision="TacticalOutcome",stage="evaluated",reason="outcome-protection-confirmed",time=189,detail=e04Detail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="E04","E04 recorded as observation");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==e04Detail,"E04 exact evidence retained");
        var e03Detail=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"e03-encounter.json"));
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=188,profileId="a",name="Test PMC",feature="E03",decision="EncounterAdaptation",stage="evaluated",reason="encounter-repeated-opening",time=188,detail=e03Detail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="E03","E03 recorded as diagnostic context");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==e03Detail,"E03 observations, score, alternatives and config retained");
        var l03Detail=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"l03-rest-lights.json"));
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=187,profileId="a",name="Test PMC",feature="L03",decision="RestLights",stage="evaluated",reason="rest-switch-off-confirmed",time=187,detail=l03Detail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="L03","L03 remains lighting context");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==l03Detail,"L03 owner, accessory names and observed OFF retained");
        var l02Detail=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"l02-tactical-devices.json"));
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=186,profileId="a",name="Test PMC",feature="L02",decision="TacticalDevices",stage="evaluated",reason="devices-confirmed",time=186,detail=l02Detail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="L02","L02 remains lighting context");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==l02Detail,"L02 evidence, requested and observed states retained");
        var l01Detail=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"l01-light-discipline.json"));
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=185,profileId="a",name="Test PMC",feature="L01",decision="LightDiscipline",stage="evaluated",reason="light-tactical-concealment",time=185,detail=l01Detail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="L01","L01 remains lighting context");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==l01Detail,"L01 evidence, requested and observed states retained");
        var s09Detail=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"s09-squad-voice.json"));
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=184,profileId="a",name="Test PMC",feature="S09",decision="SquadVoice",stage="evaluated",reason="squad-voice-squad-delay",time=184,detail=s09Detail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="S09","S09 is separate voice context");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==s09Detail,"S09 requested, filtered and played facts retained");
        var s08Detail=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"s08-squad-fire.json"));
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=183,profileId="a",name="Test PMC",feature="S08",decision="SquadFire",stage="evaluated",reason="squad-fire-body-in-line",time=183,detail=s08Detail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="S08","S08 persisted");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==s08Detail,"S08 squad identity, trigger veto and observed stop retained");
        var s07Detail=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"s07-fire-lane.json"));
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=182,profileId="a",name="Test PMC",feature="S07",decision="FireLane",stage="evaluated",reason="lane-clear-shooters-axis",time=182,detail=s07Detail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="S07","S07 persisted");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==s07Detail,"S07 actual shot, applied and observed input retained");
        var s06Detail=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"s06-squad-storm.json"));
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=181,profileId="a",name="Test PMC",feature="S06",decision="Crossfire",stage="evaluated",reason="storm-common-departure",time=181,detail=s06Detail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="S06","S06 persisted");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==s06Detail,"S06 evidence, volunteers, departure and actual movement retained");
        var s05Detail=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"s05-squad-trade.json"));
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=180,profileId="a",name="Test PMC",feature="S05",decision="Crossfire",stage="evaluated",reason="trade-watch-reserved",time=180,detail=s05Detail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="S05","S05 persisted");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==s05Detail,"S05 loss evidence, roll and actual execution retained");
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=179,profileId="a",name="Test PMC",feature="S04",decision="Crossfire",stage="evaluated",reason="cover-mate-sector-reserved",time=179,detail=s04Detail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="S04","S04 persisted");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==s04Detail,"S04 patient, operation and observed confirmation retained");
        var s03Detail=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"s03-squad-maneuver.json"));
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=178,profileId="a",name="Test PMC",feature="S03",decision="Crossfire",stage="evaluated",reason="maneuver-active",time=178,detail=s03Detail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="S03","S03 persisted");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==s03Detail,"S03 roles, confirmation and actual shots retained");
        var s02Detail=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"s02-secondary-entrance.json"));
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=177,profileId="a",name="Test PMC",feature="S02",decision="Crossfire",stage="evaluated",reason="secondary-entrance-entry-approved",time=177,detail=s02Detail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="S02","S02 persisted");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==s02Detail,"S02 support, angle, reason and alternatives retained");
        var h05Detail=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"h05-ready-stance.json"));
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=175,profileId="a",name="Test PMC",feature="H05",decision="ReadyStance",stage="evaluated",reason="ready-stance-raised-observed",time=175,detail=h05Detail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="H05","H05 persisted");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==h05Detail,"H05 observed posture and alternatives retained");
        var h04Detail=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"h04-post-combat.json"));
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=174,profileId="a",name="Test PMC",feature="H04",decision="PostCombat",stage="evaluated",reason="post-combat-watch-last-threat",time=174,detail=h04Detail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="H04","H04 persisted");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==h04Detail,"H04 recovery, contact and alternatives retained");
        var h03Detail=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"h03-medical-posture.json"));
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=173,profileId="a",name="Test PMC",feature="H03",decision="MedicalPosture",stage="evaluated",reason="medical-posture-treatment",time=173,detail=h03Detail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="H03","H03 persisted");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==h03Detail,"H03 medicine, readiness and actual posture retained");
        var h02Detail=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"h02-surgery-interruption.json"));
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=172,profileId="a",name="Test PMC",feature="H02",decision="SurgeryInterruption",stage="evaluated",reason="surgery-visible-threat",time=172,detail=h02Detail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="H02","H02 persisted");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==h02Detail,"H02 cancellation, evidence and hands observations retained");
        var h01MedicalDetail=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"h01-medical-choice.json"));
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=171,profileId="a",name="Test PMC",feature="H01",decision="MedicalChoice",stage="evaluated",reason="medical-hands-observed",time=171,detail=h01MedicalDetail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="H01","H01 persisted");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==h01MedicalDetail,"H01 native start and actual item/part retained");
        var blastDetail=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"g10-explosion-awareness.json"));
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=170,profileId="a",name="Test PMC",feature="G10",decision="ExplosionAwareness",stage="evaluated",reason="explosion-nearby-attention",time=170,detail=blastDetail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="G10","G10 persisted");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==blastDetail,"G10 explosion position, witnessed memory and applied gaze retained");
        var flashDetail=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"g09-flash-continuity.json"));
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=169,profileId="a",name="Test PMC",feature="G09",decision="FlashContinuity",stage="evaluated",reason="flash-overlap-preserved",time=169,detail=flashDetail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="G09","G09 persisted");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==flashDetail,"G09 flash phases, memory and continuation source retained");
        var gasDetail=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"g08-gas-exposure.json"));
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=168,profileId="a",name="Test PMC",feature="G08",decision="GasExposure",stage="evaluated",reason="gas-safe-route-started",time=168,detail=gasDetail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="G08","G08 persisted");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==gasDetail,"G08 gas source, protection and escape alternatives retained");
        var filterDetail=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"g07-grenade-filter.json"));
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=167,profileId="a",name="Test PMC",feature="G07",decision="GrenadeFilter",stage="evaluated",reason="filter-execution-validated",time=167,detail=filterDetail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="G07","G07 persisted");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==filterDetail,"G07 category and excluded alternatives retained");
        var dispersionDetail=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"g06-grenade-dispersion.json"));
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=166,profileId="a",name="Test PMC",feature="G06",decision="GrenadeDispersion",stage="evaluated",reason="dispersion-shared-safe-exit",time=166,detail=dispersionDetail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="G06","G06 persisted");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==dispersionDetail,"G06 reservation and alternatives retained");
        var judgmentDetail=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"g01-grenade-judgment.json"));
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=161,profileId="a",name="Test PMC",feature="G01",decision="GrenadeJudgment",stage="evaluated",reason="grenade-native-accepted",time=161,detail=judgmentDetail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="G01","G01 persisted");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==judgmentDetail,"G01 request and unconfirmed outcome retained");
        var handsDetail=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"w10-hands-recovery.json"));
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=160,profileId="a",name="Test PMC",feature="W10",decision="HandsRecovery",stage="evaluated",reason="hands-native-request",time=160,detail=handsDetail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="W10","W10 persisted");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==handsDetail,"W10 request and unconfirmed outcome retained");
        var recoveryDetail=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"w09-recoil-recovery.json"));
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=159,profileId="a",name="Test PMC",feature="W09",decision="RecoilRecovery",stage="evaluated",reason="recoil-time-based-recovery",time=159,detail=recoveryDetail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="W09","W09 persisted");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==recoveryDetail,"W09 actual offsets, multiplier and alternatives retained");
        var geometryDetail=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"w08-shot-geometry.json"));
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=158,profileId="a",name="Test PMC",feature="W08",decision="ShotGeometry",stage="evaluated",reason="geometry-door-or-glass",time=158,detail=geometryDetail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="W08","W08 persisted");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==geometryDetail,"W08 doors/glass permission, surfaces and alternatives retained");
        var disciplineDetail=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"w07-suppression-discipline.json"));
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=157,profileId="a",name="Test PMC",feature="W07",decision="SuppressionDiscipline",stage="evaluated",reason="suppression-burst-pause",time=157,detail=disciplineDetail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="W07","W07 persisted");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==disciplineDetail,"W07 actual shot counts and frozen aim retained");
        var weaponSyncDetail=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"w06-weapon-sync.json"));
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=156,profileId="a",name="Test PMC",feature="W06",decision="WeaponSync",stage="evaluated",reason="sync-equipment-verified",time=156,detail=weaponSyncDetail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="W06","W06 persisted");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==weaponSyncDetail,"W06 slot repair and actual cache readback retained");
        var pistolDetail=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"w02-pistol-swap.json"));
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=152,profileId="a",name="Test PMC",feature="W02",decision="PistolSwap",stage="evaluated",reason="pistol-in-hands",time=152,detail=pistolDetail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="W02","W02 persisted");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==pistolDetail,"W02 ammo, requested/accepted/in-hands evidence and alternatives retained");
        var reloadDetail=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"w01-reload-timing.json"));
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=151,profileId="a",name="Test PMC",feature="W01",decision="ReloadTiming",stage="evaluated",reason="reload-animation-observed",time=151,detail=reloadDetail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="W01","W01 persisted");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==reloadDetail,"W01 ammo, animation evidence and alternatives retained");
        var feintDetail=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"m14-cover-feint.json"));
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=141,profileId="a",name="Test PMC",feature="M14",decision="CoverFeint",stage="evaluated",reason="feint-weapon-ready-hold-approach",time=141,detail=feintDetail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="M14","M14 persisted");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==feintDetail,"M14 movement, sound evidence and alternatives retained");
        var relocationDetail=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"m13-outdoor-relocation.json"));
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=140,profileId="a",name="Test PMC",feature="M13",decision="OutdoorRelocation",stage="evaluated",reason="relocate-native-cover-move",time=140,detail=relocationDetail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="M13","M13 persisted");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==relocationDetail,"M13 destination, alternatives and observed movement retained");
        var tacticalJumpDetail=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"m12-tactical-jump.json"));
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=139,profileId="a",name="Test PMC",feature="M12",decision="TacticalJump",stage="evaluated",reason="jump-takeoff-observed",time=139,detail=tacticalJumpDetail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="M12","M12 persisted");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==tacticalJumpDetail,"M12 request, flight and actual shots survive storage");
        var weaveDetail=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"m11-retreat-weave.json"));
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=138,profileId="a",name="Test PMC",feature="M11",decision="RetreatWeave",stage="evaluated",reason="weave-running-from-known-threat",time=138,detail=weaveDetail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="M11","M11 persisted");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==weaveDetail,"M11 requests and observed jumps survive storage");
        var adsDetail=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"m10-ads-travel.json"));
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=137,profileId="a",name="Test PMC",feature="M10",decision="AdsTravel",stage="evaluated",reason="ads-release-for-SeekCover",time=137,detail=adsDetail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="M10","M10 persisted");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==adsDetail,"M10 native wish and observed ADS survive storage");
        var travelDetail=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"m09-cover-travel.json"));
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=136,profileId="a",name="Test PMC",feature="M09",decision="CoverTravel",stage="evaluated",reason="travel-face-near-threat",time=136,detail=travelDetail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="M09","M09 persisted");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==travelDetail,"M09 route, exposure, requested and actual movement survive storage");
        var holdAngleDetail=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"m08-hold-angle.json"));
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=135,profileId="a",name="Test PMC",feature="M08",decision="HoldAngle",stage="evaluated",reason="hold-angle-safe-correction-selected",time=135,detail=holdAngleDetail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="M08","M08 feature persisted");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==holdAngleDetail,"M08 pose request, actual arrival, rays and alternatives survive storage");
        var prefireDetail=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"m06-corner-prefire.json"));
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=133,profileId="a",name="Test PMC",feature="M06",decision="CornerPrefire",stage="evaluated",reason="prefire-shot-observed",time=133,detail=prefireDetail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="M06","M06 feature persisted");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==prefireDetail,"M06 frozen aim and requested/accepted/actual shots survive persistence");
        var chaseDetail=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"m05-corner-chase.json"));
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=132,profileId="a",name="Test PMC",feature="M05",decision="CornerChase",stage="evaluated",reason="chase-route-requested",time=132,detail=chaseDetail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="M05","M05 feature persisted");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==chaseDetail,"M05 frozen contact and requested/observed jump survive persistence");
        var leanDetail=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"m04-combat-lean.json"));
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=131,profileId="a",name="Test PMC",feature="M04",decision="CombatLean",stage="evaluated",reason="lean-held-side",time=131,detail=leanDetail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="M04","M04 feature persisted");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==leanDetail,"M04 requested lean and actual head movement retained");
        var cornerDetail=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"m03-corner-peek.json"));
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=130,profileId="a",name="Test PMC",feature="M03",decision="CornerPeek",stage="evaluated",reason="corner-exposure-observed",time=130,detail=cornerDetail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="M03","M03 feature persisted");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==cornerDetail,"M03 actual motion, cover and shot evidence retained");
        var pauseDetail=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"m02-fire-pause.json"));
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=129,profileId="a",name="Test PMC",feature="M02",decision="FirePause",stage="evaluated",reason="pause-stop-observed",time=129,detail=pauseDetail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="M02","M02 feature persisted");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==pauseDetail,"M02 stop evidence and shot counts retained");
        var moveDetail=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"m01-combat-step.json"));
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=128,profileId="a",name="Test PMC",feature="M01",decision="CombatStep",stage="evaluated",reason="movement-step-requested",time=128,detail=moveDetail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="M01","M01 feature persisted");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==moveDetail,"M01 actual movement and known contact retained");
        var ramDetail=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"d15-door-entry.json"));
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=127,profileId="a",name="Test PMC",feature="D15",decision="DoorEntry",stage="evaluated",reason="entry-crossing",time=127,detail=ramDetail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="D15","D15 feature persisted");
        Check(db.LastArgs.Single(a=>a.Item1=="$stage").Item2.ToString()=="evaluated","D15 entry context is not an action label");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==ramDetail,"D15 native request, animation and crossing observations retained");
        var reservationDetail=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"d14-door-reservation.json"));
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=126,profileId="a",name="Test PMC",feature="D14",decision="DoorReservation",stage="evaluated",reason="reservation-validated",time=126,detail=reservationDetail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="D14","D14 feature persisted");
        Check(db.LastArgs.Single(a=>a.Item1=="$stage").Item2.ToString()=="evaluated","D14 reservation is not an action label");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==reservationDetail,"D14 owner, token, phase, deadline and observation retained");
        var emergencyDetail=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"d13-door-emergency.json"));
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=125,profileId="a",name="Test PMC",feature="D13",decision="DoorEmergency",stage="evaluated",reason="visible-danger-weapon-unavailable",time=125,detail=emergencyDetail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="D13","D13 feature persisted");
        Check(db.LastArgs.Single(a=>a.Item1=="$stage").Item2.ToString()=="evaluated","D13 context separate from action ownership");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==emergencyDetail,"D13 evidence, actual movement, hands and alternatives persisted");
        var interruptionDetail=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"d12-door-interruption.json"));
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=124,profileId="a",name="Test PMC",feature="D12",decision="DoorInterruption",stage="evaluated",reason="safe-stage-resumed",time=124,detail=interruptionDetail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="D12","D12 feature persisted");
        Check(db.LastArgs.Single(a=>a.Item1=="$stage").Item2.ToString()=="evaluated","D12 resume context separate from action ownership");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==interruptionDetail,"D12 remaining original budget, evidence and consumed actions persisted");
        var supportDetail=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"d11-door-support.json"));
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=123,profileId="a",name="Test PMC",feature="D11",decision="DoorSupport",stage="evaluated",reason="support-angle-confirmed",time=123,detail=supportDetail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="D11","D11 feature persisted");
        Check(db.LastArgs.Single(a=>a.Item1=="$stage").Item2.ToString()=="evaluated","D11 observation does not invent action ownership");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==supportDetail,"D11 role, leader link, actual angle and route persisted");
        var holdDetail = File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"d10-door-hold.json"));
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=122,profileId="a",name="Test PMC",feature="D10",decision="DoorHold",stage="evaluated",reason="ambush-watching-exit",time=122,detail=holdDetail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="D10","D10 feature persisted");
        Check(db.LastArgs.Single(a=>a.Item1=="$stage").Item2.ToString()=="evaluated","D10 context does not fabricate action ownership");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==holdDetail,"D10 geometry observations, timer and settings persisted");
        var ambushDetail = File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"d09-door-ambush.json"));
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=121,profileId="a",name="Test PMC",feature="D09",decision="DoorAmbush",stage="evaluated",reason="ambush-watching-exit",time=121,detail=ambushDetail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="D09","D09 feature persisted");
        Check(db.LastArgs.Single(a=>a.Item1=="$stage").Item2.ToString()=="evaluated","D09 context does not fabricate action ownership");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==ambushDetail,"D09 geometry observations, timer and settings persisted");
        var searchClearDetail = File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"d08-door-search.json"));
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=120,profileId="a",name="Test PMC",feature="D08",decision="DoorSearchClear",stage="evaluated",reason="clear-entry-arrival-confirmed",time=120,detail=searchClearDetail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="D08","D08 feature persisted");
        Check(db.LastArgs.Single(a=>a.Item1=="$stage").Item2.ToString()=="evaluated","D08 preparation does not fabricate action ownership");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==searchClearDetail,"D08 faded chance, mode, contact and shared settings persisted");
        const string clearDetail = """{"doorRoomClear":{"state":"completed","reason":"clear-entry-arrival-confirmed","door":"door","target":"enemy","source":"heard","personality":"Chad","chance":30,"roll":0,"variantRoll":0,"variant":"grenade","contactAge":1,"knownX":0,"knownY":0,"knownZ":5,"x":0,"y":0,"z":2,"coveredDestination":true,"doorOpenObserved":true,"feintAttempted":false,"feint":"none","feintOutcome":"not-attempted","throwRequested":true,"throwAccepted":true,"grenadeItem":"grenade","projectile":5,"projectileObserved":true,"explosionConfirmed":true,"grenadeOutcome":"explosion-confirmed","dangerRadius":8,"blastPause":0.5,"fuseEstimate":3.5,"movementRequested":true,"movementAccepted":true,"movementObserved":true,"thresholdCrossed":true,"arrived":true,"weaponReady":true,"elapsed":6.099999999999994,"validFor":1.5,"alternatives":["Direct entry: eligible","Grenade entry: eligible","Resume native combat/search if the selected plan becomes invalid"]},"doorRoomClearConfig":{"enabled":true,"chances":{"GigaChad":40,"Chad":30,"Wreckless":35,"Normal":15,"Rat":0,"SnappingTurtle":0,"Coward":0,"Timmy":0},"contactLifetime":10,"grenadePreference":50,"allowFeint":true,"minimumAmmo":50,"minimumStamina":35,"depthMin":2,"depthMax":3,"blastPauseMin":0.3,"blastPauseMax":0.7,"targetCooldown":60}}""";
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=119,profileId="a",name="Test PMC",feature="D07",decision="DoorRoomClear",stage="evaluated",reason="clear-entry-arrival-confirmed",time=119,detail=clearDetail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="D07","D07 feature persisted");
        Check(db.LastArgs.Single(a=>a.Item1=="$stage").Item2.ToString()=="evaluated","D07 native movement does not invent action ownership");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==clearDetail,"D07 projectile, arrival proof and full settings persisted");
        const string medicalDetail = """{"doorFakeGrenadeConfig":{"enabled":true,"chances":{"GigaChad":30,"Chad":20,"Normal":10,"Wreckless":5,"Rat":0,"SnappingTurtle":0,"Coward":0,"Timmy":0},"doorDistance":3,"contactDistance":10,"contactLifetime":15,"targetCooldown":60,"cooldown":20},"doorFakeMedical":{"state":"holstering","reason":"fake-medical-stop-requested","interrupted":"","door":"test-door","target":"known","source":"heard","personality":"Chad","grenade":"","weapon":"rifle","reaction":"not-observed","chance":20,"roll":12,"knownX":0,"knownY":0,"knownZ":4,"contactAge":3,"elapsed":0.5,"coverVerified":true,"drawRequested":true,"callbackCompleted":true,"callbackSucceeded":true,"handsObserved":true,"holsterRequested":true,"holsterAccepted":false,"weaponReady":false,"guard":false,"recoveryFailed":false,"holsterAttempts":1,"validFor":1.5,"alternatives":["Normal SAIN search"],"kind":"heal","medicalPreference":50,"styleRoll":12,"grenadeEligible":true,"medicalEligible":"heal","medical":{"kind":"heal","item":"med-kit","bodyPart":"LeftArm","resourceBefore":100,"resourceAfter":100,"consumptionObserved":false,"consumptionEvidence":"not-observed","useCallbackCompleted":false,"useCallbackSucceeded":false,"nativeStopRequested":true,"medicalHandoff":false,"cooldownRestored":true}},"doorFakeMedicalConfig":{"enabled":true,"stimulators":true,"preference":50}}""";
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=118,profileId="a",name="Test PMC",feature="D06",decision="DoorFakeMedical",stage="evaluated",reason="fake-medical-stop-requested",time=118,detail=medicalDetail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="D06","D06 feature persisted");
        Check(db.LastArgs.Single(a=>a.Item1=="$stage").Item2.ToString()=="evaluated","D06 does not invent native decision ownership");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==medicalDetail,"D06 medical evidence and shared settings preserved");
        const string fakeDetail = """{"doorFakeGrenade":{"state":"holstering","reason":"fake-holster-accepted","interrupted":"","door":"test-door","target":"known","source":"heard","personality":"Chad","grenade":"nade","weapon":"rifle","reaction":"not-observed","chance":20,"roll":12,"knownX":0,"knownY":0,"knownZ":4,"contactAge":3,"elapsed":0.5,"coverVerified":true,"drawRequested":true,"callbackCompleted":true,"callbackSucceeded":true,"handsObserved":true,"holsterRequested":true,"holsterAccepted":true,"weaponReady":false,"guard":true,"recoveryFailed":false,"holsterAttempts":1,"validFor":1.5,"alternatives":["Normal SAIN search"]},"doorFakeGrenadeConfig":{"enabled":true,"chances":{"GigaChad":30,"Chad":20,"Normal":10,"Wreckless":5,"Rat":0,"SnappingTurtle":0,"Coward":0,"Timmy":0},"doorDistance":3,"contactDistance":10,"contactLifetime":15,"targetCooldown":60,"cooldown":20}}""";
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=117,profileId="a",name="Test PMC",feature="D05",decision="DoorFakeGrenade",stage="evaluated",reason="fake-holster-accepted",time=117,detail=fakeDetail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="D05","D05 feature persisted");
        Check(db.LastArgs.Single(a=>a.Item1=="$stage").Item2.ToString()=="evaluated","D05 does not claim native decision ownership");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==fakeDetail,"D05 hands evidence, recovery and settings preserved");
        const string stepDetail = """{"doorStepPeek":{"state":"observing","reason":"step-arrival-observed","parent":"D02","door":"test-door","target":"known","source":"heard","personality":"Chad","purpose":"check-known-side-of-opening","chance":50,"roll":12,"peek":1,"completed":0,"knownX":0,"knownY":0,"knownZ":4,"contactAge":3,"stackX":-1.2,"stackY":0,"stackZ":-0.9,"pointX":-0.4,"pointY":0,"pointZ":-0.9,"lookX":0.3,"lookY":1.3,"lookZ":0.6,"actualX":-0.4,"actualY":0,"actualZ":-0.9,"pose":1,"actualPose":1,"poseObserved":true,"movementAccepted":true,"movementObserved":true,"arrived":true,"returnAccepted":false,"returned":false,"looking":true,"visualAcquired":false,"observation":0.2,"requiredObservation":0.6,"rest":0,"requiredRest":0.7,"elapsed":0.6,"remaining":5.4,"validFor":1.5,"alternatives":["Second angle must differ","Normal SAIN search remains available"]},"doorStepPeekConfig":{"enabled":true,"chance":50,"maximumPeeks":2,"distance":0.8,"observationMin":0.4,"observationMax":0.8,"restMin":0.5,"restMax":1,"limit":6,"varyPosture":true}}""";
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=116,profileId="a",name="Test PMC",feature="D04",decision="DoorStepPeek",stage="evaluated",reason="step-arrival-observed",time=116,detail=stepDetail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="D04","D04 feature persisted");
        Check(db.LastArgs.Single(a=>a.Item1=="$stage").Item2.ToString()=="evaluated","D04 retains native action colors");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==stepDetail,"D04 posture, motion, view, return and config persisted");
        const string runDetail = """{"doorRunBy":{"state":"across","reason":"run-by-movement-accepted","style":"run-by","door":"test-door","target":"known","source":"heard","personality":"Chad","chance":25,"roll":12,"styleRoll":20,"preference":40,"jumpEligible":true,"runEligible":true,"jumpReason":"","runReason":"","knownX":0,"knownY":0,"knownZ":4,"contactAge":3,"stamina":50,"forwardSpeed":3,"distanceMoved":1,"elapsed":0.5,"remaining":5.5,"turnElapsed":0,"watchElapsed":0,"doorOpenObserved":true,"movementAccepted":true,"sprintObserved":true,"farArrived":false,"sprintExitObserved":false,"returnAccepted":false,"returned":false,"visualAcquired":false,"validFor":1.5,"alternatives":["Jump: eligible","Run-by: eligible","Normal SAIN search"]},"doorReconConfig":{"cooldown":45,"chances":{"Chad":25}},"doorRunByConfig":{"enabled":true,"preference":40,"fallback":true,"minimumStamina":35,"turnDelay":0.35,"limit":6,"watch":2}}""";
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=115,profileId="a",name="Test PMC",feature="D03",decision="DoorRunBy",stage="evaluated",reason="run-by-movement-accepted",time=115,detail=runDetail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="D03","D03 feature persisted");
        Check(db.LastArgs.Single(a=>a.Item1=="$stage").Item2.ToString()=="evaluated","D03 cannot replace native behavior colors");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==runDetail,"D03 opportunity, physical observations and config persisted");
        const string jumpDetail = """{"doorJumpPeek":{"state":"airborne","reason":"peek-takeoff-observed","door":"test-door","target":"known","source":"heard","personality":"Normal","chance":10,"roll":5,"knownX":0,"knownY":0,"knownZ":3,"contactAge":3,"stamina":50,"forwardSpeed":1.4,"runUpDistance":0.3,"elapsed":0.5,"remaining":3.5,"observationElapsed":0,"doorOpenObserved":true,"movementAccepted":true,"jumpRequested":true,"takeoffObserved":true,"landingObserved":false,"visualAcquired":false,"returned":false,"validFor":1.5,"alternatives":["Normal SAIN search remains available."]},"doorJumpPeekConfig":{"enabled":true,"minimumStamina":35,"minimumSpeed":1.2,"observation":0.4,"limit":4,"cooldown":45,"returnJump":false}}""";
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=114,profileId="a",name="Test PMC",feature="D02",decision="DoorJumpPeek",stage="evaluated",reason="peek-takeoff-observed",time=114,detail=jumpDetail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="D02","D02 packet feature preserved");
        Check(db.LastArgs.Single(a=>a.Item1=="$stage").Item2.ToString()=="evaluated","D02 does not replace native action colors");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==jumpDetail,"D02 physical evidence and defaults persist");
        const string doorDetail = """{"doorApproach":{"state":"approaching","reason":"door-approaching","target":"known","source":"heard","door":"test-door","side":"right","knownX":0,"knownY":0,"knownZ":3,"contactAge":3,"x":1.2,"y":0,"z":-0.9,"pathLength":4,"elapsed":1,"remaining":11,"requested":true,"movementAccepted":true,"moved":true,"arrived":false,"validFor":1.5,"candidates":[{"door":"nearest","side":"left","eligible":false,"reason":"door-point-occupied"},{"door":"test-door","side":"right","eligible":true,"reason":"door-reachable-protected-frame","pathLength":4,"score":4}]},"doorApproachConfig":{"enabled":true,"doorDistance":8,"contactDistance":12,"unseenDelay":1.5,"contactLifetime":60,"approachLimit":12}}""";
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=113,profileId="a",name="Test PMC",feature="D01",decision="DoorApproach",stage="evaluated",reason="door-approaching",time=113,detail=doorDetail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="D01","D01 packet feature preserved");
        Check(db.LastArgs.Single(a=>a.Item1=="$stage").Item2.ToString()=="evaluated","D01 sub-action does not replace Search ownership");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==doorDetail,"D01 alternatives, known contact and movement evidence persisted");
        const string environmentDetail = """{"environmentContext":{"reported":"outdoor","source":"ai-zone+eft-environment","aiIndoorZone":false,"eftIndoor":false,"conflict":false,"age":0.1,"ceiling":"detected","ceilingHeight":3,"ceilingAge":0.1,"checkedDistance":20,"probeReason":"overhead-surface","purpose":"grenade-preparation","influence":"observation-only","validFor":0.4},"environmentConfig":{"enabled":true,"refresh":0.5,"movement":1,"ceilingDistance":20}}""";
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=112,profileId="a",name="Test PMC",feature="P10",decision="EnvironmentContext",stage="evaluated",reason="environment-observed",time=112,detail=environmentDetail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="P10","P10 packet feature preserved");
        Check(db.LastArgs.Single(a=>a.Item1=="$stage").Item2.ToString()=="evaluated","P10 context is not action ownership");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==environmentDetail,"P10 sources, age, ceiling and config preserved");
        const string abandonmentDetail = """{"searchAbandonment":{"state":"abandoned","reason":"search-check-position-empty","target":"known","silence":23,"requiredSilence":20,"inspected":3,"requiredInspection":3,"distance":2,"memoryRemaining":30,"validFor":3,"interruptions":1,"forgetRequested":true,"forgetObserved":true},"searchAbandonmentConfig":{"enabled":true,"silence":20,"inspection":3,"radius":3,"failedMemory":30}}""";
        await Packet("COMET_DECISION",new {sessionId="s",cometSession="comet-1",sequence=111,profileId="a",name="Test PMC",feature="P09",decision="SearchAbandonment",stage="evaluated",reason="search-check-position-empty",time=111,detail=abandonmentDetail});
        Check(db.LastArgs.Single(a=>a.Item1=="$feature").Item2.ToString()=="P09","P09 packet feature preserved");
        Check(db.LastArgs.Single(a=>a.Item1=="$stage").Item2.ToString()=="evaluated","P09 context does not own actions");
        Check(db.LastArgs.Single(a=>a.Item1=="$detail").Item2.ToString()==abandonmentDetail,"P09 timers, request, confirmation and config preserved");
        var positions=new[]{new TrackingPlayerData("s","a",200,1,2,3,0,100,100,"Orbit:Guarding",true),new TrackingPlayerData("s","b",200,4,5,6,270,90,100) { bodyYaw=270 }};
        await Packet("POSITION_BATCH",positions);
        Check(files.Writes.Count==1,"one buffered write per batch");
        var batch=files.Writes[0];
        files.Contents["orientation_positions"] = batch.Header + batch.Rows;
        var compiler = new RaidReview.PostRaid.RaidPositionCompiler(files,log);
        var compiled = compiler.Compile("orientation")!;
        Check(compiled["a"][0].BodyYaw==null && compiled["a"][0].Ghost, "Ghost first row keeps column alignment");
        Check(compiled["b"][0].BodyYaw==270 && compiled["b"][0].Health==90, "awake orientation survives client, WS batch and CSV compiler");
        var replay=JObject.Parse(files.Contents["orientation_V4_positions.json"]);
        Check(replay["b"]![0]!.Value<float>("bodyYaw")==270 && replay["a"]![0]!["bodyYaw"]!.Type==JTokenType.Null, "camelCase replay retains nullable yaw");
        files.Contents["legacy_positions"]="profileId,time,x,y,z,dir,raid_id,ghost\na,0,1,2,3,170,r,false\n";
        Check(compiler.Compile("legacy")!["a"][0].BodyYaw==null, "legacy dir never becomes body orientation");
        files.Contents["invalid_positions"]="profileId,time,x,y,z,dir,raid_id,bodyYaw,ghost\na,0,1,2,3,0,r,NaN,false\na,1,1,2,3,0,r,Infinity,false\na,2,1,2,3,0,r,-90,false\na,3,1,2,3,0,r,360,false\na,4,1,2,3,0,r,90,true\na,5,1,2,3,0,r,,false\n";
        var invalid = compiler.Compile("invalid")!["a"];
        Check(invalid.Select(p=>p.BodyYaw).SequenceEqual(new float?[] { null,null,270,0,null,null }), "nonfinite, missing and Ghost angles suppressed; valid angles normalized");
        await Packet("POSITION",positions[0]);await Packet("POSITION",positions[1]);
        Check(files.Writes[1].Header==batch.Header,"old and new header match");
        Check(files.Writes[1].Rows+files.Writes[2].Rows==batch.Rows,"sample schema, timestamps and ghost flag preserved");
        await Packet("POSITION_BATCH",Array.Empty<TrackingPlayerData>());
        Check(files.Writes.Count==3,"empty batch ignored");
        var other=new TrackingPlayerData("other","c",200,0,0,0,0,1,1);
        await Packet("POSITION_BATCH",new[]{positions[0],other});
        Check(files.Writes.Last().Rows==files.Writes[1].Rows,"cross session sample rejected");
        await Packet("AIRDROP_FLIGHT",new {sessionId="s",points=new[]{new {flightId="f",kind="end",dropId="",time=201,x=0,y=1,z=2,heading=3}}});
        Check(db.Sql.Any(s=>s.Contains("airdrop_flight")),"flight tail before END");
        foreach (var stage in new[] { "approach", "waiting", "loot" })
        {
            await Packet("ORBIT_MAIN_OBJECTIVES", new TrackingOrbitMainObjectives { sessionId="s", time=202,
                squads=new() { new() { squadId=3, memberProfileIds=new() { "a" }, mainObjectives=new() {
                    new() { type="Airdrop", airdropId="drop-1", airdropStage=stage, airdropLanded=stage=="loot",
                        campElapsed=20, campTargetDuration=60, x=10, y=2, z=30 } } } } });
            var wire=JArray.Parse((string)db.LastArgs.Single(a=>a.Item1=="$squads").Item2);
            var main=wire[0]["mainObjectives"][0];
            Check((string)main["type"]=="Airdrop" && (string)main["airdropStage"]==stage && (string)main["airdropId"]=="drop-1",
                "temporary objective stage and identity survive client serialization and server handler");
            Check((bool)main["airdropLanded"]==(stage=="loot") && (int)main["campTargetDuration"]==60,
                "landing gate and hold duration survive wire");
        }
        await Packet("ORBIT_MAIN_OBJECTIVES", new TrackingOrbitMainObjectives { sessionId="s", time=203, squads=new() });
        Check((string)db.LastArgs.Single(a=>a.Item1=="$squads").Item2=="[]","empty snapshot persisted to clear last temporary objective");
        var postProcess=false;handler.SetPostProcessingCallbacks(_=>{Check(files.Flushed,"flush before post processing");postProcess=true;},()=>{});
        await Packet("END",new {sessionId="s"});
        Check(postProcess && sessions.GetProfile("s").RaidId==null,"END closes first raid");
        await Packet("START",new {sessionId="s",profileId="s"});
        await Packet("POSITION_BATCH",positions);
        Check(files.Writes.Last().File!=batch.File,"next raid has own position stream");
        Check(log.Errors.Count==0,"no handler errors");
    }
}
