import { useState, useEffect, useRef, useCallback } from 'react'

// Narrowest zoomed window, in frames.
export const MIN_VIEW_FRAMES = 40

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

// Zoom state of the replay bar: a window over the frames, null showing the whole raid.
export function useTimelineZoom(lastIndex: number, currentIndex: number) {
    const [view, setView] = useState<{ start: number, end: number } | null>(null);
    const canZoom = lastIndex > MIN_VIEW_FRAMES;
    const viewStart = view ? view.start : 0;
    const viewSpan = view ? view.end - view.start : Math.max(1, lastIndex);

    // Event handlers read the latest values from here.
    const latest = useRef({ zoomed: !!view, viewStart, viewSpan, lastIndex, currentIndex });
    latest.current = { zoomed: !!view, viewStart, viewSpan, lastIndex, currentIndex };

    // Clamp a window to the raid; a window covering everything means no zoom.
    const applyView = useCallback((start: number, span: number) => {
        const { lastIndex } = latest.current;
        if (lastIndex <= MIN_VIEW_FRAMES || span >= lastIndex) {
            setView(null);
            return;
        }
        const width = Math.max(MIN_VIEW_FRAMES, span);
        const from = clamp(start, 0, lastIndex - width);
        setView({ start: from, end: from + width });
    }, []);

    // Zoom by `factor`, keeping `anchorIndex` at the same place on the bar.
    const zoomAt = useCallback((anchorIndex: number, anchorFraction: number, factor: number) => {
        const { viewSpan, lastIndex } = latest.current;
        const span = clamp(viewSpan * factor, MIN_VIEW_FRAMES, lastIndex);
        applyView(anchorIndex - anchorFraction * span, span);
    }, [applyView]);

    // Buttons zoom around the playhead, or the middle of the window when it is off screen.
    const zoomAroundPlayhead = useCallback((factor: number) => {
        const { viewStart, viewSpan, currentIndex } = latest.current;
        const fraction = (currentIndex - viewStart) / viewSpan;
        if (fraction >= 0 && fraction <= 1) zoomAt(currentIndex, fraction, factor);
        else zoomAt(viewStart + viewSpan / 2, 0.5, factor);
    }, [zoomAt]);

    const reset = useCallback(() => setView(null), []);

    // New recording: show it whole.
    useEffect(() => {
        setView(null);
    }, [lastIndex]);

    // Keep the playhead in a zoomed window during playback and jumps. Reacts to playhead
    // moves only, so panning the window away from the playhead sticks.
    useEffect(() => {
        const { zoomed, viewStart, viewSpan } = latest.current;
        if (!zoomed) return;
        if (currentIndex > viewStart + viewSpan) applyView(currentIndex - viewSpan * 0.1, viewSpan);
        else if (currentIndex < viewStart) applyView(currentIndex - viewSpan * 0.9, viewSpan);
    }, [currentIndex, applyView]);

    return { view, viewStart, viewSpan, lastIndex, canZoom, latest, applyView, zoomAt, zoomAroundPlayhead, reset };
}

export type TimelineZoom = ReturnType<typeof useTimelineZoom>
