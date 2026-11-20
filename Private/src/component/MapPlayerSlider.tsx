import { useState, useEffect, useRef } from 'react';
import { findInsertIndex } from '../modules/utils';
import { msToHMS } from '../helpers';
import { clamp, MIN_VIEW_FRAMES, type TimelineZoom } from '../helpers/useTimelineZoom';

interface TimelineEvent {
    time: number
    profileNickname: string
    profileId: string
    killedId: string
    killedNickname: string
    weapon: string
    distance: number
    source: {
      x: number
      y: number
      z: number
    }
    target: {
      x: number
      y: number
      z: number
    }
  }


interface PlayerSliderProps {
    raidData: any;
    sliderTimes: number[];
    timeCurrentIndex: number;
    events : TimelineEvent[];
    setTimeCurrentIndex: (index: number) => void;
    setTimeStartLimit: (index: number) => void;
    setTimeEndLimit: (index: number) => void;
    preserveHistory: boolean;
    zoom: TimelineZoom;
}

// Frames of trail kept behind the playhead when history is not preserved.
const TRAIL_FRAMES = 200;
// Keeps markers inside the track at its right edge.
const MAX_LEFT = 99.7166;

export function PlayerSlider({ sliderTimes, events, timeCurrentIndex, setTimeCurrentIndex, setTimeStartLimit, setTimeEndLimit, preserveHistory, zoom }: PlayerSliderProps) {
    const [isDragging, setIsDragging] = useState(false);
    const trackRef = useRef<HTMLDivElement>(null);
    const touches = useRef(new Map<number, number>());
    const pinch = useRef<{ distance: number, span: number, anchor: number } | null>(null);
    const indexBeforeTouch = useRef<number | null>(null);

    const { viewStart, viewSpan, applyView, zoomAt } = zoom;
    const latest = useRef({ sliderTimes, preserveHistory });
    latest.current = { sliderTimes, preserveHistory };

    const goTo = (index: number) => {
        const { sliderTimes, preserveHistory } = latest.current;
        setTimeCurrentIndex(index);
        if (!preserveHistory) {
            setTimeStartLimit(sliderTimes[Math.max(0, index - TRAIL_FRAMES)]);
        } else {
            setTimeStartLimit(sliderTimes[0]);
        }
        setTimeEndLimit(sliderTimes[index]);
    };

    const indexAtClientX = (clientX: number) => {
        const { viewStart, viewSpan, lastIndex } = zoom.latest.current;
        const rect = (trackRef.current as HTMLDivElement).getBoundingClientRect();
        const fraction = clamp((clientX - rect.left) / rect.width, 0, 1);
        return clamp(Math.round(viewStart + fraction * viewSpan), 0, lastIndex);
    };

    const handleMouseDown = (e: React.PointerEvent<HTMLDivElement>) => {
        // Touch and pen are handled by the track (scrub anywhere, pinch to zoom).
        if (e.pointerType === 'mouse') setIsDragging(true);
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement, MouseEvent> | MouseEvent) => {
        if (!isDragging || !trackRef.current) return;
        goTo(indexAtClientX(e.clientX));
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement, MouseEvent> | MouseEvent) => {
        if (!trackRef.current) return;
        goTo(indexAtClientX(e.clientX));
    };

    // Touch and pen: one finger scrubs anywhere on the track, two fingers pinch to zoom.
    const handleTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (e.pointerType === 'mouse') return;
        touches.current.set(e.pointerId, e.clientX);
        if (touches.current.size === 1) {
            indexBeforeTouch.current = timeCurrentIndex;
            goTo(indexAtClientX(e.clientX));
            setIsDragging(true);
        } else if (touches.current.size === 2 && zoom.canZoom) {
            // A pinch is not a scrub: put the playhead back where it was.
            setIsDragging(false);
            if (indexBeforeTouch.current !== null) goTo(indexBeforeTouch.current);
            const rect = (trackRef.current as HTMLDivElement).getBoundingClientRect();
            const [a, b] = Array.from(touches.current.values());
            const { viewStart, viewSpan } = zoom.latest.current;
            pinch.current = {
                distance: Math.max(1, Math.abs(a - b)),
                span: viewSpan,
                anchor: viewStart + (((a + b) / 2 - rect.left) / rect.width) * viewSpan,
            };
        }
    };

    const handleTrackPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!touches.current.has(e.pointerId)) return;
        touches.current.set(e.pointerId, e.clientX);
        if (!pinch.current || touches.current.size < 2 || !trackRef.current) return;
        const rect = trackRef.current.getBoundingClientRect();
        const [a, b] = Array.from(touches.current.values());
        const span = clamp(pinch.current.span * pinch.current.distance / Math.max(1, Math.abs(a - b)), MIN_VIEW_FRAMES, zoom.latest.current.lastIndex);
        const fraction = clamp(((a + b) / 2 - rect.left) / rect.width, 0, 1);
        applyView(pinch.current.anchor - fraction * span, span);
    };

    const handleTrackPointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
        touches.current.delete(e.pointerId);
        if (touches.current.size < 2) pinch.current = null;
        if (touches.current.size === 0) indexBeforeTouch.current = null;
    };

    // Fixes rendering in Firefox
    useEffect(() => {
        sliderTimes.sort((a, b) => a - b);
    }, [sliderTimes]);

    // Mouse wheel over the bar zooms around the cursor.
    useEffect(() => {
        const track = trackRef.current;
        if (!track) return;
        const onWheel = (e: WheelEvent) => {
            const { viewStart, viewSpan, lastIndex } = zoom.latest.current;
            if (lastIndex <= MIN_VIEW_FRAMES || e.deltaY === 0) return;
            e.preventDefault();
            const rect = track.getBoundingClientRect();
            const fraction = clamp((e.clientX - rect.left) / rect.width, 0, 1);
            zoomAt(viewStart + fraction * viewSpan, fraction, e.deltaY > 0 ? 1.25 : 0.8);
        };
        track.addEventListener('wheel', onWheel, { passive: false });
        return () => track.removeEventListener('wheel', onWheel);
    }, [zoom.latest, zoomAt]);

    useEffect(() => {
        if (isDragging) {
            document.addEventListener('pointermove', handleMouseMove);
            document.addEventListener('pointerup', handleMouseUp);
            document.addEventListener('pointercancel', handleMouseUp);
        } else {
            document.removeEventListener('pointermove', handleMouseMove);
            document.removeEventListener('pointerup', handleMouseUp);
            document.removeEventListener('pointercancel', handleMouseUp);
        }

        return () => {
            document.removeEventListener('pointermove', handleMouseMove);
            document.removeEventListener('pointerup', handleMouseUp);
            document.removeEventListener('pointercancel', handleMouseUp);
        };
    }, [isDragging, preserveHistory]);

    const visibleLeft = (index: number) => {
        const left = ((index - viewStart) / viewSpan) * 100;
        return left < 0 || left > 100 ? null : Math.min(left, MAX_LEFT);
    };
    const playheadLeft = visibleLeft(timeCurrentIndex);
    const shelfLeft = visibleLeft(Math.max(0, timeCurrentIndex - TRAIL_FRAMES));

    return (
        <div
            ref={trackRef}
            className="timeline-container border border-eft relative mt-7"
            style={{ touchAction: 'none' }}
            onClick={(e) => handleTimelineClick(e)}
            onPointerDown={handleTrackPointerDown}
            onPointerMove={handleTrackPointerMove}
            onPointerUp={handleTrackPointerEnd}
            onPointerCancel={handleTrackPointerEnd}
        >
            { events.length > 0 ? events.map(e => {
                const left = visibleLeft(findInsertIndex(e.time, sliderTimes));
                if (left === null) return null;
                return <div key={e.time} className='event-marker tooltip event' style={{ left: `${left}%` }} data-e={JSON.stringify(e)}>
                    <span className="tooltiptext event"><strong>{ e.profileNickname }</strong><br /> killed <br /><strong>{ e.killedNickname }</strong></span>
                </div>;
            }) : ''}
            <div
                className="shelf-slider"
                style={{
                    display: preserveHistory || shelfLeft === null ? 'none' : '',
                    left: `${shelfLeft ?? 0}%`,
                }}
                onPointerDown={handleMouseDown}
            ></div>

            <div
                className="player-slider"
                style={{
                    display: playheadLeft === null ? 'none' : '',
                    left: `${playheadLeft ?? 0}%`,
                }}
                onPointerDown={handleMouseDown}
            ></div>
        </div>
    );
}

// Zoom buttons and, while zoomed, an overview of the whole raid to move the window.
export function TimelineZoomControls({ zoom, sliderTimes, timeCurrentIndex }: { zoom: TimelineZoom, sliderTimes: number[], timeCurrentIndex: number }) {
    const { view, viewSpan, lastIndex, canZoom, applyView, zoomAroundPlayhead, reset } = zoom;
    const panOffset = useRef<number | null>(null);

    const overviewIndex = (e: React.PointerEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        return clamp((e.clientX - rect.left) / rect.width, 0, 1) * zoom.latest.current.lastIndex;
    };

    // Drag the window to pan, tap elsewhere to center it there.
    const handleOverviewPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        const index = overviewIndex(e);
        const { viewStart, viewSpan } = zoom.latest.current;
        const insideWindow = index >= viewStart && index <= viewStart + viewSpan;
        panOffset.current = insideWindow ? index - viewStart : viewSpan / 2;
        applyView(index - panOffset.current, viewSpan);
    };

    const handleOverviewPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (panOffset.current === null) return;
        applyView(overviewIndex(e) - panOffset.current, zoom.latest.current.viewSpan);
    };

    const handleOverviewPointerEnd = () => {
        panOffset.current = null;
    };

    const timeAt = (index: number) => msToHMS(sliderTimes[clamp(Math.round(index), 0, lastIndex)]);

    return (
        <div className="timeline-zoom">
            {view ? (
                <>
                    <span className="timeline-zoom-time">{timeAt(view.start)}</span>
                    <div
                        className="timeline-overview"
                        title="Drag to move through the raid"
                        aria-hidden="true"
                        onPointerDown={handleOverviewPointerDown}
                        onPointerMove={handleOverviewPointerMove}
                        onPointerUp={handleOverviewPointerEnd}
                        onPointerCancel={handleOverviewPointerEnd}
                    >
                        <div className="timeline-overview-window" style={{ left: `${(view.start / lastIndex) * 100}%`, width: `${((view.end - view.start) / lastIndex) * 100}%` }} />
                        <div className="timeline-overview-playhead" style={{ left: `${(clamp(timeCurrentIndex, 0, lastIndex) / lastIndex) * 100}%` }} />
                    </div>
                    <span className="timeline-zoom-time">{timeAt(view.end)}</span>
                </>
            ) : (
                <span className="timeline-zoom-hint">
                    <span className="max-md:hidden">Zoom: + / − or mouse wheel on the bar</span>
                    <span className="md:hidden">Zoom: + / − or pinch the bar</span>
                </span>
            )}
            <div className="timeline-zoom-buttons">
                <button type="button" aria-label="Zoom out of the replay bar" disabled={!view} onClick={() => zoomAroundPlayhead(2)}>−</button>
                <button type="button" aria-label="Zoom in on the replay bar" disabled={!canZoom || viewSpan <= MIN_VIEW_FRAMES} onClick={() => zoomAroundPlayhead(0.5)}>+</button>
                <button type="button" aria-label="Show the whole raid" disabled={!view} onClick={reset}>Fit</button>
            </div>
        </div>
    );
}
