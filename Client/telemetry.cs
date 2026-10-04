using Newtonsoft.Json;
using WebSocketSharp;
using System;
using System.Threading;
using System.Threading.Tasks;
using BepInEx.Logging;
using EFT.Communications;

namespace RAID_REVIEW
{
    public class Telemetry
    {
        private static WebSocket ws;
        private static OrderedPacketSender sender;
        private static string notification;
        private static readonly ManualLogSource Logger = BepInEx.Logging.Logger.CreateLogSource("Telemetry");
        internal static bool Faulted => sender == null || sender.Faulted;
        internal static OrderedPacketSender.Counters Counters => sender?.Snapshot() ?? default;

        public static void Connect(string host)
        {
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
                reason => { Logger.LogError("[RAID-REVIEW] " + reason); Interlocked.Exchange(ref notification, reason); });
            var queue = sender;
            socket.OnOpen += (s, e) =>
            {
                if (ws != socket) return;
                RAID_REVIEW.WebSocketConnected = true;
                Logger.LogInfo("[RAID-REVIEW] WebSocket connected.");
                Interlocked.Exchange(ref notification, "Raid Review Server Connected");
            };
            socket.OnError += (s, e) => queue.Abort("WebSocket error: " + e.Message);
            socket.OnClose += (s, e) =>
            {
                if (ws == socket) RAID_REVIEW.WebSocketConnected = false;
                queue.Abort("WebSocket closed");
            };
            // One connection task; packets use the single ordered worker.
            Task.Run(() => { try { socket.Connect(); } catch (Exception ex) { queue.Abort(ex.Message); } });
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
            sender?.Dispose(); sender = null;
            var old = ws; ws = null;
            RAID_REVIEW.WebSocketConnected = false;
            if (old != null) Task.Run(() => { try { old.Close(); } catch { } });
        }
    }
}
