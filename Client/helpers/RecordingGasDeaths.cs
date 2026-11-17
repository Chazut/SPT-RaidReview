using System.Collections.Generic;
using EFT;

namespace RAID_REVIEW
{
    // OnBeenKilledByAggressor does not run for environmental gas explosions.
    internal static class RecordingGasDeaths
    {
        private static readonly HashSet<string> recorded = new HashSet<string>();
        internal static void Reset() => recorded.Clear();
        internal static void Capture(Player player, EDamageType damage, IPlayer aggressor)
        {
            if (!RAID_REVIEW.CanCapture || !RAID_REVIEW.KillTracking.Value || player == null
                || player.Location == "hideout" || damage != EDamageType.HotGases || aggressor != null
                || recorded.Contains(player.ProfileId)) return;
            var position = new JsonPosition(player.Position);
            var death = new TrackingRaidKill
            {
                sessionId = RAID_REVIEW.sessionId, time = RAID_REVIEW.stopwatch.ElapsedMilliseconds,
                profileId = player.ProfileId, killedId = player.ProfileId, type = damage.ToString(),
                weapon = "Gas explosion", weaponTemplateId = "", bodyPart = "", distance = 0,
                positionKiller = position, positionKilled = position
            };
            if (Telemetry.SendSnapshot("KILL", death)) recorded.Add(player.ProfileId);
        }
    }
}
