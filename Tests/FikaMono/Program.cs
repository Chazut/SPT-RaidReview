class Program
{
    private static int checks;
    static void Check(bool success,string message)
    {
        if(!success) throw new Exception(message);
        checks++;
    }
    static int Main()
    {
        try
        {
            Console.WriteLine("Unity Mono / " + typeof(HarmonyLib.Harmony).Assembly.FullName);
            FikaRecordingTests.Run(Check);
            InventoryTests.Run(Check);
            TerminalStatusTests.Run(Check);
            RAID_REVIEW.RecordingRoster.Reset(); RAID_REVIEW.Telemetry.Packets.Clear();
            var victim=new EFT.Player { ProfileId="gas" };
            RAID_REVIEW.RecordingGasDeaths.Capture(victim,EDamageType.HotGases,null);
            RAID_REVIEW.RecordingGasDeaths.Capture(victim,EDamageType.HotGases,null);
            Check(RAID_REVIEW.Telemetry.Packets.Count==1,"Mono gas death captured once");
            Check(((RAID_REVIEW.TrackingRaidKill)RAID_REVIEW.Telemetry.Packets[0].Payload).type=="HotGases","Mono gas cause preserved");
            Console.WriteLine($"PASS {checks} Unity Mono recording checks");
            return 0;
        }
        catch(Exception ex) { Console.Error.WriteLine(ex); return 1; }
    }
}
