using System;
using System.Collections.Generic;
using EFT.Airdrop;
using EFT.Interactive;
using EFT.SynchronizableObjects;
using UnityEngine;

namespace RAID_REVIEW
{
    internal static class AirdropFlightRecorder
    {
        private sealed class Flight
        {
            internal string Id;
            internal long NextSample;
        }

        private sealed class Point
        {
            public string flightId, kind, dropId;
            public long time;
            public float x, y, z, heading;
        }

        private static readonly Dictionary<int, Flight> Flights = new Dictionary<int, Flight>();
        private static readonly HashSet<string> ReleasedDrops = new HashSet<string>();
        private static readonly HashSet<string> ObservedDrops = new HashSet<string>();
        private static readonly List<Point> Pending = new List<Point>(32);
        private static int sequence;
        private static long flushAt;
        private static bool failed;
        private static bool Recording => !failed && RAID_REVIEW.CanCapture && RAID_REVIEW.sessionId != null;

        internal static void Reset()
        {
            Flights.Clear(); ObservedDrops.Clear(); ReleasedDrops.Clear(); Pending.Clear();
            sequence = 0; flushAt = 0; failed = false;
        }

        internal static void Sample(AirplaneSynchronizableObject plane)
        {
            if (!Recording || plane == null || !plane.IsActive || !plane.IsInited) return;
            using (RecordingPerformance.Measure(RecordingPerformance.Stage.Airdrop))
            {
                try
                {
                    var now = RAID_REVIEW.stopwatch.ElapsedMilliseconds;
                    var flight = GetFlight(plane);
                    if (now < flight.NextSample) return;
                    flight.NextSample = now + 500;
                    Add(flight.Id, "sample", "", plane.transform.position, plane.transform.eulerAngles.y, now);
                    if (now >= flushAt) Flush();
                }
                catch (Exception ex) { Fail(ex); }
            }
        }

        internal static void End(AirplaneSynchronizableObject plane)
        {
            if (plane == null) return;
            using (RecordingPerformance.Measure(RecordingPerformance.Stage.Airdrop))
            {
                try
                {
                    var key = plane.GetInstanceID();
                    if (!Flights.TryGetValue(key, out var flight)) return;
                    Flights.Remove(key);
                    if (!Recording) return;
                    Add(flight.Id, "end", "", plane.transform.position, plane.transform.eulerAngles.y, RAID_REVIEW.stopwatch.ElapsedMilliseconds);
                    Flush();
                }
                catch (Exception ex) { Fail(ex); }
            }
        }

        internal static void Released(ServerPlane plane)
        {
            if (!Recording || plane?._syncObject == null || plane._airdrop == null) return;
            using (RecordingPerformance.Measure(RecordingPerformance.Stage.Airdrop))
            {
                try
                {
                    var container = plane._airdrop.GetComponentInChildren<LootableContainer>();
                    if (container == null) return;
                    var id = container.GetInstanceID().ToString();
                    if (!ReleasedDrops.Add(id)) return;
                    ObservedDrops.Add(id);
                    var flight = GetFlight(plane._syncObject);
                    var now = RAID_REVIEW.stopwatch.ElapsedMilliseconds;
                    Add(flight.Id, "sample", "", plane.SyncObjectTransform.position, plane.SyncObjectTransform.eulerAngles.y, now);
                    Add(flight.Id, "release", id, plane._airdrop.transform.position, 0, now);
                    Flush();
                }
                catch (Exception ex) { Fail(ex); }
            }
        }

        internal static void Observed(ClientAirDrop drop)
        {
            // A remote peer can first see a crate after release. Preserve that distinction in the replay.
            if (!Recording || drop == null || drop.offlineMode || drop._syncObject == null || drop._syncObject.IsStatic) return;
            using (RecordingPerformance.Measure(RecordingPerformance.Stage.Airdrop))
            {
                try
                {
                    var container = drop._syncObject.GetComponentInChildren<LootableContainer>();
                    if (container == null) return;
                    var id = container.GetInstanceID().ToString();
                    if (!ObservedDrops.Add(id)) return;
                    Add("crate-" + id, "airborne", id, drop.SyncObjectTransform.position, 0, RAID_REVIEW.stopwatch.ElapsedMilliseconds);
                    Flush();
                }
                catch (Exception ex) { Fail(ex); }
            }
        }

        internal static void FinishRaid()
        {
            try { if (!failed && !Telemetry.Faulted) Flush(); }
            catch (Exception ex) { Fail(ex); }
            finally { Flights.Clear(); Pending.Clear(); ObservedDrops.Clear(); ReleasedDrops.Clear(); }
        }

        private static Flight GetFlight(AirplaneSynchronizableObject plane)
        {
            var key = plane.GetInstanceID();
            if (!Flights.TryGetValue(key, out var flight))
            {
                flight = new Flight { Id = "plane-" + plane.ObjectId + "-" + ++sequence };
                Flights.Add(key, flight);
            }
            return flight;
        }

        private static void Add(string id, string kind, string drop, Vector3 position, float heading, long time)
        {
            if (Pending.Count == 0) flushAt = time + 5000;
            Pending.Add(new Point { flightId = id, kind = kind, dropId = drop, time = time,
                x = position.x, y = position.y, z = position.z, heading = heading });
            if (Pending.Count >= 32) Flush();
        }

        private static void Flush()
        {
            if (Pending.Count == 0) return;
            // One small packet per five seconds, with immutable values only. No scene scans or per-frame JSON.
            var payload = new { sessionId = RAID_REVIEW.sessionId, points = Pending.ToArray() };
            Pending.Clear();
            Telemetry.SendSnapshot("AIRDROP_FLIGHT", payload);
        }

        private static void Fail(Exception ex)
        {
            if (failed) return;
            failed = true; Flights.Clear(); Pending.Clear();
            LoggerInstance.Log.LogWarning("Raid Review could not record the airdrop flight: " + ex.Message);
        }
    }
}
