using System.Text;
using System.Text.Json;

namespace RaidReview.Database;

internal static class CometDecisionStorage
{
    // Keep the original JSON spelling, whitespace, property order and numbers. The
    // public reader concatenates three strings; it never parses or reformats detail.
    internal static (string Prefix, string? Config, string? Tail) Split(string detail)
    {
        if (!detail.Contains("Config", StringComparison.Ordinal))
            return (detail, null, null);

        var bytes = Encoding.UTF8.GetBytes(detail);
        var reader = new Utf8JsonReader(bytes);
        try
        {
            if (!reader.Read() || reader.TokenType != JsonTokenType.StartObject)
                return (detail, null, null);
            while (reader.Read() && reader.TokenType == JsonTokenType.PropertyName)
            {
                bool config = reader.GetString()!.EndsWith("Config", StringComparison.Ordinal);
                if (!reader.Read()) break;
                int start = checked((int)reader.TokenStartIndex);
                bool share = config && reader.TokenType == JsonTokenType.StartObject;
                reader.Skip();
                if (!share) continue;
                int end = checked((int)reader.BytesConsumed);
                return (Encoding.UTF8.GetString(bytes, 0, start),
                        Encoding.UTF8.GetString(bytes, start, end - start),
                        Encoding.UTF8.GetString(bytes, end, bytes.Length - end));
            }
        }
        catch (JsonException) { /* Older or opaque diagnostic payloads remain readable verbatim. */ }
        return (detail, null, null);
    }

    internal const string Insert = """
        INSERT INTO comet_config_block(raidId, body)
            SELECT $raidId, $config WHERE $config IS NOT NULL
            ON CONFLICT(raidId, body) DO NOTHING;
        INSERT OR IGNORE INTO comet_decision_row
            (raidId,time,cometSession,sequence,profileId,name,feature,decision,stage,reason,detail,configBlock,detailTail)
        VALUES ($raidId,$time,$session,$sequence,$profileId,$name,$feature,$decision,$stage,$reason,$detail,
                (SELECT id FROM comet_config_block WHERE raidId=$raidId AND body=$config),$tail);
        """;

    // A metadata-only rename preserves all historical rows and their IDs. Imports
    // and older SQL clients may still write complete documents via the public view.
    internal const string Migrate = """
        ALTER TABLE comet_decision RENAME TO comet_decision_row;
        CREATE TABLE comet_config_block(id INTEGER PRIMARY KEY, raidId TEXT NOT NULL, body TEXT NOT NULL, UNIQUE(raidId,body));
        ALTER TABLE comet_decision_row ADD COLUMN configBlock INTEGER REFERENCES comet_config_block(id);
        ALTER TABLE comet_decision_row ADD COLUMN detailTail TEXT;
        CREATE INDEX idx_comet_summary ON comet_decision_row(raidId,time,id) WHERE stage='summary';
        CREATE VIEW comet_decision AS
        SELECT id,raidId,time,cometSession,sequence,profileId,name,feature,decision,stage,reason,
               CASE WHEN configBlock IS NULL THEN detail
                    ELSE detail || (SELECT body FROM comet_config_block WHERE id=r.configBlock) || detailTail END AS detail
        FROM comet_decision_row AS r;
        CREATE TRIGGER comet_decision_insert INSTEAD OF INSERT ON comet_decision BEGIN
            INSERT INTO comet_decision_row(id,raidId,time,cometSession,sequence,profileId,name,feature,decision,stage,reason,detail)
            VALUES(NEW.id,NEW.raidId,NEW.time,NEW.cometSession,NEW.sequence,NEW.profileId,NEW.name,NEW.feature,NEW.decision,NEW.stage,NEW.reason,NEW.detail);
        END;
        CREATE TRIGGER comet_decision_update INSTEAD OF UPDATE ON comet_decision BEGIN
            UPDATE comet_decision_row SET id=NEW.id,raidId=NEW.raidId,time=NEW.time,cometSession=NEW.cometSession,
                sequence=NEW.sequence,profileId=NEW.profileId,name=NEW.name,feature=NEW.feature,decision=NEW.decision,
                stage=NEW.stage,reason=NEW.reason,detail=NEW.detail,configBlock=NULL,detailTail=NULL WHERE id=OLD.id;
        END;
        CREATE TRIGGER comet_decision_delete INSTEAD OF DELETE ON comet_decision BEGIN
            DELETE FROM comet_decision_row WHERE id=OLD.id;
        END;
        CREATE TRIGGER comet_config_cleanup AFTER DELETE ON raid BEGIN
            DELETE FROM comet_config_block WHERE raidId=OLD.raidId;
        END;
        """;
}
