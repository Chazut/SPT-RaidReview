using RAID_REVIEW;
static class CometCounterCaptureTests
{
    internal static void Run(Action<bool,string> check)
    {
        var capture=new CometSummaryCapture();capture.Remember("old","profile",100);capture.Remember("new","profile",20);
        check(capture.Take("old",1,3,out var session,out var time)&&session=="profile"&&time==100,"T02 late report retains original raid-relative time");
        check(!capture.Take("old",1,3,out _,out _),"T02 duplicate page ignored");
        check(!capture.Take("old",0,2,out _,out _),"T02 conflicting page count rejected");
        check(capture.Take("old",0,3,out _,out _)&&capture.Take("old",2,3,out _,out _),"T02 out of order pages accepted");
        check(!capture.Take("old",0,3,out _,out _),"T02 completed lease cannot replay");
        check(capture.Take("new",0,1,out _,out time)&&time==20,"T02 next raid not overwritten by previous report");
        check(!capture.Take("unknown",0,1,out _,out _)&&!capture.Take("unknown",0,41,out _,out _),"T02 unknown or unbounded reports refused");
        for(int i=0;i<5;i++)capture.Remember(i.ToString(),"s",i);
        check(!capture.Take("0",0,1,out _,out _),"T02 forgotten old lease does not follow current profile");
        check(capture.Take("4","T01",0,1,out _,out _)&&capture.Take("4","T03",0,1,out _,out _)&&capture.Take("4","T04",0,1,out _,out _),"journal reports coexist with T02 on the same raid");
        check(!capture.Take("4","T01",0,1,out _,out _)&&!capture.Take("4","Unknown",0,1,out _,out _),"journal duplicates and unsupported report types rejected");
        capture.Clear();check(!capture.Take("4",0,1,out _,out _),"T02 unbind clears metadata");
        capture.Remember("parallel","s",10);int count=0;
        Parallel.For(0,200,i=>{if(capture.Take("parallel",i%10,10,out _,out _))Interlocked.Increment(ref count);});
        check(count==10,"T02 concurrent writer callbacks deliver each part once");
    }
}
