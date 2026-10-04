using System;
using System.Collections.Generic;
using EFT;
using EFT.Interactive;

namespace RAID_REVIEW
{
    internal static class SwitchRecorder
    {
        private sealed class State
        {
            internal string Id;
            internal EDoorState Last;
        }

        private sealed class Change
        {
            public string switchId, name, state;
            public long time, sequence;
            public float x, y, z;
        }

        private static readonly Dictionary<Switch, State> Tracked = new Dictionary<Switch, State>();
        private static readonly List<Change> Pending = new List<Change>(32);
        private static long sequence;
        private static bool failed;

        internal static void Start(GameWorld world)
        {
            Reset();
            if (!RAID_REVIEW.CanCapture || world == null) return;
            using (RecordingPerformance.Measure(RecordingPerformance.Stage.Switch))
            {
                try
                {
                    // The network World registry can be absent in a local raid.
                    // Use the loaded location scenes, as native World does when
                    // building that registry. This scan runs once per raid.
                    foreach (var obj in LocationScene.GetAllObjects<WorldInteractiveObject>(true))
                    {
                        // LocationScene indexes arrays by their declared base
                        // type; querying Switch directly returns an empty set.
                        if (!(obj is Switch sw) || sw == null || Tracked.ContainsKey(sw)) continue;
                        try
                        {
                            var entry = new State { Id = string.IsNullOrEmpty(sw.Id) ? "instance-" + sw.GetInstanceID() : sw.Id,
                                Last = sw.DoorState };
                            Add(sw, entry, sw.DoorState, 0);
                            Tracked.Add(sw, entry);
                            sw.OnDoorStateChanged += Changed;
                        }
                        catch (Exception ex)
                        {
                            LoggerInstance.Log.LogWarning("Raid Review skipped an unavailable switch: " + ex);
                        }
                    }
                    LoggerInstance.Log.LogInfo("Raid Review recording " + Tracked.Count + " switches.");
                    Flush();
                }
                catch (Exception ex) { Fail(ex); }
            }
        }

        private static void Changed(WorldInteractiveObject obj, EDoorState before, EDoorState after)
        {
            if (failed || !RAID_REVIEW.CanCapture || !(obj is Switch sw)) return;
            using (RecordingPerformance.Measure(RecordingPerformance.Stage.Switch))
            {
                try
                {
                    if (!Tracked.TryGetValue(sw, out var entry) || entry.Last == after) return;
                    entry.Last = after;
                    Add(sw, entry, after, RAID_REVIEW.stopwatch.ElapsedMilliseconds);
                }
                catch (Exception ex) { Fail(ex); }
            }
        }

        private static void Add(Switch sw, State entry, EDoorState state, long time)
        {
            var pos = sw.transform.position;
            Pending.Add(new Change { switchId = entry.Id, name = sw.name ?? "Switch", state = state.ToString(),
                time = time, sequence = ++sequence, x = pos.x, y = pos.y, z = pos.z });
            if (Pending.Count >= 32) Flush();
        }

        internal static void Flush()
        {
            if (failed || Pending.Count == 0 || Telemetry.Faulted) return;
            using (RecordingPerformance.Measure(RecordingPerformance.Stage.Switch))
            {
                try
                {
                    var packet = new { sessionId = RAID_REVIEW.sessionId, changes = Pending.ToArray() };
                    Pending.Clear();
                    Telemetry.SendSnapshot("SWITCH_STATES", packet);
                }
                catch (Exception ex) { Fail(ex); }
            }
        }

        internal static void FinishRaid()
        {
            try { Flush(); }
            finally { Reset(); }
        }

        internal static void Reset()
        {
            foreach (var sw in Tracked.Keys)
                if (!ReferenceEquals(sw, null)) sw.OnDoorStateChanged -= Changed;
            Tracked.Clear(); Pending.Clear(); sequence = 0; failed = false;
        }

        private static void Fail(Exception ex)
        {
            Reset(); failed = true;
            LoggerInstance.Log.LogWarning("Raid Review could not record switches: " + ex);
        }
    }
}
