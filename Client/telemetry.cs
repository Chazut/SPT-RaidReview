using Newtonsoft.Json;
using WebSocketSharp;
using System;
using System.Threading;
using System.Threading.Tasks;
using BepInEx.Logging;
using Comfort.Common;
using EFT;
using EFT.Communications;

namespace RAID_REVIEW
{
    public class Telemetry
    {
        private static WebSocket ws;
        private static OrderedPacketSender sender;
        private static string notification;
        private static System.Threading.Timer keepAlive;
        private static readonly ManualLogSource Logger = BepInEx.Logging.Logger.CreateLogSource("Telemetry");
        internal static bool Faulted => sender == null || sender.Faulted;
        internal static OrderedPacketSender.Counters Counters => sender?.Snapshot() ?? default;

        // Reconnect state. The socket used to be opened once at game start only, so after
        // a server restart (deploy, crash) every later raid was lost until the game was
        // relaunched. TryReconnect retries between raids with a growing delay.
        private static string host;
        private static readonly ReconnectSchedule reconnect = new ReconnectSchedule();
        private static readonly System.Diagnostics.Stopwatch reconnectClock = System.Diagnostics.Stopwatch.StartNew();
        // set while a reconnect attempt is in flight: its failures are logged, not shown
        private static volatile bool quietFailures;

        public static void Connect(string host)
        {
            Telemetry.host = host;
            Shutdown();
            var socket = new WebSocket(host);
            ws = socket;
            sender = new OrderedPacketSender(2048,
                (action, payload) => JsonConvert.SerializeObject(new WsPayload
                {
                    Action = action,
                    Payload = payload is string raw ? raw : JsonConvert.SerializeObject(payload)
                }),
                json =>
                {
                    if (socket.ReadyState != WebSocketState.Open) throw new InvalidOperationException("WebSocket is disconnected");
                    socket.Send(json);
                    if (socket.ReadyState != WebSocketState.Open) throw new InvalidOperationException("WebSocket closed during send");
                },
                reason =>
                {
                    if (quietFailures) { Logger.LogWarning("[RAID-REVIEW] reconnect failed: " + reason); return; }
                    Logger.LogError("[RAID-REVIEW] " + reason);
                    Interlocked.Exchange(ref notification, reason);
                });
            var queue = sender;
            socket.OnOpen += (s, e) =>
            {
                if (ws != socket) return;
                reconnect.Connected(reconnectClock.Elapsed);
                RAID_REVIEW.WebSocketConnected = true;
                quietFailures = false;
                Logger.LogInfo("[RAID-REVIEW] WebSocket connected.");
                Interlocked.Exchange(ref notification, "Raid Review Server Connected");
                StartKeepAlive(socket);
            };
            socket.OnError += (s, e) => queue.Abort("WebSocket error: " + e.Message);
            socket.OnClose += (s, e) =>
            {
                if (ws == socket) { RAID_REVIEW.WebSocketConnected = false; StopKeepAlive(); }
                queue.Abort("WebSocket closed");
            };
            // One connection task; packets use the single ordered worker.
            Task.Run(() => { try { socket.Connect(); } catch (Exception ex) { queue.Abort(ex.Message); } });
        }

        internal static void TryReconnect()
        {
            if (host == null || RAID_REVIEW.inRaid) return;
            if (RAID_REVIEW.AutoReconnect != null && !RAID_REVIEW.AutoReconnect.Value) return;
            if (!Faulted) return; // connected, or the current attempt is still in progress

            // An offline start or interrupted recording leaves inRaid false while the player is still in the raid.
            var world = RAID_REVIEW.MapLoaded() ? Singleton<GameWorld>.Instance : null;
            if (!reconnect.TrySchedule(world != null, world?.LocationId, reconnectClock.Elapsed, out var delay)) return;
            Logger.LogInfo($"[RAID-REVIEW] connection to {host} lost, reconnecting (next try in {delay}s if this fails).");

            quietFailures = true;
            Connect(host);
        }

        private static void StartKeepAlive(WebSocket socket)
        {
            StopKeepAlive();
            var seconds = RAID_REVIEW.WsKeepAliveInterval.Value;
            if (seconds <= 0) return;
            keepAlive = new System.Threading.Timer(_ =>
            {
                if (ws != socket || socket.ReadyState != WebSocketState.Open) return;
                try { if (!socket.Ping()) Logger.LogWarning("[RAID-REVIEW] Keepalive ping was not answered."); }
                catch (Exception ex) { Logger.LogWarning("[RAID-REVIEW] Keepalive ping failed: " + ex.Message); }
            }, null, seconds * 1000, seconds * 1000);
        }

        private static void StopKeepAlive()
        {
            Interlocked.Exchange(ref keepAlive, null)?.Dispose();
        }

        internal static void PumpNotification()
        {
            var message = Interlocked.Exchange(ref notification, null);
            if (message != null && RAID_REVIEW.RecordingNotification.Value)
                try { NotificationManager.DisplayMessageNotification(message, ENotificationDurationType.Long); } catch { }
        }
        internal static bool BeginRaid() => RAID_REVIEW.WebSocketConnected && sender != null && sender.BeginRaid();

        // Callers transfer ownership and must never mutate a snapshot afterward.
        internal static bool SendSnapshot(string action, object snapshot) => sender != null && sender.Enqueue(action, snapshot);

        // Compatibility for callers that already have JSON. Completion means queued, not acknowledged.
        public static Task Send(string action, string payload)
        {
            if (RAID_REVIEW.CanCapture) SendSnapshot(action, payload);
            return Task.CompletedTask;
        }
        internal static void Shutdown()
        {
            StopKeepAlive();
            sender?.Dispose(); sender = null;
            var old = ws; ws = null;
            RAID_REVIEW.WebSocketConnected = false;
            if (old != null) Task.Run(() => { try { old.Close(); } catch { } });
        }
    }
}
