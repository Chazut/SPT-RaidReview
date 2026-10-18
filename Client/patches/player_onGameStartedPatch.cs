using SPT.Reflection.Patching;
using Comfort.Common;
using EFT;
using EFT.Communications;
using System;
using System.Collections;
using System.Collections.Generic;
using System.Diagnostics;
using System.Reflection;
using System.Threading.Tasks;

namespace RAID_REVIEW
{

    public class RAID_REVIEW_Player_OnGameStartedPatch : ModulePatch
    {
        protected override MethodBase GetTargetMethod()
        {
            return typeof(GameWorld).GetMethod("OnGameStarted", BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
        }

        [PatchPostfix]
        private static void PatchPostFix(ref GameWorld __instance)
        {
            try
            {
                if (__instance.LocationId == "hideout" || RAID_REVIEW.inRaid || !RAID_REVIEW.EnableRecording.Value) return;
                if (!Telemetry.BeginRaid())
                {
                    Logger.LogWarning("Raid Review recording could not start: sender unavailable. Check the connection and restart before the next raid.");
                    return;
                }
                RAID_REVIEW.gameWorld = __instance;
                RAID_REVIEW.myPlayer = __instance.MainPlayer;

                Logger.LogInfo("RAID_REVIEW :::: INFO :::: RAID Settings Loaded");

                // Ensure sessionId is set (CurrentProfileId can be null on Fika headless clients)
                if (RAID_REVIEW.sessionId == null)
                {
                    RAID_REVIEW.sessionId = RAID_REVIEW.gameWorld?.CurrentProfileId?.ToString()
                                            ?? RAID_REVIEW.myPlayer?.ProfileId
                                            ?? __instance.MainPlayer?.ProfileId;
                }

                // Check for installed mods
                Integrations.ModCheck();

                RAID_REVIEW_AirdropLandedPatch.Reset();
                AirdropFlightRecorder.Reset();
                RAID_REVIEW.stopwatch.Reset();
                RAID_REVIEW.stopwatch.Start();

                // Determine raid type — myPlayer may be null on Fika headless clients
                string raidType = "PMC";
                if (RAID_REVIEW.myPlayer != null)
                {
                    raidType = RAID_REVIEW.myPlayer.Side == EPlayerSide.Savage ? "SCAV" : "PMC";
                }

                RAID_REVIEW.trackingRaid = new TrackingRaid
                {
                    sessionId = RAID_REVIEW.sessionId,
                    profileId = RAID_REVIEW.sessionId,
                    time = DateTime.Now,
                    detectedMods = RAID_REVIEW.RAID_REVIEW__DETECTED_MODS.Count > 0 ? string.Join(",", RAID_REVIEW.RAID_REVIEW__DETECTED_MODS) : "",
                    location = RAID_REVIEW.gameWorld.LocationId,
                    locationVariant = MapVariant.Detect(RAID_REVIEW.gameWorld.LocationId),
                    type = raidType,
                    timeInRaid = RAID_REVIEW.stopwatch.IsRunning ? RAID_REVIEW.stopwatch.ElapsedMilliseconds : 0
                };
                Telemetry.SendSnapshot("START", RAID_REVIEW.trackingRaid.Snapshot());

                // Only register main player if present (headless has no main player)
                if (RAID_REVIEW.myPlayer != null)
                {
                    var newTrackingPlayer = new TrackingPlayer
                    {
                        sessionId = RAID_REVIEW.sessionId,
                        profileId = RAID_REVIEW.myPlayer.ProfileId,
                        name = RecordingPlayerIdentity.Name(false, RAID_REVIEW.myPlayer.Profile.Nickname, RAID_REVIEW.myPlayer.Profile.Info.MainProfileNickname),
                        level = RAID_REVIEW.myPlayer.Profile.Info.Level,
                        team = RAID_REVIEW.myPlayer.Side,
                        group = 0,
                        spawnTime = RAID_REVIEW.stopwatch.ElapsedMilliseconds,
                        type = "HUMAN",
                        mod_SAIN_brain = "PLAYER",
                        mod_SAIN_difficulty = ""
                    };
                    RAID_REVIEW.trackingPlayers[newTrackingPlayer.profileId] = newTrackingPlayer;
                    Telemetry.SendSnapshot("PLAYER", newTrackingPlayer.Snapshot());
                }

                RAID_REVIEW.inRaid = true;
                RAID_REVIEW.ResetLooseLootFlag();
                RAID_REVIEW.ResetPhobosFieldFlag();
                RAID_REVIEW.ResetOrbitFieldFlag();
                RAID_REVIEW.ResetOrbitMainObjFlag();
                Logger.LogInfo("RAID_REVIEW :::: INFO :::: RAID Information Populated");

                if (RAID_REVIEW.RecordingNotification.Value && RAID_REVIEW.WebSocketConnected)
                {
                    try { EFT.Communications.NotificationManager.DisplayMessageNotification("Raid Review Recording Started", ENotificationDurationType.Long); } catch { }
                }

                if (RAID_REVIEW.SOLARINT_SAIN__DETECTED)
                {
                    RAID_REVIEW.searchingForSainComponents = true;
                    _ = SAIN_Integration.CheckForSainComponents(false);
                }

                RecordingRoster.Seed(__instance);
                RecordingPerformance.Reset();
                SwitchRecorder.Start(__instance);

                return;
            }

            catch (Exception ex)
            {
                Logger.LogError($"{ex}");
            }
        }

    }
}
