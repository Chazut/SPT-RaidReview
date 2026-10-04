using System;
using System.Diagnostics;
using System.Globalization;
using System.Reflection;
using System.Text;

namespace RAID_REVIEW
{
    internal static class RecordingPerformance
    {
        internal enum Stage { Capture, Ballistics, Loot, Kill, Airdrop, Sain, Switch }
        private static readonly long[] calls = new long[7], ticks = new long[7], allocations = new long[7];
        private static readonly double[] maxima = new double[7];
        private static readonly Func<long> allocated = OrderedPacketSender.ReadAllocatedBytes;
        private static long lastReport;
        private static int gc0, gc1, gc2;
        private static OrderedPacketSender.Counters previous;
        internal static bool Enabled => RAID_REVIEW.PerformanceLogging?.Value == true;

        internal struct Sample : IDisposable
        {
            private readonly long start, bytes;
            private readonly int stage;
            internal Sample(Stage stage)
            {
                this.stage = (int)stage;
                start = Enabled ? Stopwatch.GetTimestamp() : 0;
                bytes = start != 0 && allocated != null ? allocated() : 0;
            }
            public void Dispose()
            {
                if (start == 0) return;
                var elapsed = Stopwatch.GetTimestamp() - start;
                calls[stage]++; ticks[stage] += elapsed;
                maxima[stage] = Math.Max(maxima[stage], OrderedPacketSender.Milliseconds(elapsed));
                if (allocated != null) allocations[stage] += allocated() - bytes;
            }
        }
        internal static Sample Measure(Stage stage) => new Sample(stage);
        internal static void Reset()
        {
            Array.Clear(calls, 0, calls.Length); Array.Clear(ticks, 0, ticks.Length);
            Array.Clear(allocations, 0, allocations.Length); Array.Clear(maxima, 0, maxima.Length);
            lastReport = Stopwatch.GetTimestamp(); previous = Telemetry.Counters;
            gc0 = GC.CollectionCount(0); gc1 = GC.CollectionCount(1); gc2 = GC.CollectionCount(2);
        }
        internal static void Report(bool final = false)
        {
            if (!Enabled) return;
            var now = Stopwatch.GetTimestamp();
            var seconds = (now - lastReport) / (double)Stopwatch.Frequency;
            if (!final && seconds < 10) return;
            var c = Telemetry.Counters;
            var text = new StringBuilder("[RR-PERF] ").Append(final ? "final " : "window ");
            text.AppendFormat(CultureInfo.InvariantCulture, "t={0}ms frame={1} window={2:F1}s playersSeen={3} mainPlayer={4}; ",
                RAID_REVIEW.stopwatch.ElapsedMilliseconds, UnityEngine.Time.frameCount, seconds,
                RAID_REVIEW.trackingPlayers.Count, RAID_REVIEW.myPlayer != null);
            for (var i = 0; i < calls.Length; i++)
            {
                if (calls[i] == 0) continue;
                text.AppendFormat(CultureInfo.InvariantCulture, "{0}:calls={1},total={2:F2}ms,max={3:F2}ms,alloc={4}; ",
                    (Stage)i, calls[i], OrderedPacketSender.Milliseconds(ticks[i]), maxima[i],
                    allocated == null ? "unavailable" : allocations[i].ToString(CultureInfo.InvariantCulture));
            }
            text.AppendFormat(CultureInfo.InvariantCulture,
                "queue={0},peak={1},oldest={2:F1}ms sent={3} packets/s={4:F1} bytes/s={5:F0} serialize={6:F2}ms send={7:F2}ms serializeMaxLifetime={8:F2}ms sendMaxLifetime={9:F2}ms dropped={10} GC={11}/{12}/{13} heap={14}B senderAlloc={15}",
                c.Pending, c.Peak, c.OldestMs, c.Sent - previous.Sent,
                (c.Sent - previous.Sent) / Math.Max(seconds, .001), (c.Bytes - previous.Bytes) / Math.Max(seconds, .001),
                c.SerializeMs - previous.SerializeMs, c.SendMs - previous.SendMs, c.MaxSerializeMs, c.MaxSendMs,
                c.Dropped, GC.CollectionCount(0) - gc0, GC.CollectionCount(1) - gc1,
                GC.CollectionCount(2) - gc2, GC.GetTotalMemory(false),
                allocated == null ? "unavailable" : (c.AllocatedBytes - previous.AllocatedBytes).ToString(CultureInfo.InvariantCulture));
            LoggerInstance.Log.LogInfo(text.ToString());
            Reset();
        }
    }
}
