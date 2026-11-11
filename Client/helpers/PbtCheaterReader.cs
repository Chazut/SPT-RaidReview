using System;
using System.Collections;
using System.Collections.Generic;
using System.Reflection;

namespace RAID_REVIEW
{
    // Read the already-rolled PBT roster. TypeOf/CheatsOf/BuildDebugText can call
    // Roll(), so invoking those APIs from a recorder would change gameplay.
    internal sealed class PbtCheaterReader
    {
        private readonly FieldInfo accounts, rolled, forced;
        private readonly PropertyInfo personality, cheats, forcedValue;
        private readonly Type cheatType;
        internal bool Supported => accounts != null && rolled != null && personality != null
            && cheats != null && cheatType?.IsEnum == true;

        internal PbtCheaterReader(Type roster)
        {
            const BindingFlags flags = BindingFlags.Static | BindingFlags.Public | BindingFlags.NonPublic;
            accounts = roster?.GetField("accounts", flags);
            rolled = roster?.GetField("rolled", flags);
            forced = roster?.GetField("forced", flags);
            var args = rolled?.FieldType.GetGenericArguments();
            var entry = args?.Length == 2 ? args[1] : null;
            personality = entry?.GetProperty("Type");
            cheats = entry?.GetProperty("Cheats");
            cheatType = cheats?.PropertyType;
            forcedValue = forced?.FieldType.GetProperty("Value");
        }

        internal PbtIdentity Read(int accountId)
        {
            if (!Supported || accountId <= 0 || !(accounts.GetValue(null) is HashSet<int> known)
                || !known.Contains(accountId)) return null;
            var identity = new PbtIdentity();
            var entries = rolled.GetValue(null) as IDictionary;
            var entry = entries?.Contains(accountId) == true ? entries[accountId] : null;
            if (entry == null) return identity; // Confirmed cheater; PBT has not rolled yet.
            identity.Personality = personality.GetValue(entry, null)?.ToString() ?? "";
            var bits = Convert.ToUInt64(cheats.GetValue(entry, null));
            var config = forced?.GetValue(null);
            if (config != null && forcedValue != null)
                bits |= Convert.ToUInt64(forcedValue.GetValue(config, null));
            identity.Cheats = FormatFlags(cheatType, bits);
            return identity;
        }

        private static string FormatFlags(Type type, ulong bits)
        {
            if (bits == 0) return "None";
            var names = new List<string>();
            ulong recognized = 0;
            foreach (var value in Enum.GetValues(type))
            {
                var bit = Convert.ToUInt64(value);
                if (bit == 0 || (bit & (bit - 1)) != 0 || (bits & bit) == 0) continue;
                names.Add(Enum.GetName(type, value));
                recognized |= bit;
            }
            if ((bits & ~recognized) != 0) names.Add("Unknown");
            return string.Join(",", names);
        }
    }

    internal sealed class PbtIdentity
    {
        internal string Personality = "";
        internal string Cheats = "";
    }
}
