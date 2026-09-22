namespace RAID_REVIEW
{
    // Keep the recorded faction ISB for compatibility. The replay UI separates White Tusks.
    internal static class IsbBotTypes
    {
        internal static string Map(int role)
        {
            switch (role)
            {
                case 13701: return "ISB SPECIAL FORCES|ISB";
                case 13702: return "ISB MARCH ONE|ISB";
                case 13703: return "ISB MARCH TWO|ISB";
                case 13704: return "ISB MARCH THREE|ISB";
                case 13705: return "ISB MARCH FOUR|ISB";
                case 13706: return "ISB MARCH FIVE|ISB";
                case 13707:
                case 13708: return "WHITE TUSK|ISB";
                case 13709: return "ISB TEAM LEADER|ISB";
                case 13710: return "ISB SECOND LEADER|ISB";
                case 13711: return "ISB SCOUT|ISB";
                case 13712: return "ISB HEAVY|ISB";
                case 13713: return "ISB ASSASSIN|ISB";
                case 13714: return "ISB MARKSMAN|ISB";
                case 13715: return "ISB MARCH SIX|ISB";
                case 13716: return "ISB MARCH SEVEN|ISB";
                default: return null;
            }
        }
    }
}
