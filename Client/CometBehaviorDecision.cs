namespace RAID_REVIEW
{
    internal static class CometBehaviorDecision
    {
        internal static string ResolveCrossfire(string label,string layer,string native,bool ghost)
        {
            return !ghost && layer=="COMET : Crossfire" && (label=="COMET:CrossfireMoving" || label=="COMET:CrossfireHolding"
                || label=="COMET:CrossfireStormMoving" || label=="COMET:CrossfireTradePushing" || label=="COMET:CrossfireTradeMoving" || label=="COMET:CrossfireTradeWatching"
                || label=="COMET:CrossfireCoverMateMoving" || label=="COMET:CrossfireCoverMateHolding"
                || label=="COMET:CrossfireManeuverMoving" || label=="COMET:CrossfireManeuverHolding" || label=="COMET:CrossfireManeuverSupporting" || label=="COMET:CrossfireManeuverSuppressing" || label=="COMET:CrossfireManeuverRear"
                || label=="COMET:CrossfireEntranceMoving" || label=="COMET:CrossfireEntranceWatching" || label=="COMET:CrossfireEntranceEntering") ? label : native;
        }
        internal static string ResolvePostCombat(string label,string layer,string native,bool ghost)
        {
            if(ghost || layer!="COMET : Post-combat")return native;
            switch(label) {
                case "COMET:PostCombatCover": case "COMET:PostCombatMedical": case "COMET:PostCombatReload":
                case "COMET:PostCombatHands": case "COMET:PostCombatWatch": case "COMET:PostCombatRegroup": case "COMET:PostCombatCheck": return label;
                default:return native;
            }
        }
        // Never attribute a stale COMET plan to a different native SAIN action.
        internal static string Resolve(string comet, string native)
        {
            string clean = native != null && native.StartsWith("SAIN:") ? native.Substring(5) : native;
            switch (comet)
            {
                case "COMET:FirstAid": return clean == "FirstAid" ? comet : native;
                case "COMET:Surgery": return clean == "Surgery" ? comet : native;
                case "COMET:Stims": return clean == "Stims" ? comet : native;
                case "COMET:Reload": return clean == "Reload" ? comet : native;
                case "COMET:KeepAngle": return clean == "StandAndShoot" ? comet : native;
                case "COMET:ContinuePush": return clean == "RushEnemy" ? comet : native;
                case "COMET:Shoot": return clean == "StandAndShoot" ? comet : native;
                case "COMET:Cover": return clean == "SeekCover" ? comet : native;
                case "COMET:Push": return clean == "RushEnemy" ? comet : native;
                case "COMET:Grenade": return clean == "ThrowGrenade" ? comet : native;
                case "COMET:DefendUnknown": return clean == "Freeze" ? comet : native;
                case "COMET:Hold": return clean == "Freeze" ? comet : native;
                case "COMET:Flank": return clean == "ShiftCover" ? comet : native;
                case "COMET:Search": return clean == "Search" ? comet : native;
                // SAIN continues an accepted Retreat through SeekCover. COMET clears its
                // label when that continuation no longer belongs to the same plan.
                case "COMET:FallBack": return clean == "Retreat" || clean == "SeekCover" ? comet : native;
                default: return native;
            }
        }
    }
}
