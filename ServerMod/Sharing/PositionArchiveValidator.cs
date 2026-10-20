using System.Text.Json;

namespace RaidReview.Sharing;

// Validate V4 positions incrementally, without materializing a whole replay.
// Unknown scalar fields survive unchanged.
internal sealed class PositionArchiveValidator(string raidId)
{
    private string profile = "", field = "";
    private int coordinates;
    private bool rootSeen;
    internal long Samples { get; private set; }

    internal async Task ValidateAsync(Stream stream, CancellationToken ct)
    {
        var buffer = new byte[64 * 1024];
        int buffered = 0;
        var state = new JsonReaderState(new JsonReaderOptions { MaxDepth = 5 });
        while (true)
        {
            int read = await stream.ReadAsync(buffer.AsMemory(buffered), ct);
            bool final = read == 0;
            buffered += read;
            int consumed = Consume(buffer.AsSpan(0, buffered), final, ref state);
            buffered -= consumed;
            buffer.AsSpan(consumed, buffered).CopyTo(buffer);
            if (final)
            {
                if (!rootSeen || buffered != 0) throw new InvalidDataException("Invalid replay positions.");
                return;
            }
            if (buffered == buffer.Length) throw new InvalidDataException("A replay value is too large.");
        }
    }

    private int Consume(ReadOnlySpan<byte> data, bool final, ref JsonReaderState state)
    {
        var reader = new Utf8JsonReader(data, final, state);
        while (reader.Read())
        {
            int depth = reader.CurrentDepth;
            switch (reader.TokenType)
            {
                case JsonTokenType.StartObject when depth == 0:
                    if (rootSeen) throw new InvalidDataException("Multiple replay roots.");
                    rootSeen = true;
                    break;
                case JsonTokenType.PropertyName when depth == 1:
                    profile = reader.GetString()!;
                    if (profile.Length is 0 or > 256) throw new InvalidDataException("Invalid replay player.");
                    break;
                case JsonTokenType.StartArray when depth == 1:
                case JsonTokenType.EndArray when depth == 1:
                case JsonTokenType.EndObject when depth == 0:
                    break;
                case JsonTokenType.StartObject when depth == 2:
                    coordinates = 0;
                    break;
                case JsonTokenType.EndObject when depth == 2:
                    if (coordinates != 15) throw new InvalidDataException("Replay sample is missing time or coordinates.");
                    Samples++;
                    break;
                case JsonTokenType.PropertyName when depth == 3:
                    field = reader.GetString()!;
                    break;
                case JsonTokenType.String or JsonTokenType.Number or JsonTokenType.True
                    or JsonTokenType.False or JsonTokenType.Null when depth == 3:
                    int flag = field switch { "x" => 1, "y" => 2, "z" => 4, "time" => 8, _ => 0 };
                    if (flag != 0)
                    {
                        if ((coordinates & flag) != 0 || reader.TokenType != JsonTokenType.Number
                            || !reader.TryGetDouble(out double number) || !double.IsFinite(number))
                            throw new InvalidDataException("Invalid replay coordinates.");
                        coordinates |= flag;
                    }
                    if (field is "raidId" or "profileId" && reader.TokenType != JsonTokenType.Null)
                    {
                        if (reader.TokenType != JsonTokenType.String) throw new InvalidDataException("Invalid replay identity.");
                        var id = reader.GetString();
                        if (!string.IsNullOrEmpty(id) && id != (field == "raidId" ? raidId : profile))
                            throw new InvalidDataException("Replay positions belong to a different raid or player.");
                    }
                    break;
                default:
                    throw new InvalidDataException("Unsupported replay position structure.");
            }
        }
        state = reader.CurrentState;
        return (int)reader.BytesConsumed;
    }
}
