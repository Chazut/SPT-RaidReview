using System.Reflection;
using EFT.Airdrop;
using SPT.Reflection.Patching;

namespace RAID_REVIEW
{
    public class RAID_REVIEW_ClientPlaneSamplePatch : ModulePatch
    {
        protected override MethodBase GetTargetMethod() => typeof(ClientAirPlane).GetMethod(nameof(ClientAirPlane.ManualUpdate));
        [PatchPostfix] private static void Postfix(ClientAirPlane __instance) => AirdropFlightRecorder.Sample(__instance._syncObject);
    }
    public class RAID_REVIEW_ServerPlaneSamplePatch : ModulePatch
    {
        protected override MethodBase GetTargetMethod() => typeof(ServerPlane).GetMethod(nameof(ServerPlane.ManualUpdate));
        [PatchPostfix] private static void Postfix(ServerPlane __instance) => AirdropFlightRecorder.Sample(__instance._syncObject);
    }
    public class RAID_REVIEW_ClientPlaneEndPatch : ModulePatch
    {
        protected override MethodBase GetTargetMethod() => typeof(ClientAirPlane).GetMethod(nameof(ClientAirPlane.ReturnToPool));
        [PatchPrefix] private static void Prefix(ClientAirPlane __instance) => AirdropFlightRecorder.End(__instance._syncObject);
    }
    public class RAID_REVIEW_ServerPlaneEndPatch : ModulePatch
    {
        protected override MethodBase GetTargetMethod() => typeof(ServerPlane).GetMethod(nameof(ServerPlane.ReturnToPool));
        [PatchPrefix] private static void Prefix(ServerPlane __instance) => AirdropFlightRecorder.End(__instance._syncObject);
    }
    public class RAID_REVIEW_AirdropReleasePatch : ModulePatch
    {
        protected override MethodBase GetTargetMethod() => typeof(ServerPlane).GetMethod(nameof(ServerPlane.AirdropReached));
        [PatchPostfix] private static void Postfix(ServerPlane __instance) => AirdropFlightRecorder.Released(__instance);
    }
    public class RAID_REVIEW_AirdropObservedPatch : ModulePatch
    {
        protected override MethodBase GetTargetMethod() => typeof(ClientAirDrop).GetMethod(nameof(ClientAirDrop.Init));
        [PatchPostfix] private static void Postfix(ClientAirDrop __instance) => AirdropFlightRecorder.Observed(__instance);
    }
}
