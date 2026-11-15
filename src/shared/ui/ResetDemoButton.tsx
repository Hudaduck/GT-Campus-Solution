import React, { useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Repository } from '../data/repository';

interface ResetDemoButtonProps {
  className?: string;
  compact?: boolean;
}

/**
 * Puts the demo back to a fresh start: default personas, seed pop-ups (re-timed to now), and no
 * matches, chats, meetups or RSVPs you made. Two taps (the first arms it) so it can't fire by
 * accident mid-presentation. Theme and Phone/Web presenter choice are kept.
 */
export const ResetDemoButton: React.FC<ResetDemoButtonProps> = ({ className = '', compact = false }) => {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const id = window.setTimeout(() => setArmed(false), 4000);
    return () => window.clearTimeout(id);
  }, [armed]);

  const reset = () => {
    if (!armed) {
      setArmed(true);
      return;
    }
    Repository.resetAllData();
    // Reload the top page so every view (and the Phone App frame) starts from the fresh data
    (window.top ?? window).location.reload();
  };

  return (
    <button
      type="button"
      data-testid="reset-demo-button"
      onClick={reset}
      title="Restore the default demo profiles and data"
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl border text-xs font-semibold transition ${
        compact ? 'min-h-[32px] px-2.5' : 'min-h-[40px] px-3'
      } ${
        armed
          ? 'bg-red-500 text-white border-red-500'
          : 'border-[#B39051]/50 text-tp-muted hover:text-tp-ink hover:border-[#B39051]'
      } ${className}`}
    >
      <RotateCcw className="w-3.5 h-3.5" />
      {armed ? 'Tap again to reset' : 'Reset demo'}
    </button>
  );
};
