using System.Collections.Generic;
using System.Reflection;
using EFT;
using SPT.Reflection.Patching;

namespace RAID_REVIEW
{
    internal static class RecordingRoster
    {
        private static readonly Dictionary<string, Player> active = new Dictionary<string, Player>();
        private static readonly HashSet<string> departed = new HashSet<string>();
        private static readonly Dictionary<string, PlayerStatus> statuses = new Dictionary<string, PlayerStatus>();
        private static readonly List<Player> snapshot = new List<Player>(64);
        private static readonly List<string> gone = new List<string>();

        internal static void Reset() { active.Clear(); departed.Clear(); statuses.Clear(); snapshot.Clear(); }
        internal static void Seed(GameWorld world)
        {
            Reset();
            // One historical pass at raid start, never at the 5 Hz capture cadence.
            foreach (var player in world.AllPlayersEverExisted) Add(player);
        }
        internal static void Add(Player player)
        {
            if (player == null) return;
            active[player.ProfileId] = player;
            departed.Remove(player.ProfileId);
        }
        internal static void Depart(Player player)
        {
            if (player == null) return;
            if (active.TryGetValue(player.ProfileId, out var current) && !ReferenceEquals(current, player)) return;
            // Keep the last reference until capture records metadata and the terminal status.
            Add(player);
            departed.Add(player.ProfileId);
        }
        internal static List<Player> Snapshot()
        {
            snapshot.Clear(); gone.Clear();
            foreach (var entry in active)
            {
                if (entry.Value == null) { Record(entry.Key, PlayerStatus.Unspawned); gone.Add(entry.Key); }
                else snapshot.Add(entry.Value);
            }
            foreach (var id in gone) { active.Remove(id); departed.Remove(id); }
            return snapshot;
        }
        internal static bool Observe(Player player)
        {
            var id = player.ProfileId;
            bool alive;
            try { alive = player.HealthController != null && player.HealthController.IsAlive; }
            catch { alive = false; }
            var state = !alive ? (player.KillerId == null ? PlayerStatus.Unspawned : PlayerStatus.Dead)
                : departed.Contains(id) ? PlayerStatus.Unspawned : PlayerStatus.Alive;
            Record(id, state);
            if (state == PlayerStatus.Alive) return true;
            active.Remove(id); departed.Remove(id);
            return false;
        }
        private static void Record(string id, PlayerStatus state)
        {
            if (statuses.TryGetValue(id, out var previous) && previous == state) return;
            statuses[id] = state;
            Telemetry.SendSnapshot("PLAYER_STATUS", new TrackingPlayerDeadOrUnspawned
            {
                sessionId = RAID_REVIEW.sessionId, profileId = id,
                time = RAID_REVIEW.stopwatch.ElapsedMilliseconds, status = state
            });
        }
        internal static void Finish(bool worldAvailable = true)
        {
            // Once the headless world is gone, disposed health controllers and Unity
            // references are not evidence that every remaining bot left the raid.
            if (!worldAvailable) return;
            foreach (var player in Snapshot())
            {
                // Headless teardown can already have disposed individual health controllers.
                // A missing final status must not prevent END and lose the entire raid.
                try { Observe(player); } catch { }
            }
        }
    }

    internal sealed class RecordingRegisterPatch : ModulePatch
    {
        protected override MethodBase GetTargetMethod() => typeof(GameWorld).GetMethod("RegisterPlayer");
        [PatchPostfix]
        private static void Postfix(IPlayer iPlayer)
        {
            if (RAID_REVIEW.CanCapture && iPlayer is Player player) RecordingRoster.Add(player);
        }
    }
    internal sealed class RecordingUnregisterPatch : ModulePatch
    {
        protected override MethodBase GetTargetMethod() => typeof(GameWorld).GetMethod("UnregisterPlayer");
        [PatchPrefix]
        private static void Prefix(IPlayer iPlayer)
        {
            if (RAID_REVIEW.CanCapture && iPlayer is Player player) RecordingRoster.Depart(player);
        }
    }
}
