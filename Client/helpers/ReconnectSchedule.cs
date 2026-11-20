using System;

namespace RAID_REVIEW
{
    internal sealed class ReconnectSchedule
    {
        private const int MinSeconds = 5;
        private const int MaxSeconds = 60;
        private readonly object gate = new object();
        private int delaySeconds = MinSeconds;
        private TimeSpan nextAttempt;

        internal bool TrySchedule(bool hasWorld, string locationId, TimeSpan now, out int retryAfterSeconds)
        {
            retryAfterSeconds = 0;
            // A loading world can have no location yet, including on headless hosts.
            if (hasWorld && !string.Equals(locationId, "hideout", StringComparison.OrdinalIgnoreCase)) return false;
            lock (gate)
            {
                if (now < nextAttempt) return false;
                retryAfterSeconds = delaySeconds;
                nextAttempt = now + TimeSpan.FromSeconds(delaySeconds);
                delaySeconds = Math.Min(delaySeconds * 2, MaxSeconds);
                return true;
            }
        }

        // OnOpen runs on the socket thread, while the capture loop schedules attempts on the game thread.
        internal void Connected(TimeSpan now)
        {
            lock (gate)
            {
                delaySeconds = MinSeconds;
                nextAttempt = now + TimeSpan.FromSeconds(MinSeconds);
            }
        }
    }
}
