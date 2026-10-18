using System;

namespace RAID_REVIEW
{
    internal static class BodyOrientation
    {
        // Body transform forward, not movement, head rotation or camera direction.
        // ORBIT translates sleeping bodies without updating their rotation.
        public static float? FromForward(float x, float z, bool ghost)
        {
            if (ghost || float.IsNaN(x) || float.IsInfinity(x)
                || float.IsNaN(z) || float.IsInfinity(z)
                || (double)x * x + (double)z * z < 0.000001)
                return null;

            var yaw = Math.Atan2(x, z) * (180.0 / Math.PI);
            return (float)((yaw + 360.0) % 360.0);
        }
    }
}
