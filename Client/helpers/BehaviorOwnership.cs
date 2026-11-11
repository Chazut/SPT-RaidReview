using System;

namespace RAID_REVIEW
{
    internal static class BehaviorOwnership
    {
        internal static string ResolvePbt(string decision, string layer, bool isAi, bool ghost)
            => isAi && !ghost && layer == "PbtCheater" ? "PBT:Cheating" : decision;

        internal static bool IsSainLayer(string layer)
            => layer?.StartsWith("SAIN", StringComparison.OrdinalIgnoreCase) == true;

        // SAIN keeps its component and sometimes its previous decision while another
        // BigBrain layer runs. Component presence alone does not establish ownership.
        internal static string Resolve(string nativeDecision, string layer, string sainDecision)
        {
            if (IsSainLayer(layer))
            {
                if (string.IsNullOrEmpty(sainDecision)) return "SAIN:ActionUnavailable";
                if (sainDecision.StartsWith("SAIN:", StringComparison.Ordinal)) return sainDecision;
                return "SAIN:" + sainDecision;
            }
            if ((string.IsNullOrEmpty(nativeDecision) || nativeDecision == "None"
                || int.TryParse(nativeDecision, out _)) && !string.IsNullOrEmpty(layer))
                return "BL:" + layer;
            return nativeDecision;
        }
    }
}
