using System;

namespace RAID_REVIEW
{
    internal static class OrbitBehaviorDecision
    {
        // BigBrain action numbers depend on registration order. The active layer,
        // together with live objective telemetry, identifies who owns this sample.
        internal static string Resolve(string decision, string activeLayer, string status, string category)
        {
            if (!string.Equals(activeLayer, "OrbitBrainLayer", StringComparison.Ordinal) || status == null)
                return decision;

            if (category == "SearchingAmbushExtract" || category == "ApproachingAmbushExtract")
                return "Orbit:" + category;
            if (category?.StartsWith("Ambush", StringComparison.Ordinal) == true)
                return "Orbit:" + (status == "Finished" ? "Camping" : "Approaching") + category;
            if ((status == "Moving" || status == "Looting") && !string.IsNullOrEmpty(category))
                return "Orbit:" + category;
            if (status == "Finished")
                return category == "SquadCover" ? "Orbit:SquadCover" : "Orbit:Guarding";

            return decision;
        }
    }
}
