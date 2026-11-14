import React, { useRef } from 'react';

interface SheetDragHandleProps {
  onClose: () => void;
  className?: string;
}

const DISMISS_DISTANCE = 110; // px dragged down before release closes the sheet
const DISMISS_VELOCITY = 0.6; // px/ms flick that closes regardless of distance

/**
 * iOS-style grab handle for bottom sheets. Dragging it moves the closest
 * `.tp-sheet` panel; releasing far enough (or flicking) dismisses it.
 */
export const SheetDragHandle: React.FC<SheetDragHandleProps> = ({ onClose, className = '' }) => {
  const drag = useRef<{ startY: number; startT: number; dy: number; panel: HTMLElement | null } | null>(null);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const panel = e.currentTarget.closest<HTMLElement>('.tp-sheet');
    drag.current = { startY: e.clientY, startT: performance.now(), dy: 0, panel };
    e.currentTarget.setPointerCapture?.(e.pointerId);
    if (panel) panel.style.transition = 'none';
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    d.dy = Math.max(0, e.clientY - d.startY);
    if (d.panel) d.panel.style.transform = `translateY(${d.dy}px)`;
  };

  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    const velocity = d.dy / Math.max(1, performance.now() - d.startT);
    const panel = d.panel;
    if (panel) {
      panel.style.transition = 'transform 220ms cubic-bezier(0.32, 0.72, 0, 1)';
      panel.style.transform = '';
    }
    if (d.dy > DISMISS_DISTANCE || (d.dy > 24 && velocity > DISMISS_VELOCITY)) {
      onClose();
    }
  };

  return (
    <div
      data-testid="sheet-drag-handle"
      role="button"
      aria-label="Drag down to close"
      tabIndex={-1}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className={`tp-sheet-handle ${className}`}
    >
      <span />
    </div>
  );
};
