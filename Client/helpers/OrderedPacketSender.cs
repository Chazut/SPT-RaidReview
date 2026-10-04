using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Threading;

namespace RAID_REVIEW
{
    // One worker owns serialization and transport; callers transfer detached snapshots.
    internal sealed class OrderedPacketSender : IDisposable
    {
        private sealed class Packet
        {
            internal string Action;
            internal object Payload;
            internal long QueuedAt, Epoch;
        }
        internal struct Counters
        {
            internal int Pending, Peak;
            internal long Accepted, Sent, Dropped, Bytes, AllocatedBytes;
            internal double SerializeMs, SendMs, MaxSerializeMs, MaxSendMs, OldestMs;
        }
        private readonly object gate = new object();
        private readonly Queue<Packet> queue = new Queue<Packet>();
        private readonly int capacity;
        private readonly Func<string, object, string> serialize;
        private readonly Action<string> send, reportFailure;
        private bool stopped, faulted, busy;
        private long epoch, busySince;
        private Counters counters;
        internal static readonly Func<long> ReadAllocatedBytes = FindAllocationCounter();
        private static Func<long> FindAllocationCounter()
        {
            try
            {
                var method = typeof(GC).GetMethod("GetAllocatedBytesForCurrentThread", System.Reflection.BindingFlags.Static | System.Reflection.BindingFlags.Public);
                if (method == null) return null;
                var read = (Func<long>)Delegate.CreateDelegate(typeof(Func<long>), method);
                read(); // Some runtimes expose the API without implementing it.
                return read;
            }
            catch { return null; }
        }

        internal OrderedPacketSender(int capacity, Func<string, object, string> serialize,
            Action<string> send, Action<string> reportFailure)
        {
            if (capacity < 1) throw new ArgumentOutOfRangeException(nameof(capacity));
            this.capacity = capacity; this.serialize = serialize;
            this.send = send; this.reportFailure = reportFailure;
            new Thread(Run) { IsBackground = true, Name = "Raid Review sender" }.Start();
        }
        internal bool Faulted { get { lock (gate) return faulted || stopped; } }
        internal bool BeginRaid()
        {
            lock (gate)
            {
                if (stopped || (faulted && busy)) return false;
                // Healthy queues retain the preceding raid's END before the next START.
                faulted = false;
                return true;
            }
        }
        internal bool Enqueue(string action, object payload)
        {
            bool overflow = false;
            lock (gate)
            {
                if (stopped || faulted) { counters.Dropped++; return false; }
                if (queue.Count >= capacity)
                {
                    counters.Dropped++; FailLocked(); overflow = true;
                }
                else
                {
                    queue.Enqueue(new Packet { Action = action, Payload = payload,
                        QueuedAt = Stopwatch.GetTimestamp(), Epoch = epoch });
                    counters.Accepted++; counters.Peak = Math.Max(counters.Peak, queue.Count);
                    Monitor.Pulse(gate);
                }
            }
            if (overflow) reportFailure("sender queue is full; this raid recording is incomplete");
            return !overflow;
        }
        internal void Abort(string reason)
        {
            lock (gate)
            {
                if (stopped || faulted) return;
                FailLocked();
            }
            reportFailure(reason + "; this raid recording is incomplete");
        }
        private void FailLocked()
        {
            faulted = true; epoch++; counters.Dropped += queue.Count; queue.Clear();
        }
        internal Counters Snapshot()
        {
            lock (gate)
            {
                var result = counters;
                result.Pending = queue.Count + (busy ? 1 : 0);
                var oldest = busy ? busySince : queue.Count > 0 ? queue.Peek().QueuedAt : 0;
                result.OldestMs = oldest == 0 ? 0 : Milliseconds(Stopwatch.GetTimestamp() - oldest);
                return result;
            }
        }
        private void Run()
        {
            while (true)
            {
                Packet packet;
                lock (gate)
                {
                    while (!stopped && queue.Count == 0) Monitor.Wait(gate);
                    if (stopped) return;
                    packet = queue.Dequeue(); busy = true; busySince = packet.QueuedAt;
                }
                try
                {
                    var allocatedBefore = ReadAllocatedBytes?.Invoke() ?? -1;
                    var start = Stopwatch.GetTimestamp();
                    var json = serialize(packet.Action, packet.Payload);
                    var serialized = Stopwatch.GetTimestamp();
                    lock (gate)
                    {
                        if (stopped || packet.Epoch != epoch) { counters.Dropped++; continue; }
                    }
                    send(json);
                    var finished = Stopwatch.GetTimestamp();
                    lock (gate)
                    {
                        var serialization = Milliseconds(serialized - start);
                        var transmission = Milliseconds(finished - serialized);
                        counters.SerializeMs += serialization; counters.SendMs += transmission;
                        counters.MaxSerializeMs = Math.Max(counters.MaxSerializeMs, serialization);
                        counters.MaxSendMs = Math.Max(counters.MaxSendMs, transmission);
                        counters.Bytes += System.Text.Encoding.UTF8.GetByteCount(json); counters.Sent++;
                        if (allocatedBefore >= 0) counters.AllocatedBytes += ReadAllocatedBytes() - allocatedBefore;
                    }
                }
                catch (Exception ex)
                {
                    lock (gate) counters.Dropped++;
                    Abort("sender failed: " + ex.Message);
                }
                finally { lock (gate) { busy = false; Monitor.PulseAll(gate); } }
            }
        }
        internal static double Milliseconds(long ticks) => ticks * 1000.0 / Stopwatch.Frequency;
        public void Dispose()
        {
            lock (gate)
            {
                stopped = true; counters.Dropped += queue.Count; queue.Clear(); Monitor.PulseAll(gate);
            }
            // Never wait for a blocked socket on the game thread.
        }
    }
}
