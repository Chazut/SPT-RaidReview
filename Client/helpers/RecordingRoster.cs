using System.Collections.Generic;
using System;
using System.Reflection;
using HarmonyLib;
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
        private static readonly Dictionary<string, PlayerStatus> confirmed = new Dictionary<string, PlayerStatus>();
        private static readonly List<string> gone = new List<string>();
        internal static bool IsEnding { get; private set; }

        internal static void Reset() { active.Clear(); departed.Clear(); statuses.Clear(); confirmed.Clear(); snapshot.Clear(); IsEnding = false; }
        internal static void Seed(GameWorld world)
        {
            Reset();
            // One historical pass at raid start, never at the 5 Hz capture cadence.
            foreach (var player in world.AllPlayersEverExisted) Add(player);
        }
        internal static void Add(Player player)
        {
            if (IsEnding || player == null) return;
            active[player.ProfileId] = player;
            departed.Remove(player.ProfileId);
        }
        internal static void Confirm(Player player, PlayerStatus status)
        {
            if (player != null) Confirm(player.ProfileId, status);
        }
        internal static void Confirm(string profileId, PlayerStatus status)
        {
            if (IsEnding || string.IsNullOrEmpty(profileId) || (status != PlayerStatus.Dead && status != PlayerStatus.Extracted)) return;
            if (confirmed.TryGetValue(profileId, out var previous) && previous == PlayerStatus.Dead) return;
            confirmed[profileId] = status;
            // A network confirmation can arrive after UnregisterPlayer was observed.
            // Correct that recorded removal even if its Player has already been disposed.
            if (!active.ContainsKey(profileId) && statuses.ContainsKey(profileId)) Record(profileId, status);
        }
        internal static void Depart(Player player)
        {
            if (IsEnding || player == null) return;
            if (active.TryGetValue(player.ProfileId, out var current) && !ReferenceEquals(current, player)) return;
            // Keep the last reference until capture records metadata and the terminal status.
            Add(player);
            departed.Add(player.ProfileId);
        }
        internal static List<Player> Snapshot()
        {
            snapshot.Clear(); gone.Clear();
            if (IsEnding) return snapshot;
            foreach (var entry in active)
            {
                if (entry.Value == null) { Record(entry.Key, confirmed.TryGetValue(entry.Key, out var terminal) ? terminal : PlayerStatus.Unspawned); gone.Add(entry.Key); }
                else snapshot.Add(entry.Value);
            }
            foreach (var id in gone) { active.Remove(id); departed.Remove(id); }
            return snapshot;
        }
        internal static bool Observe(Player player)
        {
            if (IsEnding) return false;
            var id = player.ProfileId;
            PlayerStatus state;
            if (!confirmed.TryGetValue(id, out state))
            {
                // Death does not require a killer: mines, falls and scripted deaths have none.
                // A disposed/missing controller alone cannot prove a death or an extraction.
                try
                {
                    var health = player.HealthController;
                    state = health != null && !health.IsAlive ? PlayerStatus.Dead
                        : departed.Contains(id) ? PlayerStatus.Unspawned
                        : health == null ? PlayerStatus.Unknown : PlayerStatus.Alive;
                }
                catch { state = PlayerStatus.Unknown; }
                if (state == PlayerStatus.Dead) confirmed[id] = state;
            }
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
        internal static void BeginTeardown()
        {
            if (IsEnding) return;
            // Sample while the world is still intact, then ignore disposal callbacks.
            // Fika stops bots before OnGameSessionEnd, sometimes across several capture ticks.
            try { Finish(); }
            finally { IsEnding = true; active.Clear(); departed.Clear(); snapshot.Clear(); }
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
    internal sealed class RecordingDeathPatch : ModulePatch
    {
        protected override MethodBase GetTargetMethod() => AccessTools.Method(typeof(Player), "OnDead", new[] { typeof(EDamageType) });
        [PatchPrefix]
        private static void Prefix(Player __instance)
        {
            if (RAID_REVIEW.CanCapture) RecordingRoster.Confirm(__instance, PlayerStatus.Dead);
        }
    }
    internal sealed class RecordingExtractPatch : ModulePatch
    {
        private static FieldInfo owner;
        protected override MethodBase GetTargetMethod()
        {
            for (var type = typeof(BotLeaveData); type != null && owner == null; type = type.BaseType)
                foreach (var field in type.GetFields(BindingFlags.Instance | BindingFlags.NonPublic | BindingFlags.Public | BindingFlags.DeclaredOnly))
                    if (field.FieldType == typeof(BotOwner)) { owner = field; break; }
            if (owner == null) throw new MissingFieldException("BotLeaveData owner");
            return typeof(BotLeaveData).GetMethod(nameof(BotLeaveData.RemoveFromMap));
        }
        [PatchPrefix]
        private static void Prefix(BotLeaveData __instance, out string __state)
        {
            __state = null;
            if (!RAID_REVIEW.CanCapture) return;
            var player = (owner.GetValue(__instance) as BotOwner)?.GetPlayer;
            // RemoveFromMap returns the bot to its pool and destroys the Player component
            // before the postfix. Retain identity without depending on that Unity object.
            if (player?.HealthController?.IsAlive == true) __state = player.ProfileId;
        }
        [PatchPostfix]
        private static void Postfix(BotLeaveData __instance, string __state)
        {
            if (RAID_REVIEW.CanCapture && __state != null && __instance.LeaveComplete)
                RecordingRoster.Confirm(__state, PlayerStatus.Extracted);
        }
    }

}
