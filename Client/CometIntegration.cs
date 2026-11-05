using System;
using System.Reflection;
using HarmonyLib;
using Newtonsoft.Json.Linq;
using UnityEngine;

namespace RAID_REVIEW
{
    internal static class CometIntegration
    {
        private static EventInfo published;
        private static Action<string> listener;
        private static EventInfo summaries;
        private static Action<string> summaryListener;
        private static readonly CometSummaryCapture summaryCapture = new CometSummaryCapture();
        private static Func<string, string> current;
        private static Func<string, string> crossfire;
        private static Func<string, string> postCombat;
        private static Action<string> warning;
        private static bool warned;
        private static Func<string> raidSession;
        private static readonly CometCleanupCapture cleanup = new CometCleanupCapture();
        private static string announcedSession;
        internal static void FinishRecording()
        {
            if(!RAID_REVIEW.CanCapture || RAID_REVIEW.sessionId==null)return;
            try {
                var comet=raidSession?.Invoke();
                if(string.IsNullOrEmpty(comet))return;
                Announce(comet);
                cleanup.Remember(comet,RAID_REVIEW.sessionId,RAID_REVIEW.stopwatch.ElapsedMilliseconds);
            } catch(Exception ex) { warning?.Invoke("RR COMET cleanup capture unavailable: "+ex.Message); }
        }
        private static void Announce(string comet)
        {
            if(comet==announcedSession)return;
            Telemetry.SendSnapshot("COMET_SESSION",new{sessionId=RAID_REVIEW.sessionId,cometSession=comet});
            announcedSession=comet;
        }

        internal static void Bind(Action<string> log)
        {
            warning = log;
            var type = AccessTools.TypeByName("Comet.Api.Decisions");
            if (type == null) return;
            try
            {
                if ((int)type.GetField("SchemaVersion").GetRawConstantValue() != 1)
                    throw new InvalidOperationException("Unsupported COMET telemetry version");
                current = (Func<string, string>)Delegate.CreateDelegate(typeof(Func<string, string>), type.GetMethod("GetCurrentDecision"));
                var angle = type.GetMethod("GetCrossfireDecision");
                if(angle != null) crossfire = (Func<string,string>)Delegate.CreateDelegate(typeof(Func<string,string>),angle);
                var recovery = type.GetMethod("GetPostCombatDecision");
                if(recovery != null) postCombat = (Func<string,string>)Delegate.CreateDelegate(typeof(Func<string,string>),recovery);
                var sessionMethod=type.GetMethod("GetRaidSession");
                if(sessionMethod!=null)raidSession=(Func<string>)Delegate.CreateDelegate(typeof(Func<string>),sessionMethod);
                published = type.GetEvent("Published");
                listener = Capture;
                published.AddEventHandler(null, listener);
                summaries=type.GetEvent("SummaryPublished");
                if(summaries!=null){summaryListener=CaptureSummary;summaries.AddEventHandler(null,summaryListener);}
            }
            catch (Exception ex) { Unbind(); log("RR COMET integration unavailable: " + ex.Message); }
        }
        private static void Capture(string json)
        {

            try
            {
                var data = CometEventHeader.Read(json);
                double realtime = data.Realtime;
                string target=RAID_REVIEW.sessionId;
                long time=0;
                bool ending=data.Feature=="C13" && data.Stage=="cleanup";
                string comet=data.Session;
                if(ending && cleanup.Take(comet,out var ended)) { target=ended.Session;time=ended.Time; }
                else {
                    if(!RAID_REVIEW.CanCapture || target==null || !RAID_REVIEW.stopwatch.IsRunning)return;
                    if(raidSession!=null && raidSession()!=comet)return;
                    time=Math.Max(0,RAID_REVIEW.stopwatch.ElapsedMilliseconds+(long)((realtime-Time.realtimeSinceStartup)*1000));
                    Announce(comet);
                }
                summaryCapture.Remember(comet,target,time);
                _ = Telemetry.SendSnapshot("COMET_DECISION", new {
                    sessionId = target, time,
                    cometSession = data.Session, sequence = data.Sequence,
                    profileId = data.ProfileId, name = data.Name,
                    feature = data.Feature, decision = data.Decision,
                    stage = data.Stage, reason = data.Reason, detail = json
                });
            }
            catch (Exception ex)
            {
                if (!warned) { warned = true; warning?.Invoke("RR could not record a COMET event: " + ex.Message); }
            }
        }
        private static void CaptureSummary(string json)
        {
            // No Unity calls, active profile or stopwatch reads on this callback.
            try
            {
                if(json.Length>32768)return;
                var data=JObject.Parse(json);
                string feature=(string)data["feature"];
                if((int?)data["schema"]!=1||(feature!="T01"&&feature!="T02"&&feature!="T03"&&feature!="T04")||(string)data["stage"]!="summary")return;
                var counters=data[feature=="T02"?"tacticCounters":"journalReport"] as JObject;if((int?)counters?["version"]!=1)return;
                string comet=(string)data["session"];
                int part=(int?)counters["part"]??-1,parts=(int?)counters["parts"]??0;
                if(!summaryCapture.Take(comet,feature,part,parts,out var target,out var time))return;
                _=Telemetry.SendSnapshot("COMET_DECISION",new{sessionId=target,time,cometSession=comet,
                    sequence=-(part+(feature=="T01"?1001:feature=="T03"?2001:feature=="T04"?3001:1)),profileId="",name="Raid report",feature,decision=feature=="T01"?"CombatJournal":feature=="T03"?"WeaponJournal":feature=="T04"?"ControlJournal":"TacticCounters",
                    stage="summary",reason="raid-ended",detail=json});
            }
            catch(Exception ex){warning?.Invoke("RR could not record COMET raid counters: "+ex.Message);}
        }
        internal static string Resolve(string profileId, string layer, string decision, bool ghost)
        {
            if(!ghost && layer == "COMET : Crossfire")
                try { return CometBehaviorDecision.ResolveCrossfire(crossfire?.Invoke(profileId),layer,decision,ghost); } catch { return decision; }
            if(!ghost && layer == "COMET : Post-combat")
                try { return CometBehaviorDecision.ResolvePostCombat(postCombat?.Invoke(profileId), layer, decision, ghost); } catch { return decision; }
            if (ghost || current == null || layer != "SAIN : Combat Layer") return decision;
            try
            {
                var label = current(profileId);
                return CometBehaviorDecision.Resolve(label, decision);
            }
            catch { return decision; }
        }
        internal static void Unbind()
        {
            if (published != null && listener != null) published.RemoveEventHandler(null, listener);
            if(summaries!=null&&summaryListener!=null)summaries.RemoveEventHandler(null,summaryListener);
            summaries=null;summaryListener=null;summaryCapture.Clear();
            published = null; listener = null; current = null; postCombat = null; crossfire = null; raidSession=null;announcedSession=null;cleanup.Clear();
        }
    }
}
