import { useCallback, useEffect, useState } from 'react';
import { DESKTOP_BREAKPOINT_PX } from '../shared/ui/layout';

export type PresenterView = 'phone' | 'web';

const VIEW_STORAGE_KEY = 'thirdplace_presenter_view';
export const PHONE_FRAME_QUERY_PARAM = 'frame';

// True when this document is the app rendered *inside* the Phone App device frame
export function isEmbeddedPhoneFrame(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get(PHONE_FRAME_QUERY_PARAM) === 'phone';
}

function readStoredView(): PresenterView {
  try {
    return localStorage.getItem(VIEW_STORAGE_KEY) === 'phone' ? 'phone' : 'web';
  } catch {
    return 'web';
  }
}

function isNarrowViewport(): boolean {
  return typeof window !== 'undefined' && window.innerWidth < DESKTOP_BREAKPOINT_PX;
}

/**
 * Decides which shell to render:
 * - 'phone-native': real phone (< 768px) or the embedded device-frame document
 * - 'phone-frame':  desktop presenter chose "Phone App" (centered 412x860 device)
 * - 'web':          desktop presenter chose "Web App"
 */
export function useViewMode() {
  const [isNarrow, setIsNarrow] = useState(isNarrowViewport);
  const [presenterView, setPresenterViewState] = useState<PresenterView>(readStoredView);
  const embedded = isEmbeddedPhoneFrame();

  useEffect(() => {
    const onResize = () => setIsNarrow(isNarrowViewport());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const setPresenterView = useCallback((view: PresenterView) => {
    setPresenterViewState(view);
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, view);
    } catch {
      // Presenter preference is a convenience; ignore storage failures
    }
  }, []);

  const shell: 'phone-native' | 'phone-frame' | 'web' =
    embedded || isNarrow ? 'phone-native' : presenterView === 'phone' ? 'phone-frame' : 'web';

  return { shell, presenterView, setPresenterView };
}
