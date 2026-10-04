using SPT.Reflection.Patching;
using EFT.InventoryLogic;
using EFT;
using System.Reflection;
using System;

namespace RAID_REVIEW
{
    public class RAID_REVIEW_Player_OnItemAddedOrRemovedPatch : ModulePatch
    {
        // Buffer removes briefly to detect internal inventory moves (remove+add of same item)
        private static readonly System.Collections.Generic.Dictionary<string, TrackingLootItem> _pendingRemoves = new System.Collections.Generic.Dictionary<string, TrackingLootItem>();

        protected override MethodBase GetTargetMethod()
        {
            return typeof(Player).GetMethod("OnItemAddedOrRemoved", BindingFlags.Instance | BindingFlags.Public);
        }

        [PatchPostfix]
        private static void PatchPostFix(ref Player __instance, Item item, ItemAddress location, bool added)
        {
            if (!RAID_REVIEW.CanCapture || __instance.Location == "hideout") return;
            using (RecordingPerformance.Measure(RecordingPerformance.Stage.Loot))
            {

                try
                {
                    bool isPackingMagazine = location.Container.ID == "cartridges";
                    if (RAID_REVIEW.LootTracking.Value && !isPackingMagazine)
                    {
                        var pos = __instance.Position;
                        var lootItem = new TrackingLootItem
                        {
                            sessionId = RAID_REVIEW.sessionId,
                            profileId = __instance.ProfileId,
                            time = RAID_REVIEW.stopwatch.ElapsedMilliseconds,
                            itemId = item.Id,
                            templateId = item.TemplateId.ToString(),
                            itemName = item.LocalizedShortName(),
                            price = RAID_REVIEW.GetHandbookPrice(item),
                            qty = item.StackObjectsCount,
                            type = item.QuestItem ? "QUEST_ITEM" : "LOOT",
                            added = added,
                            x = pos.x,
                            y = pos.y,
                            z = pos.z
                        };

                        if (!added)
                        {
                            // Internal moves only cancel within the same player's inventory.
                            _pendingRemoves[lootItem.profileId + "|" + item.Id] = lootItem;
                        }
                        else
                        {
                            var key = lootItem.profileId + "|" + item.Id;
                            if (_pendingRemoves.TryGetValue(key, out var removed))
                            {
                                _pendingRemoves.Remove(key);
                                if (lootItem.time - removed.time <= 50) return;
                                Telemetry.SendSnapshot("LOOT", removed);
                            }

                            Telemetry.SendSnapshot("LOOT", lootItem);
                        }
                    }
                }
                catch (Exception ex)
                {
                    Logger.LogError($"{ex.Message}");
                }
            }
        }
        private static readonly System.Collections.Generic.List<string> due = new System.Collections.Generic.List<string>();
        internal static void FlushPending(bool all)
        {
            due.Clear();
            var now = RAID_REVIEW.stopwatch.ElapsedMilliseconds;
            foreach (var entry in _pendingRemoves)
            {
                if (!all && now - entry.Value.time < 50) continue;
                due.Add(entry.Key);
                Telemetry.SendSnapshot("LOOT", entry.Value);
            }
            foreach (var id in due) _pendingRemoves.Remove(id);
        }
    }
}
