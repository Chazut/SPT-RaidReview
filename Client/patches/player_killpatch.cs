using EFT;
using EFT.Ballistics;
using System.Reflection;
using SPT.Reflection.Patching;
using UnityEngine;
using System;

namespace RAID_REVIEW
{
    public class RAID_REVIEW_Player_OnBeenKilledByAggressorPatch : ModulePatch
    {
        protected override MethodBase GetTargetMethod()
        {
            return typeof(Player).GetMethod("OnBeenKilledByAggressor", BindingFlags.Instance | BindingFlags.Public);
        }

        [PatchPostfix]
        private static void PatchPostFix(ref Player __instance, IPlayer aggressor, DamageInfo damageInfo, EBodyPart bodyPart, EDamageType lethalDamageType)
        {
            if (__instance.Location == "hideout") return;

            if (!RAID_REVIEW.CanCapture) return;
            using (RecordingPerformance.Measure(RecordingPerformance.Stage.Kill))
            {
                try
                {
                    if (RAID_REVIEW.KillTracking.Value)
                    {
                        var newKill = new TrackingRaidKill
                        {
                            sessionId = RAID_REVIEW.sessionId,
                            time = RAID_REVIEW.stopwatch.ElapsedMilliseconds,
                            profileId = aggressor.ProfileId,
                            killedId = __instance.ProfileId,
                            distance = Vector3.Distance(aggressor.Position, __instance.Position),
                            weapon = damageInfo.Weapon == null ? "?" : damageInfo.Weapon.LocalizedShortName(),
                            weaponTemplateId = damageInfo.Weapon == null ? "" : damageInfo.Weapon.TemplateId.ToString(),
                            bodyPart = bodyPart.ToString(),
                            type = lethalDamageType.ToString(),
                            positionKiller = new JsonPosition(aggressor.Position),
                            positionKilled = new JsonPosition(__instance.Position),
                        };

                        Telemetry.SendSnapshot("KILL", newKill);
                    }
                }

                catch (Exception ex)
                {
                    Logger.LogError($"{ex.Message}");
                }
            }
        }
    }
}
