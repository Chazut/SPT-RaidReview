using System;
using Newtonsoft.Json;
using UnityEngine;

namespace RAID_REVIEW
{
    // Preserve the server's JSON-string column contract without serializing Unity objects on the game thread.
    [JsonConverter(typeof(JsonPositionConverter))]
    public struct JsonPosition
    {
        public readonly float X, Y, Z;
        public JsonPosition(Vector3 position) { X = position.x; Y = position.y; Z = position.z; }
    }
    internal sealed class JsonPositionConverter : JsonConverter
    {
        public override bool CanConvert(Type type) => type == typeof(JsonPosition);
        public override bool CanRead => false;
        public override object ReadJson(JsonReader reader, Type type, object value, JsonSerializer serializer)
            => throw new NotSupportedException();
        public override void WriteJson(JsonWriter writer, object value, JsonSerializer serializer)
        {
            var p = (JsonPosition)value;
            writer.WriteValue(JsonConvert.SerializeObject(new { x = p.X, y = p.Y, z = p.Z }));
        }
    }
}
