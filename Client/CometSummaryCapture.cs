using System;
using System.Collections.Generic;

namespace RAID_REVIEW
{
    // Used by an off-thread COMET writer. Strings and raid-relative time only.
    internal sealed class CometSummaryCapture
    {
        internal sealed class Lease
        {
            internal string Comet, Session; internal long Time;
            internal readonly Dictionary<string,int> Parts = new Dictionary<string,int>();
            internal readonly HashSet<string> Received = new HashSet<string>();
        }
        private readonly object gate = new object();
        private readonly List<Lease> leases = new List<Lease>();
        internal void Remember(string comet,string session,long time)
        {
            if(string.IsNullOrEmpty(comet)||string.IsNullOrEmpty(session))return;
            lock(gate)
            {
                var lease=leases.Find(x=>x.Comet==comet);
                if(lease!=null){if(lease.Session==session)lease.Time=Math.Max(lease.Time,time);return;}
                if(leases.Count>=4)leases.RemoveAt(0);
                leases.Add(new Lease{Comet=comet,Session=session,Time=Math.Max(0,time)});
            }
        }
        internal bool Take(string comet,int part,int parts,out string session,out long time)
            => Take(comet,"T02",part,parts,out session,out time);
        internal bool Take(string comet,string feature,int part,int parts,out string session,out long time)
        {
            session=null;time=0;if((feature!="T01"&&feature!="T02"&&feature!="T03"&&feature!="T04")||parts<1||parts>40||part<0||part>=parts)return false;
            lock(gate)
            {
                var lease=leases.Find(x=>x.Comet==comet);
                if(lease==null||lease.Parts.TryGetValue(feature,out int expected)&&expected!=parts||!lease.Received.Add(feature+":"+part))return false;
                lease.Parts[feature]=parts;session=lease.Session;time=lease.Time;
                // Keep the bounded lease for the other reports. Duplicates stay rejected.
                return true;
            }
        }
        internal void Clear(){lock(gate)leases.Clear();}
    }
}
