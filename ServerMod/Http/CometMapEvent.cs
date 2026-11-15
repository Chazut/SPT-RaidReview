using System.Text.Json;

namespace RaidReview.Http;

internal static class CometMapEvent
{
    // Map hovers need the decision context, not a copy of the full configuration per event.
    internal static Dictionary<string, object?> Project(Dictionary<string, object?> row)
    {
        var result = new Dictionary<string, object?>();
        foreach (var key in new[] { "id", "time", "profileId", "cometSession", "sequence", "feature", "decision", "stage", "reason" })
            if (row.TryGetValue(key, out var value)) result[key] = value;
        var detail = new Dictionary<string, object?>();
        try
        {
            using var document = JsonDocument.Parse(row.GetValueOrDefault("detail")?.ToString() ?? "{}");
            if (document.RootElement.ValueKind == JsonValueKind.Object)
                foreach (var key in new[] { "botInstance", "contact", "candidates", "visible", "continuity", "mixing", "fear", "threat", "loadout", "opponent", "opportunity", "coverResponse", "progress", "controlHandoff", "handoff", "hearing", "quiet", "gunfire", "floorHearing", "closeDetection", "impact", "encounter", "outcome", "sainPreset", "cometPreset", "configRevision", "tacticCounters", "journalReport", "combatJournal", "weaponJournal", "controlJournal", "raidCleanup", "validity", "lifecycle", "faultIsolation", "coverScan", "movementRecovery", "doorClosing", "doorMotion", "doorSpatial", "doorRecovery", "doorTransit", "silentSearch", "searchAbandonment", "environmentContext", "doorApproach", "doorJumpPeek", "doorRunBy", "doorStepPeek", "doorFakeGrenade", "doorFakeMedical", "doorRoomClear", "doorAmbush", "doorHold", "doorSupport", "doorInterruption", "doorEmergency", "doorReservation", "doorEntry", "combatStep", "firePause", "cornerPeek", "combatLean", "cornerChase", "cornerPrefire", "angleWatch", "holdAngle", "coverTravel", "adsTravel", "retreatWeave", "restLights", "tacticalDevices", "lightDiscipline", "squadVoice", "squadFire", "fireLane", "tacticalJump", "outdoorRelocation", "coverFeint", "reloadTiming", "pistolSwap", "weaponReturn", "quickReload", "magazineRecovery", "weaponRange", "weaponSync", "suppressionDiscipline", "shotGeometry", "recoilRecovery", "handsRecovery", "grenadeJudgment", "grenadeTrajectory", "grenadeChoice", "ownGrenadeSafety", "grenadeReaction", "medicalChoice", "medicalPosture", "postCombat", "readyStance", "crossfire", "surgeryInterruption", "explosionAwareness", "flashContinuity", "gasExposure", "grenadeFilter", "grenadeDispersion" })
                    if (document.RootElement.TryGetProperty(key, out var value)) detail[key] = value.Clone();
        }
        catch (JsonException) { /* Keep the lifecycle event even if its optional details are damaged. */ }
        result["detail"] = detail;
        return result;
    }
}
