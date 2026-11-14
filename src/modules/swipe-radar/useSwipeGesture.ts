import React, { useCallback, useRef, useState } from 'react';

const SWIPE_THRESHOLD = 110; // px of horizontal travel that commits a swipe
const FLY_OUT_MS = 220;

export type SwipeDirection = 'left' | 'right';

interface DragState {
  dx: number;
  dy: number;
  dragging: boolean;
  exiting: SwipeDirection | null;
}

const REST: DragState = { dx: 0, dy: 0, dragging: false, exiting: null };

/**
 * Pointer (mouse + touch + pen) drag gestures for the swipe card.
 * Drag right past the threshold → onSwipe('right'), left → onSwipe('left').
 * Buttons inside the card keep working because drags never start on them.
 */
export function useSwipeGesture(onSwipe: (direction: SwipeDirection) => void) {
  const [state, setState] = useState<DragState>(REST);
  const origin = useRef<{ x: number; y: number } | null>(null);

  const commit = useCallback(
    (direction: SwipeDirection) => {
      setState({ dx: 0, dy: 0, dragging: false, exiting: direction });
      window.setTimeout(() => {
        onSwipe(direction);
        setState(REST);
      }, FLY_OUT_MS);
    },
    [onSwipe]
  );

  const onPointerDown = (e: React.PointerEvent<HTMLElement>) => {
    if (state.exiting || (e.target as HTMLElement).closest('button, a, input')) return;
    origin.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (!origin.current) return;
    const dx = e.clientX - origin.current.x;
    const dy = e.clientY - origin.current.y;
    if (!state.dragging && Math.abs(dx) < 6) return; // ignore taps / vertical scroll intent
    setState({ dx, dy: dy * 0.25, dragging: true, exiting: null });
  };

  const onPointerEnd = () => {
    if (!origin.current) return;
    origin.current = null;
    if (state.dx > SWIPE_THRESHOLD) commit('right');
    else if (state.dx < -SWIPE_THRESHOLD) commit('left');
    else setState(REST);
  };

  const exitX = state.exiting === 'right' ? 600 : state.exiting === 'left' ? -600 : state.dx;
  const style: React.CSSProperties = {
    transform: `translate(${exitX}px, ${state.dy}px) rotate(${exitX / 18}deg)`,
    transition: state.dragging ? 'none' : `transform ${FLY_OUT_MS}ms ease-out`,
    opacity: state.exiting ? 0 : 1,
  };

  // 0..1 progress toward a commit, used for the CONNECT / PASS stamps
  const connectProgress = Math.min(1, Math.max(0, state.dx / SWIPE_THRESHOLD));
  const passProgress = Math.min(1, Math.max(0, -state.dx / SWIPE_THRESHOLD));

  return {
    style,
    connectProgress,
    passProgress,
    isExiting: state.exiting !== null,
    swipe: commit,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: onPointerEnd,
      onPointerCancel: onPointerEnd,
    },
  };
}
