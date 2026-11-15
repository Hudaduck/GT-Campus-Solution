import React, { useEffect, useState } from 'react';
import { useBrand } from '../shared/config/brandConfig';
import { BrandMark } from '../shared/ui/BrandMark';
import { ViewModeToggle } from './ViewModeToggle';
import { ResetDemoButton } from '../shared/ui/ResetDemoButton';
import { PresenterView, PHONE_FRAME_QUERY_PARAM } from './useViewMode';
import { AppTab } from './ModuleOutlet';

const DEVICE_WIDTH = 412;
const DEVICE_HEIGHT = 860;
const BEZEL = 12;
const STAGE_CHROME = 120; // header + breathing room around the device

interface DeviceFrameStageProps {
  presenterView: PresenterView;
  onPresenterViewChange: (view: PresenterView) => void;
  initialTab: AppTab;
}

/**
 * Desktop "Phone App" presenter mode. The app runs inside an iframe at a real
 * 412px viewport so every breakpoint, bottom sheet and `dvh` unit behaves exactly
 * as on a phone. State is shared with the outer page through localStorage.
 */
export const DeviceFrameStage: React.FC<DeviceFrameStageProps> = ({
  presenterView,
  onPresenterViewChange,
  initialTab,
}) => {
  const { brand } = useBrand();
  const [scale, setScale] = useState(1);
  // Freeze the src so tab changes inside the frame are not reset by re-renders
  const [src] = useState(() => {
    const params = new URLSearchParams({ [PHONE_FRAME_QUERY_PARAM]: 'phone', tab: initialTab });
    return `${window.location.pathname}?${params.toString()}`;
  });

  useEffect(() => {
    const fit = () => {
      const available = window.innerHeight - STAGE_CHROME;
      setScale(Math.min(1, available / (DEVICE_HEIGHT + BEZEL * 2)));
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  return (
    <div
      data-testid="device-frame-stage"
      className="h-screen flex flex-col bg-[radial-gradient(ellipse_at_top,#0A294B_0%,#051E39_60%)] tp-on-navy text-tp-ink overflow-hidden"
    >
      <header className="h-16 shrink-0 flex items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <BrandMark size={30} />
          <div>
            <h1 className="text-lg font-black leading-tight">{brand.appName}</h1>
            <p className="text-[11px] text-tp-muted">{brand.tagline}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ResetDemoButton />
          <ViewModeToggle value={presenterView} onChange={onPresenterViewChange} />
        </div>
      </header>

      <div className="flex-1 min-h-0 flex items-center justify-center">
        <div
          style={{
            width: DEVICE_WIDTH + BEZEL * 2,
            height: DEVICE_HEIGHT + BEZEL * 2,
            transform: `scale(${scale})`,
          }}
          className="relative shrink-0 rounded-[56px] bg-black p-3 shadow-[0_30px_80px_rgba(0,0,0,0.6)] ring-1 ring-[#B39051]/50"
        >
          {/* Dynamic-island style camera cutout */}
          <div className="absolute top-[22px] left-1/2 -translate-x-1/2 w-28 h-7 rounded-full bg-black z-10 pointer-events-none" />
          <iframe
            title={`${brand.appName} phone app preview`}
            data-testid="phone-frame-iframe"
            src={src}
            width={DEVICE_WIDTH}
            height={DEVICE_HEIGHT}
            className="block rounded-[44px] bg-tp-canvas border-0"
          />
        </div>
      </div>
    </div>
  );
};
