import React from 'react';
import { Smartphone, Monitor } from 'lucide-react';
import { PresenterView } from './useViewMode';

interface ViewModeToggleProps {
  value: PresenterView;
  onChange: (view: PresenterView) => void;
  className?: string;
}

// Live demo switcher between the Phone App device frame and the full Web App
export const ViewModeToggle: React.FC<ViewModeToggleProps> = ({ value, onChange, className = '' }) => {
  const options: { id: PresenterView; label: string; Icon: typeof Smartphone }[] = [
    { id: 'phone', label: 'Phone App', Icon: Smartphone },
    { id: 'web', label: 'Web App', Icon: Monitor },
  ];

  return (
    <div
      role="radiogroup"
      aria-label="Demo view"
      data-testid="view-mode-toggle"
      className={`inline-flex items-center p-1 rounded-full bg-tp-canvas/80 border border-[#B39051]/50 ${className}`}
    >
      {options.map(({ id, label, Icon }) => {
        const active = value === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={active}
            data-testid={`view-mode-${id}`}
            onClick={() => onChange(id)}
            className={`flex items-center gap-1.5 px-3 h-9 rounded-full text-xs font-bold transition ${
              active ? 'bg-[#B39051] text-[#051E39] shadow' : 'text-tp-muted hover:text-tp-ink'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
};
