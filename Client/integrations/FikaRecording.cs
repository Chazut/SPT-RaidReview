using System;
using System.Collections;
using System.Reflection;
using Comfort.Common;
using EFT;
using EFT.InventoryLogic;
using HarmonyLib;

namespace RAID_REVIEW
{
    // Optional, event-driven integration. No Fika reference is required in solo SPT.
    internal static class FikaRecording
    {
        private static Type observedType;
        private static Type fikaPlayerType;
        private static PropertyInfo downed;
        private static PropertyInfo networkInstance, coopHandler, players, extractedPlayers;
        private static bool warned;

        internal static bool HandlesLoot(Player player) => observedType?.IsInstanceOfType(player) == true;

        internal static bool IsDowned(Player player) => player != null && !player.IsAI
            && fikaPlayerType?.IsInstanceOfType(player) == true && downed?.GetValue(player) is true;

        internal static void Initialize(Assembly fika)
        {
            if (fika == null) return;
            var harmony = new Harmony("ekky.raidreview.fika-recording");
            try
            {
                var type = fika.GetType("Fika.Core.Main.Players.ObservedPlayer", true);
                var method = type.GetMethod("OnItemAddedOrRemoved", BindingFlags.Instance | BindingFlags.Public
                    | BindingFlags.NonPublic | BindingFlags.DeclaredOnly, null,
                    new[] { typeof(Item), typeof(ItemAddress), typeof(bool) }, null);
                if (method == null) throw new MissingMethodException(type.FullName, "OnItemAddedOrRemoved");
                harmony.Patch(method, postfix: Hook(nameof(LootPostfix)));
                observedType = type;
            }
            catch (Exception ex) { Warn("inventory hook unavailable", ex); }

            try
            {
                // Older Fika releases have no revive system. Observe after ToggleDowned
                // finishes: the property event itself fires before health is updated.
                var type = fika.GetType("Fika.Core.Main.Players.FikaPlayer");
                var property = type?.GetProperty("Downed");
                if (property?.PropertyType == typeof(bool))
                {
                    fikaPlayerType = type;
                    downed = property;
                    foreach (var playerType in new[] { type, observedType })
                    {
                        var method = playerType?.GetMethod("ToggleDowned", BindingFlags.Instance | BindingFlags.Public
                            | BindingFlags.DeclaredOnly, null, new[] { typeof(bool) }, null);
                        if (method != null) harmony.Patch(method, postfix: Hook(nameof(DownedPostfix)));
                    }
                }
            }
            catch (Exception ex) { Warn("revive hook unavailable", ex); }

            try
            {
                // 2.4.5 uses a struct packet; earlier 2.4 releases use a pooled class.
                var packet = fika.GetType("Fika.Core.Networking.Packets.Generic.SubPackets.ClientExtractPacket")
                    ?? fika.GetType("Fika.Core.Networking.Packets.Generic.SubPackets.ClientExtract", true);
                var manager = fika.GetType("Fika.Core.Networking.IFikaNetworkManager", true);
                networkInstance = typeof(Singleton<>).MakeGenericType(manager).GetProperty("Instance");
                coopHandler = manager.GetProperty("CoopHandler");
                players = coopHandler?.PropertyType.GetProperty("Players");
                extractedPlayers = coopHandler?.PropertyType.GetProperty("ExtractedPlayers");
                var netId = packet.GetField("NetId");
                var execute = packet.GetMethod("Execute", BindingFlags.Instance | BindingFlags.Public);
                if (networkInstance == null || players == null || extractedPlayers == null || netId?.FieldType != typeof(int) || execute == null)
                    throw new MissingMemberException("Fika extraction packet / roster contract");
                harmony.Patch(execute, prefix: Hook(nameof(ExtractPrefix)), postfix: Hook(nameof(ExtractPostfix)));
            }
            catch (Exception ex) { Warn("extraction hook unavailable", ex); }

            try
            {
                var game = fika.GetType("Fika.Core.Main.GameMode.CoopGame", true);
                // Each path starts teardown before the delayed native session-end callback.
                foreach (var name in new[] { "Stop", "StopFromCancel", "CleanUp", "Dispose" })
                {
                    var method = game.GetMethod(name, BindingFlags.Instance | BindingFlags.Public | BindingFlags.DeclaredOnly);
                    if (method == null) throw new MissingMethodException(game.FullName, name);
                    harmony.Patch(method, prefix: Hook(nameof(TeardownPrefix)));
                }
            }
            catch (Exception ex) { Warn("raid teardown hook unavailable", ex); }
        }

        private static HarmonyMethod Hook(string name) => new HarmonyMethod(typeof(FikaRecording), name);

        private static void TeardownPrefix()
        {
            if (!RAID_REVIEW.CanCapture) return;
            try
            {
                RAID_REVIEW_Player_OnItemAddedOrRemovedPatch.FlushPending(true);
                RecordingRoster.BeginTeardown();
            }
            catch (Exception ex) { Warn("raid teardown capture failed", ex); }
        }

        private static void LootPostfix(Player __instance, Item item, ItemAddress location, bool added) =>
            RAID_REVIEW_Player_OnItemAddedOrRemovedPatch.Capture(__instance, item, location, added);

        private static void DownedPostfix(Player __instance)
        {
            if (!RAID_REVIEW.CanCapture || __instance == null || __instance.IsAI) return;
            try
            {
                RecordingRoster.Add(__instance);
                RecordingRoster.Observe(__instance);
            }
            catch (Exception ex) { Warn("revive capture failed", ex); }
        }

        private sealed class Extraction
        {
            internal string ProfileId, SessionId;
            internal int NetId;
            internal IList Confirmed;
        }

        // Inject the field, not a boxed __instance: Harmony 2.9 on Unity Mono emits
        // invalid IL for object __instance on Fika's readonly struct packet.
        private static void ExtractPrefix(int ___NetId, out Extraction __state)
        {
            __state = null;
            if (!RAID_REVIEW.CanCapture) return;
            try
            {
                var manager = networkInstance.GetValue(null);
                var handler = manager == null ? null : coopHandler.GetValue(manager);
                if (handler == null) return;
                int id = ___NetId;
                var roster = players.GetValue(handler) as IDictionary;
                var confirmed = extractedPlayers.GetValue(handler) as IList;
                var player = roster?[id] as Player;
                if (player == null || player.IsAI || player.HealthController?.IsAlive != true || confirmed == null) return;
                // Execute removes the player from Fika's roster and destroys it. Keep only
                // detached identity and the confirmation list, never read the Player afterwards.
                __state = new Extraction { ProfileId = player.ProfileId, SessionId = RAID_REVIEW.sessionId,
                    NetId = id, Confirmed = confirmed };
            }
            catch (Exception ex) { Warn("extraction capture failed", ex); }
        }

        private static void ExtractPostfix(Extraction __state)
        {
            if (!RAID_REVIEW.CanCapture || __state == null || __state.SessionId != RAID_REVIEW.sessionId) return;
            try
            {
                if (__state.Confirmed.Contains(__state.NetId))
                    RecordingRoster.Confirm(__state.ProfileId, PlayerStatus.Extracted);
            }
            catch (Exception ex) { Warn("extraction confirmation failed", ex); }
        }

        private static void Warn(string message, Exception error)
        {
            // Never interrupt Fika's operation or flood the log on repeated events.
            if (warned) return;
            warned = true;
            LoggerInstance.Log.LogWarning($"RAID_REVIEW :::: FIKA :::: {message}: {error.Message}");
        }
    }
}
