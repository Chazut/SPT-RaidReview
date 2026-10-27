# Recording pipeline checks

Run `dotnet run --project Tests/RecordingPipeline -c Release` with the repository's client dependencies available.

The harness links the production sender, roster, DTOs and server packet handler. Game, database and transport boundaries use doubles. It covers ordered delivery through END and a second START, serialization on the worker, bounded overflow, failed sends/serialization, detached snapshots, deaths/despawns/replacement players, and compatibility of batched positions with the existing replay CSV format.

It does not measure Unity frame time or prove a headless FPS improvement. Validate in a real raid with **Raid Review > Main > Performance logging** enabled. `[RR-PERF]` lines report every 10 seconds and at raid end:

- Time spent in RR capture and event callbacks, with peak cost and allocated bytes per stage.
- Queue depth, high-water mark, oldest pending packet, packet/byte rates and dropped packets.
- Serialization and socket-send cost and allocated bytes on the worker. Lifetime maxima include earlier raids in the same client launch.
- GC collection deltas and current managed heap size, which belong to the entire game and cannot alone be attributed to RR. Allocation counts are unavailable on runtimes without the per-thread counter.

Fika recording tests apply the production Harmony hooks to runtime doubles, including a struct extraction packet, an empty observed-player inventory override and native disposal. They cover pickup quantities/value, internal moves, transfers, disabled capture, duplicate extraction packets, failed extraction, death precedence, and confirmation after removal. They also reproduce Snoops' batch of 12 living bots disposed at raid end: Stop, cancellation, cleanup and disposal freeze the last state before teardown, preserving real deaths, extractions and disconnects. Capture resumes on the next raid. The integration contract was inspected in Fika.Core 2.4.5 and the official 2.4.6 release used in the report. This does not replace a multiplayer test: record on the host/headless, have another human pick up and drop loot, then extract. Verify that they appear as PLAYER with their own loot and Extracted status. A disconnect must remain Removed, and the recorder's own extraction must not mark other humans as extracted. Historical missing loot/extraction events cannot be recovered by the display fix.

The default sampling cadence remains 5 Hz. Install the matching client and server together, since the new client sends POSITION_BATCH. The new server still accepts POSITION from older clients. Recording OFF stops capture immediately and finalizes the current recording on the next tick; enabling resumes at the next raid. Accepted packets drain in order. A full queue or broken connection stops the recording, logs an explicit incomplete-recording error, and does not send a normal END. The queue is bounded to 2048 waiting packets plus one in flight. No automatic retry can silently duplicate events.
