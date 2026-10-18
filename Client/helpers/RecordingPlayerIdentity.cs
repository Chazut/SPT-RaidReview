using EFT;

namespace RAID_REVIEW
{
    internal static class RecordingPlayerIdentity
    {
        internal static string Type(bool isAI, EPlayerSide side)
        {
            // Savage is a faction, not proof that the participant is a bot.
            if (!isAI) return "HUMAN";
            return side == EPlayerSide.Savage ? "SCAV|SCAV" : "BOT";
        }

        internal static string Name(bool isAI, string nickname, string mainProfileNickname)
        {
            // Fika carries the human's PMC name alongside their temporary Scav name.
            return !isAI && !string.IsNullOrWhiteSpace(mainProfileNickname)
                ? mainProfileNickname : nickname;
        }
    }
}
