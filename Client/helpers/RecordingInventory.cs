using System.Collections.Generic;
using EFT;
using EFT.InventoryLogic;

namespace RAID_REVIEW
{
    internal static class RecordingInventory
    {
        private static readonly HashSet<string> captured = new HashSet<string>();
        internal static void Reset() => captured.Clear();

        // Called independently of PLAYER metadata: the local player is registered
        // before the tracking loop. Retry unready inventories, stop after one snapshot.
        internal static void Capture(Player player)
        {
            if (!RAID_REVIEW.CanCapture || player == null || captured.Contains(player.ProfileId)) return;
            try
            {
                var equipment = player.Inventory?.GetPlayerItems(EPlayerItems.Equipment);
                if (equipment == null) return;
                var items = new List<TrackingInventoryItem>();
                foreach (var item in equipment)
                {
                    if (item == null) continue;
                    items.Add(new TrackingInventoryItem
                    {
                        templateId = item.TemplateId.ToString(), itemName = item.LocalizedShortName(),
                        price = RAID_REVIEW.GetHandbookPrice(item), qty = item.StackObjectsCount,
                        slot = item.Parent?.Container?.ID ?? "unknown"
                    });
                }
                if (items.Count == 0) return;
                if (Telemetry.SendSnapshot("PLAYER_INVENTORY", new TrackingPlayerInventory
                {
                    sessionId = RAID_REVIEW.sessionId, profileId = player.ProfileId,
                    time = RAID_REVIEW.stopwatch.ElapsedMilliseconds, items = items
                })) captured.Add(player.ProfileId);
            }
            catch { /* Inventory can still be initializing on a remote player. Retry next capture. */ }
        }
    }
}
