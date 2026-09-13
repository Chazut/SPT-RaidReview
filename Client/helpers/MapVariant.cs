using System;
using HarmonyLib;
using UnityEngine.SceneManagement;

namespace RAID_REVIEW
{
    /// <summary>
    /// Per-raid detection of map reworks that keep BSG's location id (LennoxP90's Interchange Rework and
    /// Manimal's Lighthouse 1.0 backport both do). The raid reports the vanilla id, so the replay would draw
    /// the old layout; the variant travels with the START packet as "locationVariant" and the frontend picks
    /// the matching render when it has one, the base map otherwise. Same signatures as ORBIT's MapVariants.
    /// </summary>
    public static class MapVariant
    {
        public const string Rework = "rework";

        // InterchangeRework.Shared.SceneNames.IrSuffix: every swapped scene loads under its vanilla name + "_IR".
        private const string InterchangeReworkSceneSuffix = "_IR";
        // Manimal.Lighthouse.Client.LighthouseSceneLoader.HasReplacement: true while the backport owns the preset.
        private const string LighthouseLoaderType = "Manimal.Lighthouse.Client.LighthouseSceneLoader";
        private const string LighthouseLoaderFlag = "HasReplacement";

        /// <summary>"" for the vanilla layout, otherwise the variant suffix.</summary>
        public static string Detect(string locationId)
        {
            try
            {
                for (var i = 0; i < SceneManager.sceneCount; i++)
                {
                    var name = SceneManager.GetSceneAt(i).name;
                    if (name != null && name.EndsWith(InterchangeReworkSceneSuffix, StringComparison.Ordinal))
                        return Rework;
                }
            }
            catch
            {
                // Scene enumeration is best effort.
            }

            try
            {
                var loader = AccessTools.TypeByName(LighthouseLoaderType);
                var flag = loader == null ? null : AccessTools.Property(loader, LighthouseLoaderFlag);
                if (flag?.GetValue(null) is bool replaced && replaced) return Rework;
            }
            catch
            {
                // Plugin absent or reshaped: vanilla it is.
            }

            return "";
        }
    }
}
