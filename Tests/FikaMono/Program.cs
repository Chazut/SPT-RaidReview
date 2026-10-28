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
            Console.WriteLine($"PASS {checks} Unity Mono recording checks");
            return 0;
        }
        catch(Exception ex) { Console.Error.WriteLine(ex); return 1; }
    }
}
