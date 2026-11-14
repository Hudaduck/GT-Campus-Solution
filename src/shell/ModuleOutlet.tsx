import React, { Suspense, lazy } from 'react';
import { ModuleErrorBoundary } from '../shared/ui/ModuleErrorBoundary';
import { LayoutMode } from '../shared/ui/layout';

// Feature modules are code-split so the shell paints before Leaflet & friends download,
// and the desktop "Phone App" outer page (which renders no modules) never loads them.
const EventsMapView = lazy(() => import('../modules/events-map').then((m) => ({ default: m.EventsMapView })));
const SwipeRadarView = lazy(() => import('../modules/swipe-radar').then((m) => ({ default: m.SwipeRadarView })));
const MyPlansView = lazy(() => import('../modules/scheduler').then((m) => ({ default: m.MyPlansView })));

export type AppTab = 'map' | 'swipe' | 'plans';

interface ModuleOutletProps {
  activeTab: AppTab;
  layout: LayoutMode;
  onNavigate: (tab: AppTab) => void;
}

const ModuleLoading: React.FC = () => (
  <div data-testid="module-loading" role="status" aria-label="Loading" className="flex-1 flex items-center justify-center py-24">
    <div className="w-8 h-8 rounded-full border-2 border-tp-accent/30 border-t-tp-accent animate-spin" />
  </div>
);

// Renders the active feature module, each behind its own fault-isolation boundary
export const ModuleOutlet: React.FC<ModuleOutletProps> = ({ activeTab, layout, onNavigate }) => (
  <>
    {activeTab === 'map' && (
      <ModuleErrorBoundary moduleName="Events Map Radar" fallbackTitle="Events Map is currently recovering">
        <Suspense fallback={<ModuleLoading />}>
          <EventsMapView layout={layout} />
        </Suspense>
      </ModuleErrorBoundary>
    )}

    {activeTab === 'swipe' && (
      <ModuleErrorBoundary moduleName="1-on-1 Swipe Radar" fallbackTitle="Swipe Radar is currently recovering">
        <Suspense fallback={<ModuleLoading />}>
          <SwipeRadarView
            layout={layout}
            onNavigateToPlans={() => onNavigate('plans')}
            onNavigateToMap={() => onNavigate('map')}
          />
        </Suspense>
      </ModuleErrorBoundary>
    )}

    {activeTab === 'plans' && (
      <ModuleErrorBoundary moduleName="My Plans & Scheduler" fallbackTitle="My Plans is currently recovering">
        <Suspense fallback={<ModuleLoading />}>
          <MyPlansView
            layout={layout}
            onNavigateToRadar={() => onNavigate('swipe')}
            onNavigateToMap={() => onNavigate('map')}
          />
        </Suspense>
      </ModuleErrorBoundary>
    )}
  </>
);
