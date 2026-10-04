using System;
using System.Collections.Generic;
using System.Reflection;
using EFT.Airdrop;
using EFT.Interactive;
using Newtonsoft.Json;
using SPT.Reflection.Patching;

namespace RAID_REVIEW
{
    public class RAID_REVIEW_AirdropLandedPatch : ModulePatch
    {
        private static readonly HashSet<string> Recorded = new HashSet<string>();

        internal static void Reset() => Recorded.Clear();

        protected override MethodBase GetTargetMethod()
            => typeof(ClientAirDrop).GetMethod(nameof(ClientAirDrop.PlayLandingSound));

        [PatchPostfix]
        private static void Postfix(ClientAirDrop __instance)
        {
            if (!RAID_REVIEW.inRaid || !RAID_REVIEW.EnableRecording.Value || RAID_REVIEW.sessionId == null) return;
            try
            {
                var container = __instance?._syncObject?.GetComponentInChildren<LootableContainer>();
                if (container == null) return;
                var id = container.GetInstanceID().ToString();
                if (!Recorded.Add(id)) return;
                var position = container.transform.position;
                var payload = new
                {
                    sessionId = RAID_REVIEW.sessionId,
                    dropId = id,
                    time = RAID_REVIEW.stopwatch.ElapsedMilliseconds,
                    crateTemplateId = container.ItemOwner?.RootItem?.TemplateId ?? "",
                    x = position.x, y = position.y, z = position.z,
                };
                _ = Telemetry.Send("AIRDROP_LANDED", JsonConvert.SerializeObject(payload));
            }
            catch (Exception ex)
            {
                Logger.LogWarning("Raid Review could not record an airdrop landing: " + ex.Message);
            }
        }
    }
}
