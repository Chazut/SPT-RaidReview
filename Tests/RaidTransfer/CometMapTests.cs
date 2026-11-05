using System.Text.Json;
using RaidReview.Database;

internal static class CometMapTests
{
    internal static async Task Run(HttpClient client, DatabaseService db, string raidId, Action<bool,string> check)
    {
        const string session = "map-fixture";
        const string detail = """{"botInstance":"one","quiet":{"state":"crouch","action":"Search","applied":true,"active":true,"validFor":1.5,"used":3,"remaining":17,"chance":0.7,"roll":0.1},"hearing":{"signal":42,"source":"enemy","kind":"Sprint","outcome":"heard","age":0.3,"distance":14,"x":1,"y":2,"z":3},"handoff":{"state":"native-observed","reason":"no-feasible-option","fromAction":"Search","nativeCombat":"Retreat","nativeObserved":true,"retryRemaining":0.8},"progress":{"state":"blocked","reason":"progress-stalled","holdSeconds":14,"stalledSeconds":5,"retryRemaining":8,"failures":1,"reconsider":true},"coverResponse":{"state":"return-fire","reason":"cover-response-exposed-crossing","pathLength":8,"eta":3.4,"fastEta":2.1,"exposedSeconds":3.1,"fastExposedSeconds":1.9,"shootDelta":20,"coverDelta":-20},"opportunity":{"episode":1,"cue":"surgery","state":"usable","heardAt":10,"age":2,"remaining":10,"eta":3,"pathLength":8,"bonus":20},"opponent":{"target":"enemy","state":"estimated","evidence":[{"kind":"weapon","value":"shotgun","source":"seen-hands","age":2,"confidence":0.48}]},"loadout":{"state":"ready","weapon":"MP7","idealRange":12,"grenades":3,"resourcesKnown":true,"canFirstAid":true},"config":{"privateMarker":"not-for-map"},"contact":{"age":2,"source":"heard"},"visible":{"coverRouteRisk":0.2,"knownThreats":2},"fear":{"level":0.8,"target":0.9,"panic":true,"transition":"panic-enter","panicChangedAt":9,"at":10,"injury":0.125,"allyDeath":0.29,"outnumbered":0.15,"suppression":0.1,"scoreCap":15},"mixing":{"mistake":{"state":"mistake-selected","best":"Shoot","before":"Shoot","selected":"Cover","bestScore":80,"selectedScore":66,"scoreLoss":0.175,"chance":0.05,"roll":0.02,"at":10,"nextAllowedAt":20,"seed":"a05abcd","drawIndex":1},"state":"weighted-roll","seed":"1234abcd","roll":0.7,"options":[{"decision":"Cover","score":76,"probability":0.24}]},"candidates":[{"decision":"Search","score":50,"eligible":true}]}""";
        const string continuity = """{"botInstance":"one","contact":{"age":0.1,"source":"seen","x":4,"y":2,"z":1},"continuity":{"remaining":0.7,"lostFor":0.1,"fireAuthorized":false}}""";
        try
        {
            var restFixture=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"l03-rest-lights.json"));
            await db.ExecuteAsync("""
                INSERT INTO comet_decision (raidId,time,cometSession,sequence,profileId,name,feature,decision,stage,reason,detail)
                VALUES ($raid,5200,$session,187,'map-l03','Example','L03','RestLights','evaluated','rest-switch-off-confirmed',$detail)
                """, ("$raid",raidId),("$session",session),("$detail",restFixture));
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?compact=true&profileId=map-l03&search=L03"))) {
                var d=doc.RootElement.GetProperty("events")[0].GetProperty("detail");var m=d.GetProperty("restLights");
                check(m.GetProperty("requested").GetBoolean()&&m.GetProperty("observedOff").GetBoolean(),"L03 request and observation retained");
                check(m.GetProperty("owner").GetString()=="ORBIT"&&m.GetProperty("validFor").GetDouble()==.75,"L03 evidence and expiry retained");
                check(m.GetProperty("accessories")[0].GetProperty("name").GetString()=="SureFire X400"&&m.GetProperty("accessories")[1].GetProperty("name").GetString()=="AN/PEQ-15","L03 localized accessory names retained in compact map API");
                check(!d.TryGetProperty("restLightsConfig",out _),"L03 repeated configuration omitted");
            }
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?profileId=map-l03")))
                check(doc.RootElement.GetProperty("events")[0].GetProperty("detail").GetString()==restFixture,"L03 full diagnostic retained");
            var accessories=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"l02-tactical-devices.json"));
            await db.ExecuteAsync("""
                INSERT INTO comet_decision (raidId,time,cometSession,sequence,profileId,name,feature,decision,stage,reason,detail)
                VALUES ($raid,5200,$session,186,'map-l02','Example','L02','TacticalDevices','evaluated','devices-confirmed',$detail)
                """, ("$raid",raidId),("$session",session),("$detail",accessories));
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?compact=true&profileId=map-l02&search=L02"))) {
                var d=doc.RootElement.GetProperty("events")[0].GetProperty("detail");var m=d.GetProperty("tacticalDevices");
                check(m.GetProperty("requested").GetBoolean()&&m.GetProperty("observed").GetBoolean(),"L02 request and observation retained");
                check(m.GetProperty("source").GetString()=="SAIN"&&m.GetProperty("validFor").GetDouble()==1,"L02 evidence and expiry retained");
                check(m.GetProperty("accessories")[0].GetProperty("name").GetString()=="SureFire X400"&&m.GetProperty("accessories")[1].GetProperty("name").GetString()=="AN/PEQ-15","L02 localized accessory names retained in compact map API");
                check(!d.TryGetProperty("tacticalDevicesConfig",out _),"L02 repeated configuration omitted");
            }
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?profileId=map-l02")))
                check(doc.RootElement.GetProperty("events")[0].GetProperty("detail").GetString()==accessories,"L02 full diagnostic retained");
            var light=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"l01-light-discipline.json"));
            await db.ExecuteAsync("""
                INSERT INTO comet_decision (raidId,time,cometSession,sequence,profileId,name,feature,decision,stage,reason,detail)
                VALUES ($raid,5200,$session,185,'map-l01','Example','L01','LightDiscipline','evaluated','light-tactical-concealment',$detail)
                """, ("$raid",raidId),("$session",session),("$detail",light));
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?compact=true&profileId=map-l01&search=L01"))) {
                var d=doc.RootElement.GetProperty("events")[0].GetProperty("detail");var m=d.GetProperty("lightDiscipline");
                check(m.GetProperty("requested").GetBoolean()&&m.GetProperty("observedOff").GetBoolean(),"L01 request and observation retained");
                check(m.GetProperty("source").GetString()=="personal-hearing"&&m.GetProperty("validFor").GetDouble()==.8,"L01 evidence and expiry retained");
                check(!d.TryGetProperty("lightDisciplineConfig",out _),"L01 repeated configuration omitted");
            }
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?profileId=map-l01")))
                check(doc.RootElement.GetProperty("events")[0].GetProperty("detail").GetString()==light,"L01 full diagnostic retained");
            var voice=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"s09-squad-voice.json"));
            await db.ExecuteAsync("""
                INSERT INTO comet_decision (raidId,time,cometSession,sequence,profileId,name,feature,decision,stage,reason,detail)
                VALUES ($raid,5200,$session,184,'map-s09','Example','S09','SquadVoice','evaluated','squad-voice-squad-delay',$detail)
                """, ("$raid",raidId),("$session",session),("$detail",voice));
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?compact=true&profileId=map-s09&search=S09"))) {
                var d=doc.RootElement.GetProperty("events")[0].GetProperty("detail");var m=d.GetProperty("squadVoice");
                check(m.GetProperty("filtered").GetBoolean()&&!m.GetProperty("played").GetBoolean(),"S09 filtered is not played");
                check(m.GetProperty("mode").GetString()=="Reduced"&&m.GetProperty("validFor").GetDouble()==2,"S09 mode and bounded map context retained");
                check(!d.TryGetProperty("squadVoiceConfig",out _),"S09 repeated configuration omitted");
            }
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?profileId=map-s09")))
                check(doc.RootElement.GetProperty("events")[0].GetProperty("detail").GetString()==voice,"S09 full diagnostic retained");
            var squad=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"s08-squad-fire.json"));
            await db.ExecuteAsync("""
                INSERT INTO comet_decision (raidId,time,cometSession,sequence,profileId,name,feature,decision,stage,reason,detail)
                VALUES ($raid,5200,$session,183,'map-s08','Example','S08','SquadFire','evaluated','squad-fire-body-in-line',$detail)
                """, ("$raid",raidId),("$session",session),("$detail",squad));
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?compact=true&profileId=map-s08&search=S08"))) {
                var d=doc.RootElement.GetProperty("events")[0].GetProperty("detail");var m=d.GetProperty("squadFire");
                check(m.GetProperty("startPrevented").GetBoolean()&&m.GetProperty("state").GetString()=="blocked","S08 prevented trigger retained");
                check(m.GetProperty("ally").GetString()=="mate"&&m.GetProperty("prediction").GetDouble()==.3,"S08 squad crossing evidence retained");
                check(!d.TryGetProperty("squadFireConfig",out _),"S08 repeated configuration omitted");
            }
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?profileId=map-s08")))
                check(doc.RootElement.GetProperty("events")[0].GetProperty("detail").GetString()==squad,"S08 full diagnostic retained");
            var lane=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"s07-fire-lane.json"));
            await db.ExecuteAsync("""
                INSERT INTO comet_decision (raidId,time,cometSession,sequence,profileId,name,feature,decision,stage,reason,detail)
                VALUES ($raid,5200,$session,182,'map-s07','Example','S07','FireLane','evaluated','lane-clear-shooters-axis',$detail)
                """, ("$raid",raidId),("$session",session),("$detail",lane));
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?compact=true&profileId=map-s07&search=S07"))) {
                var d=doc.RootElement.GetProperty("events")[0].GetProperty("detail");var m=d.GetProperty("fireLane");
                check(m.GetProperty("confirmed").GetBoolean()&&m.GetProperty("state").GetString()=="stepping","S07 observed movement retained");
                check(m.GetProperty("shooter").GetString()=="shooter"&&m.GetProperty("shotAge").GetDouble()>=0,"S07 real shot evidence retained");
                check(!d.TryGetProperty("fireLaneConfig",out _),"S07 repeated configuration omitted");
            }
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?profileId=map-s07")))
                check(doc.RootElement.GetProperty("events")[0].GetProperty("detail").GetString()==lane,"S07 full diagnostic retained");
            var storm=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"s06-squad-storm.json"));
            await db.ExecuteAsync("""
                INSERT INTO comet_decision (raidId,time,cometSession,sequence,profileId,name,feature,decision,stage,reason,detail)
                VALUES ($raid,5100,$session,181,'map-s06','Example','S06','Crossfire','evaluated','storm-common-departure',$detail)
                """, ("$raid",raidId),("$session",session),("$detail",storm));
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?compact=true&profileId=map-s06&search=S06"))) {
                var d=doc.RootElement.GetProperty("events")[0].GetProperty("detail");var m=d.GetProperty("crossfire").GetProperty("storm");
                check(m.GetProperty("confirmed").GetBoolean()&&m.GetProperty("status").GetString()=="moving","S06 actual movement retained");
                check(m.GetProperty("evidence").GetArrayLength()>0&&m.GetProperty("members").GetArrayLength()==2,"S06 squad and perceived evidence retained");
                check(m.GetProperty("departure").GetDouble()>=0,"S06 departure retained");
                check(!d.TryGetProperty("squadStormConfig",out _),"S06 repeated configuration omitted");
            }
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?profileId=map-s06")))
                check(doc.RootElement.GetProperty("events")[0].GetProperty("detail").GetString()==storm,"S06 full diagnostic retained");
            var trade=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"s05-squad-trade.json"));
            await db.ExecuteAsync("""
                INSERT INTO comet_decision (raidId,time,cometSession,sequence,profileId,name,feature,decision,stage,reason,detail)
                VALUES ($raid,5000,$session,180,'map-s05','Example','S05','Crossfire','evaluated','trade-watch-reserved',$detail)
                """, ("$raid",raidId),("$session",session),("$detail",trade));
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?compact=true&profileId=map-s05&search=S05"))) {
                var d=doc.RootElement.GetProperty("events")[0].GetProperty("detail");var m=d.GetProperty("crossfire").GetProperty("trade");
                check(m.GetProperty("confirmed").GetBoolean()&&m.GetProperty("status").GetString()=="watching","S05 actual watching retained");
                check(m.GetProperty("death").GetString()=="loss-1"&&m.GetProperty("mateName").GetString()=="Lost teammate","S05 death evidence retained");
                check(!d.TryGetProperty("squadTradeConfig",out _),"S05 repeated configuration omitted");
            }
            var care=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"s04-cover-mate.json"));
            await db.ExecuteAsync("""
                INSERT INTO comet_decision (raidId,time,cometSession,sequence,profileId,name,feature,decision,stage,reason,detail)
                VALUES ($raid,5000,$session,179,'map-s04','Example','S04','Crossfire','evaluated','cover-mate-sector-reserved',$detail)
                """, ("$raid",raidId),("$session",session),("$detail",care));
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?compact=true&profileId=map-s04&search=S04"))) {
                var d=doc.RootElement.GetProperty("events")[0].GetProperty("detail");var m=d.GetProperty("crossfire").GetProperty("coverMate");
                check(m.GetProperty("confirmed").GetBoolean()&&m.GetProperty("status").GetString()=="covering","S04 actual coverage retained in compact API");
                check(m.GetProperty("operation").GetString()=="care-1"&&m.GetProperty("treatment").GetString()=="Reload","S04 patient operation retained");
                check(!d.TryGetProperty("coverMateConfig",out _),"S04 repeated configuration omitted");
            }
            var maneuver=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"s03-squad-maneuver.json"));
            await db.ExecuteAsync("""
                INSERT INTO comet_decision (raidId,time,cometSession,sequence,profileId,name,feature,decision,stage,reason,detail)
                VALUES ($raid,5000,$session,178,'map-s03','Example','S03','Crossfire','evaluated','maneuver-active',$detail)
                """, ("$raid",raidId),("$session",session),("$detail",maneuver));
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?compact=true&profileId=map-s03&search=S03"))) {
                var d=doc.RootElement.GetProperty("events")[0].GetProperty("detail");var m=d.GetProperty("crossfire").GetProperty("maneuver");
                check(m.GetProperty("confirmed").GetBoolean()&&m.GetProperty("role").GetString()=="flank","S03 confirmation retained in compact API");
                check(m.GetProperty("members").GetArrayLength()==4,"S03 squad roles retained");
                check(!d.TryGetProperty("squadManeuverConfig",out _),"S03 repeated configuration omitted");
            }
            var entrance=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"s02-secondary-entrance.json"));
            await db.ExecuteAsync("""
                INSERT INTO comet_decision (raidId,time,cometSession,sequence,profileId,name,feature,decision,stage,reason,detail)
                VALUES ($raid,5000,$session,177,'map-s02','Example','S02','Crossfire','evaluated','secondary-entrance-entry-approved',$detail)
                """,("$raid",raidId),("$session",session),("$detail",entrance));
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?compact=true&profileId=map-s02&search=S02"))) {
                var d=doc.RootElement.GetProperty("events")[0].GetProperty("detail");var t=d.GetProperty("crossfire");var e=t.GetProperty("entrance");
                check(t.GetProperty("applied").GetBoolean()&&e.GetProperty("state").GetString()=="entering","S02 observed entry retained in compact map API");
                check(e.GetProperty("primary").GetString()!=e.GetProperty("passage").GetString(),"S02 distinct accesses retained");
                check(e.GetProperty("supportStatus").GetString()=="ready"&&e.GetProperty("rolled").GetBoolean(),"S02 readiness and entry roll retained");
                check(!d.TryGetProperty("secondaryEntranceConfig",out _),"S02 compact omits repeated settings");
            }
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?profileId=map-s02")))
                check(doc.RootElement.GetProperty("events")[0].GetProperty("detail").GetString()==entrance,"S02 full diagnostics preserved");
            var weaponReturn=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"w03-weapon-return.json"));
            await db.ExecuteAsync("""
                INSERT INTO comet_decision (raidId,time,cometSession,sequence,profileId,name,feature,decision,stage,reason,detail)
                VALUES ($raid,5000,$session,153,'map-w03','Example','W03','WeaponReturn','evaluated','weapon-target-in-hands',$detail)
                """,("$raid",raidId),("$session",session),("$detail",weaponReturn));
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?compact=true&profileId=map-w03&search=W03"))) {
                var d=doc.RootElement.GetProperty("events")[0].GetProperty("detail");var t=d.GetProperty("weaponReturn");
                check(t.GetProperty("inHands").GetBoolean()&&!t.GetProperty("ready").GetBoolean(),"W03 actual hands separate from readiness");
                check(t.GetProperty("loaded").GetInt32()==8&&t.GetProperty("targetLoaded").GetInt32()==25,"W03 per-weapon ammo retained");
                check(t.GetProperty("requested").GetBoolean()&&t.GetProperty("accepted").GetBoolean(),"W03 native acceptance retained");
                check(!d.TryGetProperty("weaponReturnConfig",out _),"W03 compact omits repeated config");
            }
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?profileId=map-w03")))
                check(doc.RootElement.GetProperty("events")[0].GetProperty("detail").GetString()==weaponReturn,"W03 full diagnostic roundtrip");
            var pistol=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"w02-pistol-swap.json"));
            await db.ExecuteAsync("""
                INSERT INTO comet_decision (raidId,time,cometSession,sequence,profileId,name,feature,decision,stage,reason,detail)
                VALUES ($raid,4999,$session,152,'map-w02','Example','W02','PistolSwap','evaluated','pistol-in-hands',$detail)
                """,("$raid",raidId),("$session",session),("$detail",pistol));
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?compact=true&profileId=map-w02&search=W02"))) {
                var d=doc.RootElement.GetProperty("events")[0].GetProperty("detail");var t=d.GetProperty("pistolSwap");
                check(t.GetProperty("inHands").GetBoolean()&&!t.GetProperty("ready").GetBoolean(),"W02 actual hands separate from readiness");
                check(t.GetProperty("mainLoaded").GetInt32()==1&&t.GetProperty("pistolLoaded").GetInt32()==10,"W02 per-weapon ammo retained");
                check(t.GetProperty("requested").GetBoolean()&&t.GetProperty("accepted").GetBoolean(),"W02 native acceptance retained");
                check(!d.TryGetProperty("pistolSwapConfig",out _),"W02 compact omits repeated config");
            }
            var quickReload=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"w04-quick-reload.json"));
            await db.ExecuteAsync("""
                INSERT INTO comet_decision (raidId,time,cometSession,sequence,profileId,name,feature,decision,stage,reason,detail)
                VALUES ($raid,5000,$session,154,'map-w04','Example','W04','QuickReload','evaluated','quick-drop-observed',$detail)
                """,("$raid",raidId),("$session",session),("$detail",quickReload));
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?compact=true&profileId=map-w04&search=W04"))) {
                var d=doc.RootElement.GetProperty("events")[0].GetProperty("detail");var t=d.GetProperty("quickReload");
                check(t.GetProperty("dropped").GetBoolean()&&!t.GetProperty("finished").GetBoolean(),"W04 physical drop separate from completion");
                check(t.GetProperty("oldRounds").GetInt32()==6&&t.GetProperty("replacementRounds").GetInt32()==30,"W04 magazine ammo retained");
                check(t.GetProperty("requested").GetBoolean()&&t.GetProperty("started").GetBoolean(),"W04 native animation retained");
                check(!d.TryGetProperty("quickReloadConfig",out _),"W04 compact omits repeated config");
            }
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?profileId=map-w04")))
                check(doc.RootElement.GetProperty("events")[0].GetProperty("detail").GetString()==quickReload,"W04 full diagnostic roundtrip");
            var trajectory=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"g02-grenade-trajectory.json"));
            await db.ExecuteAsync("""
                INSERT INTO comet_decision (raidId,time,cometSession,sequence,profileId,name,feature,decision,stage,reason,detail)
                VALUES ($raid,5000,$session,162,'map-g02','Example','G02','GrenadeTrajectory','evaluated','trajectory-execution-validated',$detail)
                """,("$raid",raidId),("$session",session),("$detail",trajectory));
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?compact=true&profileId=map-g02&search=G02"))) {
                var d=doc.RootElement.GetProperty("events")[0].GetProperty("detail");var t=d.GetProperty("grenadeTrajectory");
                check(t.GetProperty("state").GetString()=="validated","G02 validation state retained");
                check(t.GetProperty("angle").GetDouble()>0&&t.GetProperty("alternatives").GetArrayLength()==4,"G02 angle and alternatives retained");
                check(t.GetProperty("source").GetString()=="seen","G02 personal evidence retained");
                check(!d.TryGetProperty("grenadeTrajectoryConfig",out _),"G02 compact omits repeated config");
            }
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?profileId=map-g02")))
                check(doc.RootElement.GetProperty("events")[0].GetProperty("detail").GetString()==trajectory,"G02 full diagnostic roundtrip");
            var judgment=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"g01-grenade-judgment.json"));
            await db.ExecuteAsync("""
                INSERT INTO comet_decision (raidId,time,cometSession,sequence,profileId,name,feature,decision,stage,reason,detail)
                VALUES ($raid,5000,$session,161,'map-g01','Example','G01','GrenadeJudgment','evaluated','grenade-native-accepted',$detail)
                """,("$raid",raidId),("$session",session),("$detail",judgment));
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?compact=true&profileId=map-g01&search=G01"))) {
                var d=doc.RootElement.GetProperty("events")[0].GetProperty("detail");var t=d.GetProperty("grenadeJudgment");
                check(t.GetProperty("accepted").GetBoolean()&&!t.GetProperty("released").GetBoolean(),"G01 acknowledgement is not a confirmed recovery");
                check(t.GetProperty("chance").GetDouble()==50&&t.GetProperty("roll").GetDouble()==10,"G01 shared judgment retained");
                check(t.GetProperty("source").GetString()=="seen","G01 personal evidence retained");
                check(!d.TryGetProperty("grenadeJudgmentConfig",out _),"G01 compact omits repeated config");
            }
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?profileId=map-g01")))
                check(doc.RootElement.GetProperty("events")[0].GetProperty("detail").GetString()==judgment,"G01 full diagnostic roundtrip");
            var hands=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"w10-hands-recovery.json"));
            await db.ExecuteAsync("""
                INSERT INTO comet_decision (raidId,time,cometSession,sequence,profileId,name,feature,decision,stage,reason,detail)
                VALUES ($raid,5000,$session,160,'map-w10','Example','W10','HandsRecovery','evaluated','hands-native-request',$detail)
                """,("$raid",raidId),("$session",session),("$detail",hands));
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?compact=true&profileId=map-w10&search=W10"))) {
                var d=doc.RootElement.GetProperty("events")[0].GetProperty("detail");var t=d.GetProperty("handsRecovery");
                check(t.GetProperty("accepted").GetBoolean()&&!t.GetProperty("ready").GetBoolean(),"W10 acknowledgement is not a confirmed recovery");
                check(t.GetProperty("attempts").GetInt32()==1&&t.GetProperty("limit").GetInt32()==2,"W10 retry budget retained");
                check(t.GetProperty("action").GetString()=="StandAndShoot","W10 actual behavior retained");
                check(!d.TryGetProperty("handsRecoveryConfig",out _),"W10 compact omits repeated config");
            }
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?profileId=map-w10")))
                check(doc.RootElement.GetProperty("events")[0].GetProperty("detail").GetString()==hands,"W10 full diagnostic roundtrip");
            var recovery=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"w09-recoil-recovery.json"));
            await db.ExecuteAsync("""
                INSERT INTO comet_decision (raidId,time,cometSession,sequence,profileId,name,feature,decision,stage,reason,detail)
                VALUES ($raid,5000,$session,159,'map-w09','Example','W09','RecoilRecovery','evaluated','recoil-time-based-recovery',$detail)
                """,("$raid",raidId),("$session",session),("$detail",recovery));
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?compact=true&profileId=map-w09&search=W09"))) {
                var d=doc.RootElement.GetProperty("events")[0].GetProperty("detail");var t=d.GetProperty("recoilRecovery");
                check(t.GetProperty("applied").GetBoolean()&&t.GetProperty("multiplier").GetDouble()==3,"W09 actual correction retained");
                check(t.GetProperty("beforeHorizontal").GetDouble()>t.GetProperty("afterHorizontal").GetDouble(),"W09 before/after retained");
                check(t.GetProperty("action").GetString()=="StandAndShoot","W09 native behavior retained");
                check(!d.TryGetProperty("recoilRecoveryConfig",out _),"W09 compact omits repeated config");
            }
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?profileId=map-w09")))
                check(doc.RootElement.GetProperty("events")[0].GetProperty("detail").GetString()==recovery,"W09 full diagnostic roundtrip");
            var geometry=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"w08-shot-geometry.json"));
            await db.ExecuteAsync("""
                INSERT INTO comet_decision (raidId,time,cometSession,sequence,profileId,name,feature,decision,stage,reason,detail)
                VALUES ($raid,5000,$session,158,'map-w08','Example','W08','ShotGeometry','evaluated','geometry-door-or-glass',$detail)
                """,("$raid",raidId),("$session",session),("$detail",geometry));
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?compact=true&profileId=map-w08&search=W08"))) {
                var d=doc.RootElement.GetProperty("events")[0].GetProperty("detail");var t=d.GetProperty("shotGeometry");
                check(t.GetProperty("allowed").GetBoolean()&&!t.GetProperty("penetrationEstimated").GetBoolean(),"W08 door/glass permission is not penetration prediction");
                check(t.GetProperty("passThroughSurfaces").GetInt32()==2&&t.GetProperty("surfaces").GetArrayLength()==2,"W08 crossings retained");
                check(t.GetProperty("action").GetString()=="Search"&&t.GetProperty("consumer").GetString()=="W07","W08 native action and consumer retained");
                check(!d.TryGetProperty("shotGeometryConfig",out _),"W08 compact omits repeated config");
            }
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?profileId=map-w08")))
                check(doc.RootElement.GetProperty("events")[0].GetProperty("detail").GetString()==geometry,"W08 full diagnostic roundtrip");
            var discipline=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"w07-suppression-discipline.json"));
            await db.ExecuteAsync("""
                INSERT INTO comet_decision (raidId,time,cometSession,sequence,profileId,name,feature,decision,stage,reason,detail)
                VALUES ($raid,5000,$session,157,'map-w07','Example','W07','SuppressionDiscipline','evaluated','suppression-burst-pause',$detail)
                """,("$raid",raidId),("$session",session),("$detail",discipline));
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?compact=true&profileId=map-w07&search=W07"))) {
                var d=doc.RootElement.GetProperty("events")[0].GetProperty("detail");var t=d.GetProperty("suppressionDiscipline");
                check(t.GetProperty("actualShots").GetInt32()==5,"W07 observed shots retained");
                check(t.GetProperty("state").GetString()=="paused"&&t.GetProperty("pauseRemaining").GetDouble()==3,"W07 pause retained");
                check(t.GetProperty("reserve").GetInt32()==18&&t.GetProperty("aimY").GetDouble()==1.2,"W07 reserve and frozen aim retained");
                check(!d.TryGetProperty("suppressionDisciplineConfig",out _),"W07 compact omits repeated config");
            }
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?profileId=map-w07")))
                check(doc.RootElement.GetProperty("events")[0].GetProperty("detail").GetString()==discipline,"W07 full diagnostic roundtrip");
            var weaponSync=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"w06-weapon-sync.json"));
            await db.ExecuteAsync("""
                INSERT INTO comet_decision (raidId,time,cometSession,sequence,profileId,name,feature,decision,stage,reason,detail)
                VALUES ($raid,5000,$session,156,'map-w06','Example','W06','WeaponSync','evaluated','sync-equipment-verified',$detail)
                """,("$raid",raidId),("$session",session),("$detail",weaponSync));
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?compact=true&profileId=map-w06&search=W06"))) {
                var d=doc.RootElement.GetProperty("events")[0].GetProperty("detail");var t=d.GetProperty("weaponSync");
                check(t.GetProperty("verified").GetBoolean(),"W06 actual repair verification retained");
                check(t.GetProperty("slots").GetArrayLength()==3,"W06 all three slots retained");
                check(t.GetProperty("slots")[0].GetProperty("nativeBefore").GetString()=="old-rifle"&&t.GetProperty("slots")[0].GetProperty("nativeAfter").GetString()=="rifle","W06 before/after retained");
                check(!d.TryGetProperty("weaponSyncConfig",out _),"W06 compact omits repeated config");
            }
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?profileId=map-w06")))
                check(doc.RootElement.GetProperty("events")[0].GetProperty("detail").GetString()==weaponSync,"W06 full diagnostic roundtrip");
            var weaponRange=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"w05-weapon-range.json"));
            await db.ExecuteAsync("""
                INSERT INTO comet_decision (raidId,time,cometSession,sequence,profileId,name,feature,decision,stage,reason,detail)
                VALUES ($raid,5000,$session,155,'map-w05','Example','W05','WeaponRange','evaluated','weapon-target-in-hands',$detail)
                """,("$raid",raidId),("$session",session),("$detail",weaponRange));
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?compact=true&profileId=map-w05&search=W05"))) {
                var d=doc.RootElement.GetProperty("events")[0].GetProperty("detail");var t=d.GetProperty("weaponRange");
                check(t.GetProperty("inHands").GetBoolean()&&!t.GetProperty("ready").GetBoolean(),"W05 drawing separate from ready");
                check(t.GetProperty("weapons").GetArrayLength()==2&&t.GetProperty("distance").GetDouble()==100,"W05 alternatives and known distance retained");
                check(t.GetProperty("requested").GetBoolean()&&t.GetProperty("accepted").GetBoolean(),"W05 native animation retained");
                check(!d.TryGetProperty("weaponRangeConfig",out _),"W05 compact omits repeated config");
            }
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?profileId=map-w05")))
                check(doc.RootElement.GetProperty("events")[0].GetProperty("detail").GetString()==weaponRange,"W05 full diagnostic roundtrip");
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?profileId=map-w02")))
                check(doc.RootElement.GetProperty("events")[0].GetProperty("detail").GetString()==pistol,"W02 full diagnostic roundtrip");
            var reload=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"w01-reload-timing.json"));
            await db.ExecuteAsync("""
                INSERT INTO comet_decision (raidId,time,cometSession,sequence,profileId,name,feature,decision,stage,reason,detail)
                VALUES ($raid,4998,$session,151,'map-w01','Example','W01','ReloadTiming','evaluated','reload-animation-observed',$detail)
                """,("$raid",raidId),("$session",session),("$detail",reload));
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?compact=true&profileId=map-w01&search=W01"))) {
                var reloadDetail=doc.RootElement.GetProperty("events")[0].GetProperty("detail");var reloadTrace=reloadDetail.GetProperty("reloadTiming");
                check(reloadTrace.GetProperty("started").GetBoolean()&&!reloadTrace.GetProperty("finished").GetBoolean(),"W01 actual start is separate from finish");
                check(reloadTrace.GetProperty("loaded").GetInt32()==8&&reloadTrace.GetProperty("reserve").GetInt32()==30,"W01 actual ammo and reserve retained");
                check(!reloadTrace.GetProperty("improved").GetBoolean(),"W01 no invented reload success");
                check(!reloadDetail.TryGetProperty("reloadTimingConfig",out _),"W01 compact omits repeated config");
            }
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?profileId=map-w01")))
                check(doc.RootElement.GetProperty("events")[0].GetProperty("detail").GetString()==reload,"W01 full diagnostic roundtrip");
            var feint=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"m14-cover-feint.json"));
            await db.ExecuteAsync("""
                INSERT INTO comet_decision (raidId,time,cometSession,sequence,profileId,name,feature,decision,stage,reason,detail)
                VALUES ($raid,4997,$session,141,'map-m14','Example','M14','CoverFeint','evaluated','feint-weapon-ready-hold-approach',$detail)
                """,("$raid",raidId),("$session",session),("$detail",feint));
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?compact=true&profileId=map-m14&search=M14"))) {
                var detail14=doc.RootElement.GetProperty("events")[0].GetProperty("detail");var trace14=detail14.GetProperty("coverFeint");
                check(trace14.GetProperty("animationObserved").GetBoolean()&&trace14.GetProperty("weaponReady").GetBoolean(),"M14 actual animation and ready weapon retained");
                check(trace14.GetProperty("soundEvents").GetInt32()==1&&trace14.GetProperty("playbackSubmissions").GetInt32()==1,"M14 sound events and playback remain separate");
                check(!trace14.GetProperty("approachObserved").GetBoolean(),"M14 no fabricated enemy response");
                check(!detail14.TryGetProperty("coverFeintConfig",out _),"M14 compact omits repeated config");
            }
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?profileId=map-m14")))
                check(doc.RootElement.GetProperty("events")[0].GetProperty("detail").GetString()==feint,"M14 full diagnostic roundtrip");
            var relocation=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"m13-outdoor-relocation.json"));
            await db.ExecuteAsync("""
                INSERT INTO comet_decision (raidId,time,cometSession,sequence,profileId,name,feature,decision,stage,reason,detail)
                VALUES ($raid,4996,$session,140,'map-m13','Example','M13','OutdoorRelocation','evaluated','relocate-native-cover-move',$detail)
                """,("$raid",raidId),("$session",session),("$detail",relocation));
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?compact=true&profileId=map-m13&search=M13"))) {
                var detail13=doc.RootElement.GetProperty("events")[0].GetProperty("detail");var trace13=detail13.GetProperty("outdoorRelocation");
                check(trace13.GetProperty("movementObserved").GetBoolean()&&!trace13.GetProperty("arrived").GetBoolean(),"M13 compact preserves actual movement vs arrival");
                check(trace13.GetProperty("projectileObserved").GetBoolean()&&trace13.GetProperty("destination").GetString()=="west-cover","M13 release and chosen cover retained");
                check(!detail13.TryGetProperty("outdoorRelocationConfig",out _),"M13 compact omits repeated config");
            }
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?profileId=map-m13")))
                check(doc.RootElement.GetProperty("events")[0].GetProperty("detail").GetString()==relocation,"M13 full diagnostic roundtrip");
            var lean=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"m04-combat-lean.json"));
            await db.ExecuteAsync("""
                INSERT INTO comet_decision (raidId,time,cometSession,sequence,profileId,name,feature,decision,stage,reason,detail)
                VALUES ($raid,4997,$session,34,'map-m04','Example','M04','CombatLean','evaluated','lean-held-side',$detail)
                """,("$raid",raidId),("$session",session),("$detail",lean));
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?compact=true&profileId=map-m04&search=M04"))) {
                var e=doc.RootElement.GetProperty("events")[0];var d=e.GetProperty("detail");var t=d.GetProperty("combatLean");
                check(e.GetProperty("feature").GetString()=="M04","M04 compact context");
                check(t.GetProperty("headMotionObserved").GetBoolean()&&t.GetProperty("tiltObserved").GetBoolean(),"M04 physical observations preserved");
                check(t.GetProperty("headTravel").GetDouble()==.1&&t.GetProperty("requests").GetInt32()==1,"M04 request and displacement remain separate");
                check(!d.TryGetProperty("combatLeanConfig",out _),"M04 compact omits repeated config");
            }
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?profileId=map-m04")))
                check(doc.RootElement.GetProperty("events")[0].GetProperty("detail").GetString()==lean,"M04 full diagnostic roundtrip");
            var corner=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"m03-corner-peek.json"));
            await db.ExecuteAsync("""
                INSERT INTO comet_decision (raidId,time,cometSession,sequence,profileId,name,feature,decision,stage,reason,detail)
                VALUES ($raid,4998,$session,33,'map-m03','Example','M03','CornerPeek','evaluated','corner-exposure-observed',$detail)
                """,("$raid",raidId),("$session",session),("$detail",corner));
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?compact=true&profileId=map-m03&search=M03"))) {
                var e=doc.RootElement.GetProperty("events")[0];var d=e.GetProperty("detail");var t=d.GetProperty("cornerPeek");
                check(e.GetProperty("feature").GetString()=="M03","M03 compact context");
                check(t.GetProperty("hiddenObserved").GetBoolean()&&t.GetProperty("openObserved").GetBoolean(),"M03 real cover and firing angle preserved");
                check(t.GetProperty("shots").GetInt32()==1&&t.GetProperty("peeks").GetInt32()==1,"M03 actual shots and peeks preserved");
                check(!d.TryGetProperty("cornerPeekConfig",out _),"M03 compact omits repeated config");
            }
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?profileId=map-m03")))
                check(doc.RootElement.GetProperty("events")[0].GetProperty("detail").GetString()==corner,"M03 full diagnostic roundtrip");
            var pause=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"m02-fire-pause.json"));
            await db.ExecuteAsync("""
                INSERT INTO comet_decision (raidId,time,cometSession,sequence,profileId,name,feature,decision,stage,reason,detail)
                VALUES ($raid,4999,$session,32,'map-m02','Example','M02','FirePause','evaluated','pause-stop-observed',$detail)
                """,("$raid",raidId),("$session",session),("$detail",pause));
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?compact=true&profileId=map-m02&search=M02"))) {
                var e=doc.RootElement.GetProperty("events")[0];var d=e.GetProperty("detail");var t=d.GetProperty("firePause");
                check(e.GetProperty("feature").GetString()=="M02","M02 compact context");
                check(t.GetProperty("stopRequested").GetBoolean()&&t.GetProperty("stopObserved").GetBoolean(),"M02 requested and observed stop preserved");
                check(t.GetProperty("shots").GetInt32()==1&&t.GetProperty("stationaryShots").GetInt32()==1,"M02 shot evidence preserved");
                check(!d.TryGetProperty("firePauseConfig",out _),"M02 compact omits repeated config");
            }
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?profileId=map-m02")))
                check(doc.RootElement.GetProperty("events")[0].GetProperty("detail").GetString()==pause,"M02 full diagnostic roundtrip");

            for (int i=1; i<=3; i++)
                await db.ExecuteAsync("""
                    INSERT INTO comet_decision (raidId,time,cometSession,sequence,profileId,name,feature,decision,stage,reason,detail)
                    VALUES ($raid,$time,$session,$seq,$profile,'Example','A02','Cover','accepted','sain-decision-accepted',$detail)
                    """, ("$raid",raidId),("$time",i*1000),("$session",session),("$seq",i),
                    ("$profile",i==3?"map-other":"map-pmc"),("$detail",i==2?"[]":detail));
            string url=$"/api/raids/{raidId}/comet_decisions?profileId=map-pmc";
            using(var response=await client.GetAsync(url+"&compact=true&limit=1"))
            {
                check(response.IsSuccessStatusCode,"compact map history returns HTTP 200");
                using var doc=JsonDocument.Parse(await response.Content.ReadAsStringAsync());
                var data=doc.RootElement;
                check(data.GetProperty("total").GetInt32()==2,"map total is filtered to exact profile");
                var e=data.GetProperty("events").EnumerateArray().Single();
                check(e.GetProperty("time").GetInt64()==1000&&e.GetProperty("profileId").GetString()=="map-pmc","map pages retain chronological identity");
                var d=e.GetProperty("detail");
                check(d.GetProperty("quiet").GetProperty("applied").GetBoolean() && d.GetProperty("quiet").GetProperty("remaining").GetInt32()==17,"P02 execution and budget survive compact HTTP");
                check(d.GetProperty("hearing").GetProperty("outcome").GetString()=="heard" && d.GetProperty("hearing").GetProperty("signal").GetInt32()==42, "P01 personally heard evidence survives compact HTTP");
                check(d.GetProperty("handoff").GetProperty("nativeObserved").GetBoolean() && d.GetProperty("handoff").GetProperty("nativeCombat").GetString()=="Retreat", "A13 native observation survives compact HTTP");
                check(d.GetProperty("progress").GetProperty("retryRemaining").GetInt32()==8 && d.GetProperty("progress").GetProperty("reconsider").GetBoolean(),"A12 progress and retry survive compact HTTP");
                check(d.GetProperty("contact").GetProperty("source").GetString()=="heard"&&d.GetProperty("candidates").GetArrayLength()==1,"compact history keeps decision context");
                check(e.GetProperty("feature").GetString()=="A02" && d.GetProperty("visible").GetProperty("coverRouteRisk").GetDouble()==.2,"compact history preserves A02 route risk");
                check(d.GetProperty("coverResponse").GetProperty("fastExposedSeconds").GetDouble()==1.9 && d.GetProperty("coverResponse").GetProperty("coverDelta").GetInt32()==-20,"A11 travel range and signed adjustment survive compact API");
                check(d.GetProperty("opportunity").GetProperty("remaining").GetInt32()==10 && d.GetProperty("opportunity").GetProperty("eta").GetInt32()==3,"A10 original window and travel estimate survive compact HTTP");
                check(d.GetProperty("opponent").GetProperty("evidence")[0].GetProperty("confidence").GetDouble()==.48,"A09 dated evidence survives compact HTTP");
                check(d.GetProperty("loadout").GetProperty("idealRange").GetInt32()==12 && d.GetProperty("loadout").GetProperty("canFirstAid").GetBoolean(),"A08 equipment context survives compact HTTP");
                check(d.GetProperty("fear").GetProperty("level").GetDouble()==.8 && d.GetProperty("fear").GetProperty("panic").GetBoolean(), "A06 perceived fear survives compact HTTP");
                var mixing=d.GetProperty("mixing");
                var mistake=mixing.GetProperty("mistake");
                check(mistake.GetProperty("roll").GetDouble()==.02 && mistake.GetProperty("scoreLoss").GetDouble()==.175
                    && mistake.GetProperty("nextAllowedAt").GetDouble()==20 && mistake.GetProperty("best").GetString()=="Shoot"
                    && mistake.GetProperty("selected").GetString()=="Cover", "A05 separate draw, initial/final choices and cooldown survive real compact HTTP");
                check(mixing.GetProperty("seed").GetString()=="1234abcd" && mixing.GetProperty("roll").GetDouble()==.7
                    && mixing.GetProperty("options")[0].GetProperty("probability").GetDouble()==.24,"A04 original draw and probabilities survive real compact HTTP");
                check(!d.TryGetProperty("config",out _)&&!e.TryGetProperty("name",out _),"map payload omits redundant configuration and roster names");
            }
            using(var doc=JsonDocument.Parse(await client.GetStringAsync(url+"&compact=true&limit=1&offset=1")))
            {
                var e=doc.RootElement.GetProperty("events").EnumerateArray().Single();
                check(e.GetProperty("time").GetInt64()==2000,"second page has no skipped/duplicated event");
                check(e.GetProperty("detail").EnumerateObject().Count()==0,"damaged optional details do not remove lifecycle events");
            }
            using(var doc=JsonDocument.Parse(await client.GetStringAsync(url+"&search=P02")))
                check(doc.RootElement.GetProperty("total").GetInt32()==1,"P02 filter finds contribution and ignores malformed details");
            using(var doc=JsonDocument.Parse(await client.GetStringAsync(url+"&search=P01")))
                check(doc.RootElement.GetProperty("total").GetInt32()==1,"P01 filter finds tactical contribution and skips malformed detail");
            using(var doc=JsonDocument.Parse(await client.GetStringAsync(url+"&search=A11")))
                check(doc.RootElement.GetProperty("total").GetInt32()==1,"A11 filter finds contribution, skips damaged JSON");
            using(var doc=JsonDocument.Parse(await client.GetStringAsync(url+"&search=A12")))
                check(doc.RootElement.GetProperty("total").GetInt32()==1,"A12 exact filter finds contribution, skips damaged JSON");
            using(var doc=JsonDocument.Parse(await client.GetStringAsync(url+"&search=A10")))
                check(doc.RootElement.GetProperty("total").GetInt32()==1,"A10 filter finds contribution and skips malformed JSON");
            using(var doc=JsonDocument.Parse(await client.GetStringAsync(url+"&search=A09")))
                check(doc.RootElement.GetProperty("total").GetInt32()==1,"A09 filter matches contribution without corrupt JSON");
            using(var doc=JsonDocument.Parse(await client.GetStringAsync(url+"&search=A08")))
                check(doc.RootElement.GetProperty("total").GetInt32()==1,"A08 filter finds contributions attached to A01/A02 without matching malformed detail");
            using(var doc=JsonDocument.Parse(await client.GetStringAsync(url+"&limit=1")))
                check(doc.RootElement.GetProperty("events")[0].GetProperty("detail").GetString()==detail,"Behavior diagnostics still receive full original JSON");
            foreach(var missing in new[]{"map-%","' OR 1=1 --"})
            {
                using var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?compact=true&profileId={Uri.EscapeDataString(missing)}"));
                check(doc.RootElement.GetProperty("total").GetInt32()==0,"profile query is exact and parameterized");
            }
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{Guid.NewGuid()}/comet_decisions?compact=true&profileId=map-pmc")))
                check(doc.RootElement.GetProperty("total").GetInt32()==0,"history cannot cross raid identity");
            await db.ExecuteAsync("""
                INSERT INTO comet_decision (raidId,time,cometSession,sequence,profileId,name,feature,decision,stage,reason,detail)
                VALUES ($raid,3100,$session,4,'map-a03','Example','A03','KeepAngle','accepted','sain-decision-accepted',$detail)
                """, ("$raid",raidId),("$session",session),("$detail",continuity));
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?compact=true&profileId=map-a03")))
            {
                var e=doc.RootElement.GetProperty("events")[0];var h=e.GetProperty("detail").GetProperty("continuity");
                check(e.GetProperty("feature").GetString()=="A03" && h.GetProperty("remaining").GetDouble()==.7,"A03 time window survives compact HTTP");
                check(!h.GetProperty("fireAuthorized").GetBoolean(),"A03 does not claim hidden fire authorization");
            }
            const string threat = """{"threat":{"previous":"enemy-a","selected":"enemy-b","reason":"threat-recent-attacker","emergency":true,"holdRemaining":2,"margin":0.2,"candidates":[{"target":"enemy-b","eligible":true,"source":"heard","age":0.1,"hit":98,"score":120}]}}""";
            await db.ExecuteAsync("""
                INSERT INTO comet_decision (raidId,time,cometSession,sequence,profileId,name,feature,decision,stage,reason,detail)
                VALUES ($raid,3200,$session,5,'map-a07','Example','A07','SelectTarget','accepted','threat-recent-attacker',$detail)
                """, ("$raid",raidId),("$session",session),("$detail",threat));
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?compact=true&profileId=map-a07")))
            {
                var e=doc.RootElement.GetProperty("events")[0];var t=e.GetProperty("detail").GetProperty("threat");
                check(e.GetProperty("feature").GetString()=="A07" && t.GetProperty("selected").GetString()=="enemy-b","target priority survives compact HTTP");
                check(t.GetProperty("candidates")[0].GetProperty("hit").GetDouble()==98 && t.GetProperty("emergency").GetBoolean(),"A07 evidence and emergency survive compact HTTP");
            }
            await db.ExecuteAsync("""
                INSERT INTO comet_decision (raidId,time,cometSession,sequence,profileId,name,feature,decision,stage,reason,detail)
                VALUES ($raid,3300,$session,6,'map-a12','Example','A01','Hold','evaluated','progress-hold-fatigue',$detail)
                """, ("$raid",raidId),("$session",session),("$detail",detail));
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?compact=true&profileId=map-a12&search=A12")))
            {
                var e=doc.RootElement.GetProperty("events")[0];
                check(e.GetProperty("stage").GetString()=="evaluated"&&e.GetProperty("detail").GetProperty("progress").GetProperty("stalledSeconds").GetInt32()==5,"A12 diagnostic updates reach map without converting stage to accepted");
            }
            await db.ExecuteAsync("""
                INSERT INTO comet_decision (raidId,time,cometSession,sequence,profileId,name,feature,decision,stage,reason,detail)
                VALUES ($raid,3400,$session,7,'map-a13','Example','A13','','evaluated','handoff-native-observed',$detail)
                """, ("$raid",raidId),("$session",session),("$detail",detail));
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?compact=true&profileId=map-a13&search=A13")))
            {
                var e=doc.RootElement.GetProperty("events")[0];
                check(e.GetProperty("stage").GetString()=="evaluated" && e.GetProperty("detail").GetProperty("handoff").GetProperty("nativeObserved").GetBoolean(), "A13 filter and evaluated native result survive actual HTTP");
            }
            await db.ExecuteAsync("""
                INSERT INTO comet_decision (raidId,time,cometSession,sequence,profileId,name,feature,decision,stage,reason,detail)
                VALUES ($raid,3500,$session,8,'map-p01','Example','P01','MovementHearing','evaluated','movement-personally-heard',$detail)
                """, ("$raid",raidId),("$session",session),("$detail",detail));
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?compact=true&profileId=map-p01&search=P01")))
            {
                var e=doc.RootElement.GetProperty("events")[0];
                check(e.GetProperty("stage").GetString()=="evaluated" && e.GetProperty("feature").GetString()=="P01", "P01 does not become accepted action through API");
            }
            const string gunfire = """{"botInstance":"one","gunfire":{"state":"look","reason":"gunfire-orbit-keeps-objective","source":"heard-source","personality":"Rat","owner":"ORBIT","distance":175,"applied":true,"passToSain":false,"searchObserved":false,"remaining":2,"validFor":1.5,"x":10,"y":2,"z":30},"gunfireConfig":{"lookDuration":3}}""";
            await db.ExecuteAsync("""
                INSERT INTO comet_decision (raidId,time,cometSession,sequence,profileId,name,feature,decision,stage,reason,detail)
                VALUES ($raid,3600,$session,9,'map-p03','Example','P03','GunfireReaction','evaluated','gunfire-orbit-keeps-objective',$detail)
                """, ("$raid",raidId),("$session",session),("$detail",gunfire));
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?compact=true&profileId=map-p03&search=P03")))
            {
                var e=doc.RootElement.GetProperty("events")[0];var g=e.GetProperty("detail").GetProperty("gunfire");
                check(e.GetProperty("stage").GetString()=="evaluated" && e.GetProperty("feature").GetString()=="P03", "P03 remains perception through real filtered HTTP");
                check(g.GetProperty("applied").GetBoolean() && g.GetProperty("remaining").GetInt32()==2 && g.GetProperty("owner").GetString()=="ORBIT", "P03 execution, lease and original owner survive compact HTTP");
                check(!g.GetProperty("passToSain").GetBoolean() && !g.GetProperty("searchObserved").GetBoolean() && g.GetProperty("x").GetInt32()==10,"P03 glance does not become a registered contact or an action");
                check(!e.GetProperty("detail").TryGetProperty("gunfireConfig",out _),"P03 compact payload omits duplicate raid settings");
            }
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?profileId=map-p03")))
                check(doc.RootElement.GetProperty("events")[0].GetProperty("detail").GetString()==gunfire,"P03 full JSON preserves settings and evidence");
            const string floor = """{"botInstance":"one","floorHearing":{"state":"blocked","reason":"floor-range-cut","source":"sound-source","kind":"Sprint","geometry":"floor-one-confirmed","floors":1,"nativeRange":40,"finalRange":24,"distance":30,"nativeAudible":true,"allowed":false,"cached":true},"floorConfig":{"oneFloorOther":0.6}}""";
            await db.ExecuteAsync("""
                INSERT INTO comet_decision (raidId,time,cometSession,sequence,profileId,name,feature,decision,stage,reason,detail)
                VALUES ($raid,3700,$session,10,'map-p04','Example','P04','FloorHearing','evaluated','floor-range-cut',$detail)
                """, ("$raid",raidId),("$session",session),("$detail",floor));
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?compact=true&profileId=map-p04&search=P04")))
            {
                var e=doc.RootElement.GetProperty("events")[0];var f=e.GetProperty("detail").GetProperty("floorHearing");
                check(e.GetProperty("stage").GetString()=="evaluated" && e.GetProperty("feature").GetString()=="P04","P04 real filtered HTTP preserves perception type");
                check(!f.GetProperty("allowed").GetBoolean() && f.GetProperty("nativeAudible").GetBoolean(),"P04 blocked sound stays blocked in compact HTTP");
                check(f.GetProperty("nativeRange").GetInt32()==40&&f.GetProperty("finalRange").GetInt32()==24&&f.GetProperty("floors").GetInt32()==1,"P04 ranges and geometry survive compact HTTP");
                check(!e.GetProperty("detail").TryGetProperty("floorConfig",out _),"P04 compact omits repeated settings");
            }
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?profileId=map-p04")))
                check(doc.RootElement.GetProperty("events")[0].GetProperty("detail").GetString()==floor,"P04 full diagnostics retain settings and geometry");
            const string close = """{"botInstance":"one","closeDetection":{"state":"acquired","reason":"close-native-visual-acquired","target":"enemy","distance":3,"attentionBefore":2.25,"attentionAfter":1,"nativeModifier":9,"finalModifier":4,"visualAcquired":true,"correctionAge":0.2},"closeConfig":{"startDistance":6,"fullDistance":3,"reductionPercent":100}}""";
            await db.ExecuteAsync("""
                INSERT INTO comet_decision (raidId,time,cometSession,sequence,profileId,name,feature,decision,stage,reason,detail)
                VALUES ($raid,3800,$session,11,'map-p05','Example','P05','CloseDetection','evaluated','close-native-visual-acquired',$detail)
                """, ("$raid",raidId),("$session",session),("$detail",close));
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?compact=true&profileId=map-p05&search=P05")))
            {
                var e=doc.RootElement.GetProperty("events")[0];var c=e.GetProperty("detail").GetProperty("closeDetection");
                check(e.GetProperty("stage").GetString()=="evaluated" && e.GetProperty("feature").GetString()=="P05","P05 real filtered HTTP preserves perception type");
                check(c.GetProperty("visualAcquired").GetBoolean()&&c.GetProperty("state").GetString()=="acquired","P05 native acquisition survives compact HTTP");
                check(c.GetProperty("attentionBefore").GetDouble()==2.25&&c.GetProperty("attentionAfter").GetInt32()==1,"P05 penalty evidence survives compact HTTP");
                check(!e.GetProperty("detail").TryGetProperty("closeConfig",out _),"P05 compact omits repeated settings");
            }
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?profileId=map-p05")))
                check(doc.RootElement.GetProperty("events")[0].GetProperty("detail").GetString()==close,"P05 full diagnostics retain settings and observation");
            const string impact = """{"botInstance":"one","impact":{"state":"observed","active":true,"evidence":"impact-sector","sectorYaw":180,"remaining":3,"validFor":1.5,"nativeAccepted":true,"actionObserved":true,"movementObserved":false},"impactConfig":{"enabled":true,"memory":3,"minimumInterval":0.5}}""";
            await db.ExecuteAsync("""
                INSERT INTO comet_decision (raidId,time,cometSession,sequence,profileId,name,feature,decision,stage,reason,detail)
                VALUES ($raid,3900,$session,12,'map-p07','Example','P07','ImpactReaction','evaluated','impact-defensive-action-observed',$detail)
                """, ("$raid",raidId),("$session",session),("$detail",impact));
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?compact=true&profileId=map-p07&search=P07")))
            {
                var e=doc.RootElement.GetProperty("events")[0];var i=e.GetProperty("detail").GetProperty("impact");
                check(e.GetProperty("feature").GetString()=="P07"&&e.GetProperty("stage").GetString()=="evaluated","P07 real filtered HTTP");
                check(i.GetProperty("actionObserved").GetBoolean()&&!i.GetProperty("movementObserved").GetBoolean(),"P07 action versus motion retained");
                check(i.GetProperty("sectorYaw").GetInt32()==180&&!i.TryGetProperty("position",out _),"P07 only coarse sector in compact map");
                check(!e.GetProperty("detail").TryGetProperty("impactConfig",out _),"P07 repeated config omitted from map");
            }
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?profileId=map-p07")))
                check(doc.RootElement.GetProperty("events")[0].GetProperty("detail").GetString()==impact,"P07 full trace including config preserved");
            const string silent = """{"silentSearch":{"state":"observed","reason":"silent-search-reevaluate","target":"heard","personality":"Normal","silence":15,"delay":15,"remaining":10,"validFor":1.5,"bonus":15,"accepted":true,"actionObserved":true,"movementObserved":false,"walking":true,"x":3,"y":2,"z":7},"silentSearchConfig":{"enabled":true,"scoreBonus":15}}""";
            await db.ExecuteAsync("""
                INSERT INTO comet_decision (raidId,time,cometSession,sequence,profileId,name,feature,decision,stage,reason,detail)
                VALUES ($raid,4000,$session,13,'map-p08','Example','P08','SilentSearch','evaluated','silent-search-reevaluate',$detail)
                """, ("$raid",raidId),("$session",session),("$detail",silent));
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?compact=true&profileId=map-p08&search=P08")))
            {
                var e=doc.RootElement.GetProperty("events")[0];var t=e.GetProperty("detail").GetProperty("silentSearch");
                check(e.GetProperty("feature").GetString()=="P08"&&e.GetProperty("stage").GetString()=="evaluated","P08 filtered HTTP");
                check(t.GetProperty("actionObserved").GetBoolean()&&!t.GetProperty("movementObserved").GetBoolean(),"P08 execution versus movement retained");
                check(t.GetProperty("silence").GetInt32()==15&&t.GetProperty("x").GetInt32()==3,"P08 timer and known position retained");
                check(!e.GetProperty("detail").TryGetProperty("silentSearchConfig",out _),"P08 duplicate config omitted from compact map");
            }
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?profileId=map-p08")))
                check(doc.RootElement.GetProperty("events")[0].GetProperty("detail").GetString()==silent,"P08 full diagnostic preserved");
            var combat=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"m01-combat-step.json"));
            await db.ExecuteAsync("""
                INSERT INTO comet_decision (raidId,time,cometSession,sequence,profileId,name,feature,decision,stage,reason,detail)
                VALUES ($raid,4998,$session,31,'map-m01','Example','M01','CombatStep','evaluated','movement-step-requested',$detail)
                """, ("$raid",raidId),("$session",session),("$detail",combat));
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?compact=true&profileId=map-m01&search=M01")))
            {
                var e=doc.RootElement.GetProperty("events")[0];var d=e.GetProperty("detail");var t=d.GetProperty("combatStep");
                check(e.GetProperty("feature").GetString()=="M01"&&e.GetProperty("stage").GetString()=="evaluated","M01 context transport");
                check(t.GetProperty("requested").GetBoolean()&&t.GetProperty("movementObserved").GetBoolean(),"M01 observed travel retained");
                check(t.GetProperty("actualDistance").GetDouble()==.18&&t.GetProperty("direction").GetString()=="right","M01 direction and real distance retained");
                check(!d.TryGetProperty("combatStepConfig",out _),"M01 compact omits duplicate config");
            }
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?profileId=map-m01")))
                check(doc.RootElement.GetProperty("events")[0].GetProperty("detail").GetString()==combat,"M01 full detail retained");
            var ram=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"d15-door-entry.json"));
            await db.ExecuteAsync("""
                INSERT INTO comet_decision (raidId,time,cometSession,sequence,profileId,name,feature,decision,stage,reason,detail)
                VALUES ($raid,4997,$session,30,'map-d15','Example','D15','DoorEntry','evaluated','entry-crossing',$detail)
                """, ("$raid",raidId),("$session",session),("$detail",ram));
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?compact=true&profileId=map-d15&search=D15")))
            {
                var e=doc.RootElement.GetProperty("events")[0];var d=e.GetProperty("detail");var t=d.GetProperty("doorEntry");
                check(e.GetProperty("feature").GetString()=="D15"&&e.GetProperty("stage").GetString()=="evaluated","D15 context transport");
                check(t.GetProperty("requested").GetBoolean()&&t.GetProperty("breachObserved").GetBoolean()&&!t.GetProperty("crossed").GetBoolean(),"D15 request/breach/crossing separated");
                check(t.GetProperty("context").GetString()=="prepared"&&t.GetProperty("animationFinished").GetBoolean()&&t.GetProperty("interaction").GetString()=="native-kick","D15 context/native animation evidence retained");
                check(!d.TryGetProperty("doorEntryConfig",out _),"D15 compact omits duplicate config");
            }
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?profileId=map-d15")))
                check(doc.RootElement.GetProperty("events")[0].GetProperty("detail").GetString()==ram,"D15 full detail retained");
            var reservation=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"d14-door-reservation.json"));
            await db.ExecuteAsync("""
                INSERT INTO comet_decision (raidId,time,cometSession,sequence,profileId,name,feature,decision,stage,reason,detail)
                VALUES ($raid,4996,$session,29,'map-d14','Example','D14','DoorReservation','evaluated','reservation-validated',$detail)
                """, ("$raid",raidId),("$session",session),("$detail",reservation));
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?compact=true&profileId=map-d14&search=D14")))
            {
                var e=doc.RootElement.GetProperty("events")[0];var d=e.GetProperty("detail");var t=d.GetProperty("doorReservation");
                check(e.GetProperty("feature").GetString()=="D14"&&e.GetProperty("stage").GetString()=="evaluated","D14 compact HTTP context");
                check(t.GetProperty("owner").GetString()=="test-pmc"&&t.GetProperty("token").GetInt64()==42,"D14 ownership token");
                check(t.GetProperty("actionObserved").GetBoolean()&&t.GetProperty("phase").GetString()=="entry:planning","D14 callback and phase evidence");
                check(t.GetProperty("remaining").GetDouble()==2&&t.GetProperty("budgetRemaining").GetDouble()==7,"D14 short lease distinct from original budget");
                check(!d.TryGetProperty("doorReservationConfig",out _),"D14 compact map omits duplicate settings");
            }
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?profileId=map-d14")))
                check(doc.RootElement.GetProperty("events")[0].GetProperty("detail").GetString()==reservation,"D14 full diagnostic retained");
            var emergency=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"d13-door-emergency.json"));
            await db.ExecuteAsync("""
                INSERT INTO comet_decision (raidId,time,cometSession,sequence,profileId,name,feature,decision,stage,reason,detail)
                VALUES ($raid,4995,$session,28,'map-d13','Example','D13','DoorEmergency','evaluated','visible-danger-weapon-unavailable',$detail)
                """, ("$raid",raidId),("$session",session),("$detail",emergency));
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?compact=true&profileId=map-d13&search=D13")))
            {
                var e=doc.RootElement.GetProperty("events")[0];var d=e.GetProperty("detail");var t=d.GetProperty("doorEmergency");
                check(e.GetProperty("feature").GetString()=="D13"&&e.GetProperty("stage").GetString()=="evaluated","D13 compact HTTP context");
                check(t.GetProperty("confirmed").GetBoolean()&&t.GetProperty("choice").GetString()=="retreat","D13 visible evidence and decision");
                check(t.GetProperty("actionObserved").GetBoolean()&&t.GetProperty("movementObserved").GetBoolean()&&!t.GetProperty("arrived").GetBoolean(),"D13 execution, movement and arrival remain distinct");
                check(t.GetProperty("remaining").GetDouble()==2&&t.GetProperty("alternatives").GetArrayLength()==3,"D13 fixed deadline and refusals retained");
                check(!d.TryGetProperty("doorEmergencyConfig",out _),"D13 compact map omits duplicate settings");
            }
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?profileId=map-d13")))
                check(doc.RootElement.GetProperty("events")[0].GetProperty("detail").GetString()==emergency,"D13 full diagnostic retained");
            var interruption=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"d12-door-interruption.json"));
            await db.ExecuteAsync("""
                INSERT INTO comet_decision (raidId,time,cometSession,sequence,profileId,name,feature,decision,stage,reason,detail)
                VALUES ($raid,4990,$session,27,'map-d12','Example','D12','DoorInterruption','evaluated','safe-stage-resumed',$detail)
                """, ("$raid",raidId),("$session",session),("$detail",interruption));
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?compact=true&profileId=map-d12&search=D12")))
            {
                var e=doc.RootElement.GetProperty("events")[0];var d=e.GetProperty("detail");var t=d.GetProperty("doorInterruption");
                check(e.GetProperty("feature").GetString()=="D12"&&e.GetProperty("stage").GetString()=="evaluated","D12 compact HTTP context");
                check(t.GetProperty("resumes").GetInt32()==1&&t.GetProperty("feintConsumed").GetBoolean(),"D12 consumed actions retained");
                check(t.GetProperty("nativeAccepted").GetBoolean()&&t.GetProperty("executionObserved").GetBoolean(),"D12 acceptance and execution retained");
                check(t.GetProperty("remaining").GetDouble()<12&&t.GetProperty("gates").GetArrayLength()==6,"D12 fixed deadline and validation gates retained");
            }
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?profileId=map-d12")))
                check(doc.RootElement.GetProperty("events")[0].GetProperty("detail").GetString()==interruption,"D12 full diagnostic retained");
            var support = File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"d11-door-support.json"));
            await db.ExecuteAsync("""
                INSERT INTO comet_decision (raidId,time,cometSession,sequence,profileId,name,feature,decision,stage,reason,detail)
                VALUES ($raid,4980,$session,26,'map-d11','Example','D11','DoorSupport','evaluated','support-angle-confirmed',$detail)
                """, ("$raid",raidId),("$session",session),("$detail",support));
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?compact=true&profileId=map-d11&search=D11")))
            {
                var e=doc.RootElement.GetProperty("events")[0];var d=e.GetProperty("detail");var t=d.GetProperty("doorSupport");
                check(e.GetProperty("feature").GetString()=="D11"&&e.GetProperty("stage").GetString()=="evaluated","D11 filtered HTTP");
                check(t.GetProperty("role").GetString()=="overwatch"&&t.GetProperty("leader").GetString()=="lead","D11 leader/support role retained");
                check(t.GetProperty("retained").GetBoolean()&&!t.GetProperty("arrived").GetBoolean(),"D11 actual current position is not travel");
                check(t.GetProperty("accepted").GetBoolean()&&t.GetProperty("angleVerified").GetBoolean(),"D11 native acceptance and actual angle retained");
                check(!d.TryGetProperty("config",out _),"D11 compact map omits config");
            }
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?profileId=map-d11")))
                check(doc.RootElement.GetProperty("events")[0].GetProperty("detail").GetString()==support,"D11 full diagnostic retained");
            var hold = File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"d10-door-hold.json"));
            await db.ExecuteAsync("""
                INSERT INTO comet_decision (raidId,time,cometSession,sequence,profileId,name,feature,decision,stage,reason,detail)
                VALUES ($raid,4970,$session,25,'map-d10','Example','D10','DoorHold','evaluated','hold-door-current-angle-good',$detail)
                """, ("$raid",raidId),("$session",session),("$detail",hold));
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?compact=true&profileId=map-d10&search=D10")))
            {
                var e=doc.RootElement.GetProperty("events")[0];var d=e.GetProperty("detail");var t=d.GetProperty("doorHold");
                check(e.GetProperty("feature").GetString()=="D10"&&e.GetProperty("stage").GetString()=="evaluated","D10 filtered HTTP");
                check(t.GetProperty("outcome").GetString()=="stay"&&t.GetProperty("estimatedTravel").GetDouble()==0,"D10 retained position has no travel");
                check(d.GetProperty("doorAmbush").GetProperty("retainedPosition").GetBoolean()&&!d.GetProperty("doorAmbush").GetProperty("arrived").GetBoolean(),"D10 does not invent arrival");
                check(t.GetProperty("minimumUsefulWait").GetDouble()==2&&t.GetProperty("currentProtection").GetDouble()==1,"D10 wait and protection retained");
                check(!d.TryGetProperty("doorAmbushConfig",out _),"D10 settings omitted from compact map");
            }
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?profileId=map-d10")))
                check(doc.RootElement.GetProperty("events")[0].GetProperty("detail").GetString()==hold,"D10 full diagnostic retained");
            var ambush = File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"d09-door-ambush.json"));
            await db.ExecuteAsync("""
                INSERT INTO comet_decision (raidId,time,cometSession,sequence,profileId,name,feature,decision,stage,reason,detail)
                VALUES ($raid,4960,$session,24,'map-d09','Example','D09','DoorAmbush','evaluated','ambush-watching-exit',$detail)
                """, ("$raid",raidId),("$session",session),("$detail",ambush));
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?compact=true&profileId=map-d09&search=D09")))
            {
                var e=doc.RootElement.GetProperty("events")[0];var t=e.GetProperty("detail").GetProperty("doorAmbush");
                check(e.GetProperty("feature").GetString()=="D09"&&e.GetProperty("stage").GetString()=="evaluated","D09 filtered HTTP");
                check(t.GetProperty("arrived").GetBoolean()&&t.GetProperty("angleVerified").GetBoolean(),"D09 arrival and eye/muzzle proof retained");
                check(!t.GetProperty("visualContact").GetBoolean(),"D09 does not invent spotting the enemy");
                check(t.GetProperty("remaining").GetDouble()==15&&t.GetProperty("sharedRemaining").GetDouble()==18,"D09 wait budget retained");
                check(!e.GetProperty("detail").TryGetProperty("doorAmbushConfig",out _),"D09 settings omitted from compact map");
            }
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?profileId=map-d09")))
                check(doc.RootElement.GetProperty("events")[0].GetProperty("detail").GetString()==ambush,"D09 full diagnostic retained");
            var searchClear = File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"d08-door-search.json"));
            await db.ExecuteAsync("""
                INSERT INTO comet_decision (raidId,time,cometSession,sequence,profileId,name,feature,decision,stage,reason,detail)
                VALUES ($raid,4950,$session,23,'map-d08','Example','D08','DoorSearchClear','evaluated','clear-entry-arrival-confirmed',$detail)
                """, ("$raid",raidId),("$session",session),("$detail",searchClear));
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?compact=true&profileId=map-d08&search=D08")))
            {
                var e=doc.RootElement.GetProperty("events")[0];var t=e.GetProperty("detail").GetProperty("doorRoomClear");
                check(e.GetProperty("feature").GetString()=="D08"&&e.GetProperty("stage").GetString()=="evaluated","D08 filtered HTTP");
                check(t.GetProperty("mode").GetString()=="search"&&t.GetProperty("chance").GetDouble()==35,"D08 mode and effective chance retained");
                check(t.GetProperty("selectionContactAge").GetDouble()==17.5&&t.GetProperty("contactLimit").GetDouble()==25,"D08 original age and bounded lifetime retained");
                check(!t.GetProperty("throwRequested").GetBoolean()&&t.GetProperty("arrived").GetBoolean(),"D08 direct arrival proof retained");
                check(t.GetProperty("alternatives").GetArrayLength()==3,"D08 rejected alternatives retained");
                check(!e.GetProperty("detail").TryGetProperty("doorSearchClearConfig",out _),"D08 settings omitted from compact map");
            }
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?profileId=map-d08")))
                check(doc.RootElement.GetProperty("events")[0].GetProperty("detail").GetString()==searchClear,"D08 full diagnostic retained");
            const string clear = """{"doorRoomClear":{"state":"completed","reason":"clear-entry-arrival-confirmed","door":"door","target":"enemy","source":"heard","personality":"Chad","chance":30,"roll":0,"variantRoll":0,"variant":"grenade","contactAge":1,"knownX":0,"knownY":0,"knownZ":5,"x":0,"y":0,"z":2,"coveredDestination":true,"doorOpenObserved":true,"feintAttempted":false,"feint":"none","feintOutcome":"not-attempted","throwRequested":true,"throwAccepted":true,"grenadeItem":"grenade","projectile":5,"projectileObserved":true,"explosionConfirmed":true,"grenadeOutcome":"explosion-confirmed","dangerRadius":8,"blastPause":0.5,"fuseEstimate":3.5,"movementRequested":true,"movementAccepted":true,"movementObserved":true,"thresholdCrossed":true,"arrived":true,"weaponReady":true,"elapsed":6.099999999999994,"validFor":1.5,"alternatives":["Direct entry: eligible","Grenade entry: eligible","Resume native combat/search if the selected plan becomes invalid"]},"doorRoomClearConfig":{"enabled":true,"chances":{"GigaChad":40,"Chad":30,"Wreckless":35,"Normal":15,"Rat":0,"SnappingTurtle":0,"Coward":0,"Timmy":0},"contactLifetime":10,"grenadePreference":50,"allowFeint":true,"minimumAmmo":50,"minimumStamina":35,"depthMin":2,"depthMax":3,"blastPauseMin":0.3,"blastPauseMax":0.7,"targetCooldown":60}}""";
            await db.ExecuteAsync("""
                INSERT INTO comet_decision (raidId,time,cometSession,sequence,profileId,name,feature,decision,stage,reason,detail)
                VALUES ($raid,4900,$session,22,'map-d07','Example','D07','DoorRoomClear','evaluated','clear-entry-arrival-confirmed',$detail)
                """, ("$raid",raidId),("$session",session),("$detail",clear));
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?compact=true&profileId=map-d07&search=D07")))
            {
                var e=doc.RootElement.GetProperty("events")[0];var t=e.GetProperty("detail").GetProperty("doorRoomClear");
                check(e.GetProperty("feature").GetString()=="D07"&&e.GetProperty("stage").GetString()=="evaluated","D07 filtered HTTP");
                check(t.GetProperty("explosionConfirmed").GetBoolean()&&t.GetProperty("projectile").GetInt32()==5,"D07 real projectile proof retained");
                check(t.GetProperty("arrived").GetBoolean()&&t.GetProperty("thresholdCrossed").GetBoolean(),"D07 actual arrival retained");
                check(t.GetProperty("alternatives").GetArrayLength()==3,"D07 variant alternatives retained");
                check(!e.GetProperty("detail").TryGetProperty("doorRoomClearConfig",out _),"D07 settings omitted from compact map");
            }
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?profileId=map-d07")))
                check(doc.RootElement.GetProperty("events")[0].GetProperty("detail").GetString()==clear,"D07 full diagnostic retained");
            const string medical = """{"doorFakeGrenadeConfig":{"enabled":true,"chances":{"GigaChad":30,"Chad":20,"Normal":10,"Wreckless":5,"Rat":0,"SnappingTurtle":0,"Coward":0,"Timmy":0},"doorDistance":3,"contactDistance":10,"contactLifetime":15,"targetCooldown":60,"cooldown":20},"doorFakeMedical":{"state":"holstering","reason":"fake-medical-stop-requested","interrupted":"","door":"test-door","target":"known","source":"heard","personality":"Chad","grenade":"","weapon":"rifle","reaction":"not-observed","chance":20,"roll":12,"knownX":0,"knownY":0,"knownZ":4,"contactAge":3,"elapsed":0.5,"coverVerified":true,"drawRequested":true,"callbackCompleted":true,"callbackSucceeded":true,"handsObserved":true,"holsterRequested":true,"holsterAccepted":false,"weaponReady":false,"guard":false,"recoveryFailed":false,"holsterAttempts":1,"validFor":1.5,"alternatives":["Normal SAIN search"],"kind":"heal","medicalPreference":50,"styleRoll":12,"grenadeEligible":true,"medicalEligible":"heal","medical":{"kind":"heal","item":"med-kit","bodyPart":"LeftArm","resourceBefore":100,"resourceAfter":100,"consumptionObserved":false,"consumptionEvidence":"not-observed","useCallbackCompleted":false,"useCallbackSucceeded":false,"nativeStopRequested":true,"medicalHandoff":false,"cooldownRestored":true}},"doorFakeMedicalConfig":{"enabled":true,"stimulators":true,"preference":50}}""";
            await db.ExecuteAsync("""
                INSERT INTO comet_decision (raidId,time,cometSession,sequence,profileId,name,feature,decision,stage,reason,detail)
                VALUES ($raid,4800,$session,21,'map-d06','Example','D06','DoorFakeMedical','evaluated','fake-medical-stop-requested',$detail)
                """, ("$raid",raidId),("$session",session),("$detail",medical));
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?compact=true&profileId=map-d06&search=D06")))
            {
                var e=doc.RootElement.GetProperty("events")[0];var t=e.GetProperty("detail").GetProperty("doorFakeMedical");var m=t.GetProperty("medical");
                check(e.GetProperty("feature").GetString()=="D06"&&e.GetProperty("stage").GetString()=="evaluated","D06 filtered HTTP");
                check(t.GetProperty("handsObserved").GetBoolean()&&!t.GetProperty("weaponReady").GetBoolean(),"D06 observed medicine is not ready weapon");
                check(m.GetProperty("nativeStopRequested").GetBoolean()&&!t.GetProperty("holsterAccepted").GetBoolean(),"D06 void cancellation not acceptance");
                check(!m.GetProperty("consumptionObserved").GetBoolean()&&m.GetProperty("resourceBefore").GetInt32()==100,"D06 consumption evidence retained");
                check(!e.GetProperty("detail").TryGetProperty("doorFakeMedicalConfig",out _),"D06 settings omitted from compact map");
            }
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?profileId=map-d06")))
                check(doc.RootElement.GetProperty("events")[0].GetProperty("detail").GetString()==medical,"D06 full diagnostic preserved");
            const string fake = """{"doorFakeGrenade":{"state":"holstering","reason":"fake-holster-accepted","interrupted":"","door":"test-door","target":"known","source":"heard","personality":"Chad","grenade":"nade","weapon":"rifle","reaction":"not-observed","chance":20,"roll":12,"knownX":0,"knownY":0,"knownZ":4,"contactAge":3,"elapsed":0.5,"coverVerified":true,"drawRequested":true,"callbackCompleted":true,"callbackSucceeded":true,"handsObserved":true,"holsterRequested":true,"holsterAccepted":true,"weaponReady":false,"guard":true,"recoveryFailed":false,"holsterAttempts":1,"validFor":1.5,"alternatives":["Normal SAIN search"]},"doorFakeGrenadeConfig":{"enabled":true,"chances":{"GigaChad":30,"Chad":20,"Normal":10,"Wreckless":5,"Rat":0,"SnappingTurtle":0,"Coward":0,"Timmy":0},"doorDistance":3,"contactDistance":10,"contactLifetime":15,"targetCooldown":60,"cooldown":20}}""";
            await db.ExecuteAsync("""
                INSERT INTO comet_decision (raidId,time,cometSession,sequence,profileId,name,feature,decision,stage,reason,detail)
                VALUES ($raid,4700,$session,20,'map-d05','Example','D05','DoorFakeGrenade','evaluated','fake-holster-accepted',$detail)
                """, ("$raid",raidId),("$session",session),("$detail",fake));
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?compact=true&profileId=map-d05&search=D05")))
            {
                var e=doc.RootElement.GetProperty("events")[0];var t=e.GetProperty("detail").GetProperty("doorFakeGrenade");
                check(e.GetProperty("feature").GetString()=="D05"&&e.GetProperty("stage").GetString()=="evaluated","D05 filtered HTTP");
                check(t.GetProperty("handsObserved").GetBoolean()&&!t.GetProperty("weaponReady").GetBoolean(),"D05 observed grenade is not recovered weapon");
                check(t.GetProperty("holsterAccepted").GetBoolean()&&t.GetProperty("guard").GetBoolean(),"D05 recovery and guard retained");
                check(!e.GetProperty("detail").TryGetProperty("doorFakeGrenadeConfig",out _),"D05 settings omitted from compact map");
            }
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?profileId=map-d05")))
                check(doc.RootElement.GetProperty("events")[0].GetProperty("detail").GetString()==fake,"D05 complete diagnostic preserved");
            const string step = """{"doorStepPeek":{"state":"observing","reason":"step-arrival-observed","parent":"D02","door":"test-door","target":"known","source":"heard","personality":"Chad","purpose":"check-known-side-of-opening","chance":50,"roll":12,"peek":1,"completed":0,"knownX":0,"knownY":0,"knownZ":4,"contactAge":3,"stackX":-1.2,"stackY":0,"stackZ":-0.9,"pointX":-0.4,"pointY":0,"pointZ":-0.9,"lookX":0.3,"lookY":1.3,"lookZ":0.6,"actualX":-0.4,"actualY":0,"actualZ":-0.9,"pose":1,"actualPose":1,"poseObserved":true,"movementAccepted":true,"movementObserved":true,"arrived":true,"returnAccepted":false,"returned":false,"looking":true,"visualAcquired":false,"observation":0.2,"requiredObservation":0.6,"rest":0,"requiredRest":0.7,"elapsed":0.6,"remaining":5.4,"validFor":1.5,"alternatives":["Second angle must differ","Normal SAIN search remains available"]},"doorStepPeekConfig":{"enabled":true,"chance":50,"maximumPeeks":2,"distance":0.8,"observationMin":0.4,"observationMax":0.8,"restMin":0.5,"restMax":1,"limit":6,"varyPosture":true}}""";
            await db.ExecuteAsync("""
                INSERT INTO comet_decision (raidId,time,cometSession,sequence,profileId,name,feature,decision,stage,reason,detail)
                VALUES ($raid,4600,$session,19,'map-d04','Example','D04','DoorStepPeek','evaluated','step-arrival-observed',$detail)
                """, ("$raid",raidId),("$session",session),("$detail",step));
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?compact=true&profileId=map-d04&search=D04")))
            {
                var e=doc.RootElement.GetProperty("events")[0];var t=e.GetProperty("detail").GetProperty("doorStepPeek");
                check(e.GetProperty("feature").GetString()=="D04"&&e.GetProperty("stage").GetString()=="evaluated","D04 filtered HTTP");
                check(t.GetProperty("arrived").GetBoolean()&&!t.GetProperty("returned").GetBoolean(),"D04 outward arrival separate from return");
                check(t.GetProperty("poseObserved").GetBoolean()&&t.GetProperty("looking").GetBoolean()&&t.GetProperty("requiredObservation").GetDouble()==.6,"D04 view and posture observations retained");
                check(!e.GetProperty("detail").TryGetProperty("doorStepPeekConfig",out _),"D04 duplicate config omitted from map");
            }
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?profileId=map-d04")))
                check(doc.RootElement.GetProperty("events")[0].GetProperty("detail").GetString()==step,"D04 full diagnostics retained");
            const string run = """{"doorRunBy":{"state":"across","reason":"run-by-movement-accepted","style":"run-by","door":"test-door","target":"known","source":"heard","personality":"Chad","chance":25,"roll":12,"styleRoll":20,"preference":40,"jumpEligible":true,"runEligible":true,"jumpReason":"","runReason":"","knownX":0,"knownY":0,"knownZ":4,"contactAge":3,"stamina":50,"forwardSpeed":3,"distanceMoved":1,"elapsed":0.5,"remaining":5.5,"turnElapsed":0,"watchElapsed":0,"doorOpenObserved":true,"movementAccepted":true,"sprintObserved":true,"farArrived":false,"sprintExitObserved":false,"returnAccepted":false,"returned":false,"visualAcquired":false,"validFor":1.5,"alternatives":["Jump: eligible","Run-by: eligible","Normal SAIN search"]},"doorReconConfig":{"cooldown":45,"chances":{"Chad":25}},"doorRunByConfig":{"enabled":true,"preference":40,"fallback":true,"minimumStamina":35,"turnDelay":0.35,"limit":6,"watch":2}}""";
            await db.ExecuteAsync("""
                INSERT INTO comet_decision (raidId,time,cometSession,sequence,profileId,name,feature,decision,stage,reason,detail)
                VALUES ($raid,4500,$session,18,'map-d03','Example','D03','DoorRunBy','evaluated','run-by-movement-accepted',$detail)
                """, ("$raid",raidId),("$session",session),("$detail",run));
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?compact=true&profileId=map-d03&search=D03")))
            {
                var e=doc.RootElement.GetProperty("events")[0];var t=e.GetProperty("detail").GetProperty("doorRunBy");
                check(e.GetProperty("feature").GetString()=="D03"&&e.GetProperty("stage").GetString()=="evaluated","D03 filtered HTTP");
                check(t.GetProperty("sprintObserved").GetBoolean()&&!t.GetProperty("returned").GetBoolean(),"D03 sprint separate from return");
                check(t.GetProperty("chance").GetInt32()==25&&t.GetProperty("styleRoll").GetInt32()==20&&t.GetProperty("alternatives").GetArrayLength()==3,"D03 shared choice and alternatives retained");
                check(!e.GetProperty("detail").TryGetProperty("doorRunByConfig",out _),"D03 duplicate config omitted from map");
            }
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?profileId=map-d03")))
                check(doc.RootElement.GetProperty("events")[0].GetProperty("detail").GetString()==run,"D03 full diagnostics retained");
            const string jump = """{"doorJumpPeek":{"state":"airborne","reason":"peek-takeoff-observed","door":"test-door","target":"known","source":"heard","personality":"Normal","chance":10,"roll":5,"knownX":0,"knownY":0,"knownZ":3,"contactAge":3,"stamina":50,"forwardSpeed":1.4,"runUpDistance":0.3,"elapsed":0.5,"remaining":3.5,"observationElapsed":0,"doorOpenObserved":true,"movementAccepted":true,"jumpRequested":true,"takeoffObserved":true,"landingObserved":false,"visualAcquired":false,"returned":false,"validFor":1.5,"alternatives":["Normal SAIN search remains available."]},"doorJumpPeekConfig":{"enabled":true,"minimumStamina":35,"minimumSpeed":1.2,"observation":0.4,"limit":4,"cooldown":45,"returnJump":false}}""";
            await db.ExecuteAsync("""
                INSERT INTO comet_decision (raidId,time,cometSession,sequence,profileId,name,feature,decision,stage,reason,detail)
                VALUES ($raid,4400,$session,17,'map-d02','Example','D02','DoorJumpPeek','evaluated','peek-takeoff-observed',$detail)
                """, ("$raid",raidId),("$session",session),("$detail",jump));
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?compact=true&profileId=map-d02&search=D02")))
            {
                var e=doc.RootElement.GetProperty("events")[0];var t=e.GetProperty("detail").GetProperty("doorJumpPeek");
                check(e.GetProperty("feature").GetString()=="D02"&&e.GetProperty("stage").GetString()=="evaluated","D02 real filtered HTTP");
                check(t.GetProperty("takeoffObserved").GetBoolean()&&!t.GetProperty("landingObserved").GetBoolean(),"D02 takeoff separate from landing");
                check(t.GetProperty("chance").GetInt32()==10&&t.GetProperty("alternatives").GetArrayLength()==1,"D02 chance and alternatives retained");
                check(!e.GetProperty("detail").TryGetProperty("doorJumpPeekConfig",out _),"D02 duplicate config omitted on map");
            }
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?profileId=map-d02")))
                check(doc.RootElement.GetProperty("events")[0].GetProperty("detail").GetString()==jump,"D02 full diagnostics including settings retained");
            const string door = """{"doorApproach":{"state":"approaching","reason":"door-approaching","target":"known","source":"heard","door":"test-door","side":"right","knownX":0,"knownY":0,"knownZ":3,"contactAge":3,"x":1.2,"y":0,"z":-0.9,"pathLength":4,"elapsed":1,"remaining":11,"requested":true,"movementAccepted":true,"moved":true,"arrived":false,"validFor":1.5,"candidates":[{"door":"nearest","side":"left","eligible":false,"reason":"door-point-occupied"},{"door":"test-door","side":"right","eligible":true,"reason":"door-reachable-protected-frame","pathLength":4,"score":4}]},"doorApproachConfig":{"enabled":true,"doorDistance":8,"contactDistance":12,"unseenDelay":1.5,"contactLifetime":60,"approachLimit":12}}""";
            await db.ExecuteAsync("""
                INSERT INTO comet_decision (raidId,time,cometSession,sequence,profileId,name,feature,decision,stage,reason,detail)
                VALUES ($raid,4300,$session,16,'map-d01','Example','D01','DoorApproach','evaluated','door-approaching',$detail)
                """, ("$raid",raidId),("$session",session),("$detail",door));
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?compact=true&profileId=map-d01&search=D01")))
            {
                var e=doc.RootElement.GetProperty("events")[0];var t=e.GetProperty("detail").GetProperty("doorApproach");
                check(e.GetProperty("feature").GetString()=="D01"&&e.GetProperty("stage").GetString()=="evaluated","D01 real filtered HTTP");
                check(t.GetProperty("movementAccepted").GetBoolean()&&!t.GetProperty("arrived").GetBoolean(),"D01 request versus outcome retained");
                check(t.GetProperty("candidates").GetArrayLength()==2&&t.GetProperty("door").GetString()=="test-door","D01 chosen door and alternatives retained");
                check(!e.GetProperty("detail").TryGetProperty("doorApproachConfig",out _),"D01 config omitted from compact map");
            }
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?profileId=map-d01")))
                check(doc.RootElement.GetProperty("events")[0].GetProperty("detail").GetString()==door,"D01 full diagnostic retained");
            const string environment = """{"environmentContext":{"reported":"outdoor","source":"ai-zone+eft-environment","aiIndoorZone":false,"eftIndoor":false,"conflict":false,"age":0.1,"ceiling":"detected","ceilingHeight":3,"ceilingAge":0.1,"checkedDistance":20,"probeReason":"overhead-surface","purpose":"grenade-preparation","influence":"observation-only","validFor":0.4},"environmentConfig":{"enabled":true,"refresh":0.5,"movement":1,"ceilingDistance":20}}""";
            await db.ExecuteAsync("""
                INSERT INTO comet_decision (raidId,time,cometSession,sequence,profileId,name,feature,decision,stage,reason,detail)
                VALUES ($raid,4200,$session,15,'map-p10','Example','P10','EnvironmentContext','evaluated','environment-observed',$detail)
                """, ("$raid",raidId),("$session",session),("$detail",environment));
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?compact=true&profileId=map-p10&search=P10")))
            {
                var e=doc.RootElement.GetProperty("events")[0];var t=e.GetProperty("detail").GetProperty("environmentContext");
                check(e.GetProperty("feature").GetString()=="P10"&&e.GetProperty("stage").GetString()=="evaluated","P10 real filtered HTTP");
                check(t.GetProperty("reported").GetString()=="outdoor"&&t.GetProperty("ceiling").GetString()=="detected","P10 canopy distinction retained");
                check(t.GetProperty("ceilingHeight").GetInt32()==3&&t.GetProperty("age").GetDouble()==.1,"P10 geometry and age retained");
                check(!e.GetProperty("detail").TryGetProperty("environmentConfig",out _),"P10 config omitted from compact map");
            }
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?profileId=map-p10")))
                check(doc.RootElement.GetProperty("events")[0].GetProperty("detail").GetString()==environment,"P10 full diagnostic retained");
            const string abandonment = """{"searchAbandonment":{"state":"abandoned","reason":"search-check-position-empty","target":"known","silence":23,"requiredSilence":20,"inspected":3,"requiredInspection":3,"distance":2,"memoryRemaining":30,"validFor":3,"interruptions":1,"forgetRequested":true,"forgetObserved":true},"searchAbandonmentConfig":{"enabled":true,"silence":20,"inspection":3,"radius":3,"failedMemory":30}}""";
            await db.ExecuteAsync("""
                INSERT INTO comet_decision (raidId,time,cometSession,sequence,profileId,name,feature,decision,stage,reason,detail)
                VALUES ($raid,4100,$session,14,'map-p09','Example','P09','SearchAbandonment','evaluated','search-check-position-empty',$detail)
                """, ("$raid",raidId),("$session",session),("$detail",abandonment));
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?compact=true&profileId=map-p09&search=P09")))
            {
                var e=doc.RootElement.GetProperty("events")[0];var t=e.GetProperty("detail").GetProperty("searchAbandonment");
                check(e.GetProperty("feature").GetString()=="P09"&&e.GetProperty("stage").GetString()=="evaluated","P09 filtered HTTP");
                check(t.GetProperty("forgetRequested").GetBoolean()&&t.GetProperty("forgetObserved").GetBoolean(),"P09 request and native confirmation preserved");
                check(t.GetProperty("inspected").GetInt32()==3&&t.GetProperty("silence").GetInt32()==23&&t.GetProperty("memoryRemaining").GetInt32()==30,"P09 timers preserved");
                check(!e.GetProperty("detail").TryGetProperty("searchAbandonmentConfig",out _),"P09 duplicate config omitted from compact map");
            }
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?profileId=map-p09")))
                check(doc.RootElement.GetProperty("events")[0].GetProperty("detail").GetString()==abandonment,"P09 full diagnostic preserved");
            string c14=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"c14-preset.json"));
            await db.ExecuteAsync("INSERT INTO comet_decision (raidId,time,cometSession,sequence,profileId,name,feature,decision,stage,reason,detail) VALUES ($raid,4999,$session,1400,'','SAIN preset','C14','SainPreset','context','initial',$detail)",("$raid",raidId),("$session",session),("$detail",c14));
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?search=C14")))
                check(doc.RootElement.GetProperty("events")[0].GetProperty("detail").GetString()==c14,"C14 exact authority context in HTTP diagnostics");
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?compact=true&search=C14"))) {
                var presetDetail=doc.RootElement.GetProperty("events")[0].GetProperty("detail");
                check(presetDetail.GetProperty("sainPreset").GetProperty("name").GetString()=="Selected OFF","C14 selected preset in compact HTTP");
                check(presetDetail.GetProperty("configRevision").GetInt32()==17,"C14 COMET revision in compact HTTP");
            }
            string c13=File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"c13-cleanup.json"));
            await db.ExecuteAsync("INSERT INTO comet_decision (raidId,time,cometSession,sequence,profileId,name,feature,decision,stage,reason,detail) VALUES ($raid,5000,$session,1300,'','Raid cleanup','C13','RaidCleanup','cleanup','world-ended',$detail)",("$raid",raidId),("$session",session),("$detail",c13));
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?search=C13")))
                check(doc.RootElement.GetProperty("events")[0].GetProperty("detail").GetString()==c13,"C13 full cleanup counts and failures in HTTP diagnostics");
            using(var doc=JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_decisions?compact=true&search=C13")))
                check(doc.RootElement.GetProperty("events")[0].GetProperty("detail").GetProperty("raidCleanup").GetProperty("remainingBots").GetInt32()==0,"C13 cleanup evidence retained in compact export");
        }
        finally { await db.ExecuteAsync("DELETE FROM comet_decision WHERE cometSession=$session",("$session",session)); }
    }
}
