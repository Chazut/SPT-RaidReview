using SPT.Reflection.Patching;
using EFT;
using EFT.Communications;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;

namespace RAID_REVIEW
{
    public class RAID_REVIEW_Player_OnGameSessionEndPatch : ModulePatch
    {
        protected override MethodBase GetTargetMethod()
        {
            return typeof(Player).GetMethod("OnGameSessionEnd");
        }

        [PatchPostfix]
        private static void PatchPostFix(ref Player __instance, ExitStatus exitStatus, float pastTime, string locationId, string exitName)
        {

            if (locationId == "hideout" || !RAID_REVIEW.inRaid) return;
            try
            {
                RAID_REVIEW.FinishRecording(exitName, exitStatus);
                if (RAID_REVIEW.RecordingNotification.Value && !Telemetry.Faulted)
                    NotificationManager.DisplayMessageNotification("Raid Review recording queued for saving", ENotificationDurationType.Long);
            }
            catch (Exception ex) { Logger.LogError(ex); }
        }
    }
}
