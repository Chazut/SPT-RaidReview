using System;
using System.IO;
using Newtonsoft.Json;

namespace RAID_REVIEW
{
    // Keep the original JSON as the detail payload. Reading its envelope does not
    // need a second object graph for hundreds of scores, candidates and settings.
    internal sealed class CometEventHeader
    {
        internal int Schema;
        internal double Realtime = double.NaN;
        internal long Sequence;
        internal string Session, ProfileId, Name, Feature, Decision, Stage, Reason;
        internal static CometEventHeader Read(string json)
        {
            if(json == null || json.Length > 32768) throw new InvalidOperationException("COMET event exceeds 32 KiB");
            var h = new CometEventHeader();
            using(var text = new StringReader(json))
            using(var reader = new JsonTextReader(text) { DateParseHandling=DateParseHandling.None, MaxDepth=64 })
            {
                if(!reader.Read() || reader.TokenType != JsonToken.StartObject) throw new JsonReaderException("Expected COMET event object");
                while(reader.Read())
                {
                    if(reader.TokenType == JsonToken.EndObject && reader.Depth == 0) break;
                    if(reader.TokenType == JsonToken.Comment) continue;
                    if(reader.TokenType != JsonToken.PropertyName || reader.Depth != 1) throw new JsonReaderException("Invalid event envelope");
                    string key = (string)reader.Value;
                    if(!reader.Read()) throw new JsonReaderException("Missing event value");
                    switch(key)
                    {
                        case "schema": h.Schema = Convert.ToInt32(Number(reader)); break;
                        case "realtime": h.Realtime = Convert.ToDouble(Number(reader),System.Globalization.CultureInfo.InvariantCulture); break;
                        case "sequence": h.Sequence = Convert.ToInt64(Number(reader)); break;
                        case "session": h.Session = Text(reader); break;
                        case "profileId": h.ProfileId = Text(reader); break;
                        case "name": h.Name = Text(reader); break;
                        case "feature": h.Feature = Text(reader); break;
                        case "decision": h.Decision = Text(reader); break;
                        case "stage": h.Stage = Text(reader); break;
                        case "reason": h.Reason = Text(reader); break;
                        default: reader.Skip(); break;
                    }
                }
                if(reader.TokenType!=JsonToken.EndObject || reader.Depth!=0) throw new JsonReaderException("Unterminated event");
                while(reader.Read()) if(reader.TokenType!=JsonToken.Comment) throw new JsonReaderException("Trailing event data");
            }
            if(h.Schema != 1) throw new InvalidOperationException("Unsupported COMET event schema");
            if(double.IsNaN(h.Realtime) || double.IsInfinity(h.Realtime)) throw new InvalidOperationException("Invalid COMET event clock");
            return h;
        }
        private static object Number(JsonTextReader r)
        {
            if(r.TokenType==JsonToken.Integer || r.TokenType==JsonToken.Float) return r.Value;
            throw new JsonReaderException("Expected numeric envelope field");
        }
        private static string Text(JsonTextReader r)
        {
            if(r.TokenType==JsonToken.String || r.TokenType==JsonToken.Null) return (string)r.Value;
            throw new JsonReaderException("Expected text envelope field");
        }
    }
}
