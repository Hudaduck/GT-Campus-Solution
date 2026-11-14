import React from 'react';
import { ModuleErrorBoundary } from '../shared/ui/ModuleErrorBoundary';
import { LayoutMode } from '../shared/ui/layout';
import { EventsMapView } from '../modules/events-map';
import { SwipeRadarView } from '../modules/swipe-radar';
import { MyPlansView } from '../modules/scheduler';

export type AppTab = 'map' | 'swipe' | 'plans';

interface ModuleOutletProps {
  activeTab: AppTab;
  layout: LayoutMode;
  onNavigate: (tab: AppTab) => void;
}

// Renders the active feature module, each behind its own fault-isolation boundary
export const ModuleOutlet: React.FC<ModuleOutletProps> = ({ activeTab, layout, onNavigate }) => (
  <>
    {activeTab === 'map' && (
      <ModuleErrorBoundary moduleName="Events Map Radar" fallbackTitle="Events Map is currently recovering">
        <EventsMapView layout={layout} />
      </ModuleErrorBoundary>
    )}

    {activeTab === 'swipe' && (
      <ModuleErrorBoundary moduleName="1-on-1 Swipe Radar" fallbackTitle="Swipe Radar is currently recovering">
        <SwipeRadarView
          layout={layout}
          onNavigateToPlans={() => onNavigate('plans')}
          onNavigateToMap={() => onNavigate('map')}
        />
      </ModuleErrorBoundary>
    )}

    {activeTab === 'plans' && (
      <ModuleErrorBoundary moduleName="My Plans & Scheduler" fallbackTitle="My Plans is currently recovering">
        <MyPlansView
          layout={layout}
          onNavigateToRadar={() => onNavigate('swipe')}
          onNavigateToMap={() => onNavigate('map')}
        />
      </ModuleErrorBoundary>
    )}
  </>
);
