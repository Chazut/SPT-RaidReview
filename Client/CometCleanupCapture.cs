using System.Collections.Generic;

namespace RAID_REVIEW
{
    // Metadata only. In Fika the local recording can end before the world is disposed.
    internal sealed class CometCleanupCapture
    {
        internal sealed class Ended { internal string Comet, Session; internal long Time; }
        private readonly List<Ended> ended=new List<Ended>();
        internal void Remember(string comet,string session,long time)
        {
            if(string.IsNullOrEmpty(comet)||string.IsNullOrEmpty(session))return;
            ended.RemoveAll(x=>x.Comet==comet);
            if(ended.Count==2)ended.RemoveAt(0);
            ended.Add(new Ended{Comet=comet,Session=session,Time=time});
        }
        internal bool Take(string comet,out Ended value)
        {
            int index=ended.FindIndex(x=>x.Comet==comet);value=null;
            if(index<0)return false;value=ended[index];ended.RemoveAt(index);return true;
        }
        internal void Clear()=>ended.Clear();
    }
}
