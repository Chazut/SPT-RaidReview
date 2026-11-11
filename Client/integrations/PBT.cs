using System;
using System.Collections.Generic;
using BepInEx.Bootstrap;
using EFT;
using UnityEngine;

namespace RAID_REVIEW
{
    internal static class PbtIntegration
    {
        private static bool initialized, warned, detected;
        private static PbtCheaterReader reader;
        // Only IDs/timestamps are retained; no Player/GameWorld references.
        private static readonly Dictionary<string, float> nextRead = new Dictionary<string, float>();

        internal static void Reset() => nextRead.Clear();

        internal static void Initialize()
        {
            if (!initialized)
            {
                initialized = true;
                try
                {
                    if (Chainloader.PluginInfos.TryGetValue("com.local.pbt.client", out var plugin))
                    {
                        detected = true;
                        reader = new PbtCheaterReader(plugin.Instance.GetType().Assembly
                            .GetType("PBT.Client.Cheaters.CheaterRoster"));
                        RAID_REVIEW.RAID_REVIEW__DETECTED_MODS.Add("PBT");
                        LoggerInstance.Log.LogInfo("[RR PBT] Read-only cheater capture enabled.");
                        if (!reader.Supported) Warn("Roster contract unavailable; recording PbtCheater layer only.");
                    }
                }
                catch (Exception ex) { Warn(ex.GetType().Name); }
            }
        }

        internal static bool Capture(Player player, TrackingPlayer data)
        {
            Initialize();
            if (!detected || player == null || data == null || string.IsNullOrEmpty(data.profileId) || !player.IsAI) return false;
            var now = Time.unscaledTime;
            if (nextRead.TryGetValue(data.profileId, out var next) && now < next) return false;
            nextRead[data.profileId] = now + 1f;
            try
            {
                PbtIdentity identity = null;
                try { if (int.TryParse(player.Profile?.AccountId, out var account)) identity = reader?.Read(account); }
                catch (Exception ex) { Warn("Roster read for " + data.profileId + ": " + ex); }
                // During spawn/teardown Brain can exist before its active-layer container.
                // Roster identity must not depend on that transient layer being readable.
                string layer = null;
                if (identity == null)
                    try { layer = player.AIData?.BotOwner?.Brain?.ActiveLayerName(); }
                    catch (NullReferenceException) { /* Retry on the next bounded sample. */ }
                    catch (Exception ex) { Warn("Layer read for " + data.profileId + ": " + ex); }
                if (identity == null && layer != "PbtCheater") return false;
                var changed = !data.mod_PBT_cheater;
                data.mod_PBT_cheater = true;
                if (!string.IsNullOrEmpty(identity?.Personality) && data.mod_PBT_personality != identity.Personality)
                { data.mod_PBT_personality = identity.Personality; changed = true; }
                if (!string.IsNullOrEmpty(identity?.Cheats) && data.mod_PBT_cheats != identity.Cheats)
                { data.mod_PBT_cheats = identity.Cheats; changed = true; }
                if (changed) LoggerInstance.Log.LogInfo($"[RR PBT] Cheater {data.profileId}: personality={data.mod_PBT_personality ?? "unknown"}; assigned cheats={data.mod_PBT_cheats ?? "unknown"}");
                return changed;
            }
            catch (Exception ex) { Warn(ex.GetType().Name); return false; }
        }

        private static void Warn(string message)
        {
            if (warned) return;
            warned = true;
            LoggerInstance.Log.LogWarning("[RR PBT] " + message);
        }
    }
}
