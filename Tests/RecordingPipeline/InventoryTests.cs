using EFT;
using EFT.InventoryLogic;
using RAID_REVIEW;

internal static class InventoryTests
{
    internal static void Run(Action<bool,string> check)
    {
        foreach(var isAI in new[]{false,true})
        {
            RecordingRoster.Reset(); Telemetry.Packets.Clear();
            var p=new Player {ProfileId=isAI ? "bot" : "host",IsAI=isAI};
            p.Inventory.Items.Add(new Item{Price=12345,StackObjectsCount=2,TemplateId="weapon"});
            // Local metadata already exists before this call. Capture has no dependency
            // on a new PLAYER event, AI status, or enabling individual loot events.
            RAID_REVIEW.RAID_REVIEW.LootTracking.Value=false;
            RecordingInventory.Capture(p);
            var packet=(TrackingPlayerInventory)Telemetry.Packets.Single().Payload;
            check(packet.profileId==p.ProfileId && packet.items.Single().price==12345
                && packet.items.Single().qty==2 && packet.items.Single().slot=="backpack", "host and bot spawn equipment has quantities and values");
            p.Inventory.Items[0].Price=1; p.Inventory.Items.Clear();
            for(int tick=0;tick<100;tick++) RecordingInventory.Capture(p);
            check(p.Inventory.Reads==1 && Telemetry.Packets.Count==1,"captured inventory is never rescanned or duplicated");
            check(packet.items.Single().price==12345,"spawn inventory is a detached snapshot");
            RAID_REVIEW.RAID_REVIEW.LootTracking.Value=true;
        }

        RecordingRoster.Reset(); Telemetry.Packets.Clear();
        var remote=new Fika.Core.Main.Players.ObservedPlayer {ProfileId="remote",Inventory=null};
        RecordingInventory.Capture(remote);
        remote.Inventory=new Inventory{Fail=true}; RecordingInventory.Capture(remote);
        remote.Inventory.Fail=false; RecordingInventory.Capture(remote);
        check(Telemetry.Packets.Count==0,"unready inventory produces no partial spawn value");
        remote.Inventory.Items.Add(new Item{Price=456}); RecordingInventory.Capture(remote);
        check(Telemetry.Packets.Count==1,"remote inventory is retried when available");
        remote.ToggleDowned(true); remote.ToggleDowned(false); RecordingInventory.Capture(remote);
        check(Telemetry.Packets.Count(p=>p.Action=="PLAYER_INVENTORY")==1,"revival does not recapture equipment");

        RecordingRoster.Reset(); Telemetry.Packets.Clear();
        RAID_REVIEW.RAID_REVIEW.CanCapture=false; RecordingInventory.Capture(remote);
        check(Telemetry.Packets.Count==0,"inventory honors disabled recording");
        RAID_REVIEW.RAID_REVIEW.CanCapture=true; RecordingInventory.Capture(remote);
        check(Telemetry.Packets.Count==1,"next raid captures the same player's new starting inventory");
        RecordingRoster.BeginTeardown(); remote.ProfileId="cleanup"; RecordingInventory.Capture(remote);
        check(Telemetry.Packets.Count==1,"teardown cannot create inventory snapshots");
        RecordingRoster.Reset(); Telemetry.Packets.Clear();
    }
}
