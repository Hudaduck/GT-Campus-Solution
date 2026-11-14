import React from 'react';
import { MapPin, Users, Calendar, Signal, Wifi, BatteryFull } from 'lucide-react';
import { useBrand } from '../shared/config/brandConfig';
import { BrandMark } from '../shared/ui/BrandMark';
import { useAuth, DemoRoleSwitcher } from '../modules/auth';
import { ModuleOutlet, AppTab } from './ModuleOutlet';

interface PhoneShellProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  onOpenProfile: () => void;
  showStatusBar?: boolean; // faux iOS status bar when rendered inside the device frame
}

const TABS: { id: AppTab; label: string; Icon: typeof MapPin }[] = [
  { id: 'map', label: 'Map', Icon: MapPin },
  { id: 'swipe', label: 'Swipe', Icon: Users },
  { id: 'plans', label: 'Plans', Icon: Calendar },
];

// Native mobile app chrome: 56px header + scrolling content + frosted bottom tab bar
export const PhoneShell: React.FC<PhoneShellProps> = ({
  activeTab,
  onTabChange,
  onOpenProfile,
  showStatusBar = false,
}) => {
  const { brand } = useBrand();
  const { user } = useAuth();

  return (
    <div data-testid="phone-shell" className="tp-phone-shell relative flex flex-col bg-[#051E39] text-tp-ink overflow-hidden">
      {showStatusBar && (
        <div aria-hidden="true" className="tp-on-navy text-tp-ink h-11 shrink-0 flex items-end justify-between px-7 pb-1 text-[13px] font-semibold">
          <span>9:41</span>
          <span className="flex items-center gap-1">
            <Signal className="w-3.5 h-3.5" />
            <Wifi className="w-3.5 h-3.5" />
            <BatteryFull className="w-4 h-4" />
          </span>
        </div>
      )}
      <header className="h-14 shrink-0 z-30 flex items-center justify-between gap-2 px-3 bg-[#051E39] tp-on-navy text-tp-ink border-b border-[#B39051]">
        <div className="flex items-center gap-1.5 min-w-0">
          <BrandMark size={26} />
          <h1 className="text-base font-black tracking-tight truncate">{brand.appName}</h1>
        </div>

        <div className="flex items-center gap-2">
          <DemoRoleSwitcher variant="compact" />
          <button
            type="button"
            onClick={onOpenProfile}
            data-testid="header-my-profile-button"
            aria-label="My Profile"
            className="w-11 h-11 shrink-0 rounded-full border-2 border-[#B39051] overflow-hidden bg-tp-surface flex items-center justify-center text-tp-accent font-black"
          >
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              user.name?.[0] ?? 'GT'
            )}
          </button>
        </div>
      </header>

      <main className="tp-phone-main flex-1 min-h-0 overflow-y-auto overscroll-contain bg-tp-canvas">
        <ModuleOutlet activeTab={activeTab} layout="phone" onNavigate={onTabChange} />
      </main>

      <nav
        data-testid="bottom-nav-dock"
        aria-label="Primary"
        className="tp-tabbar tp-on-navy absolute bottom-0 inset-x-0 z-40 border-t border-[#B39051] px-4 pt-2 flex items-center justify-around"
      >
        {TABS.map(({ id, label, Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onTabChange(id)}
              data-testid={`nav-tab-${id}`}
              aria-current={active ? 'page' : undefined}
              className="flex flex-col items-center justify-center gap-0.5 min-w-[72px] min-h-[48px]"
            >
              <span
                className={`flex items-center justify-center w-14 h-8 rounded-full transition-colors ${
                  active ? 'bg-[#B39051] text-[#051E39]' : 'text-tp-muted'
                }`}
              >
                <Icon className="w-5 h-5" />
              </span>
              <span className={`text-[11px] ${active ? 'text-tp-accent font-bold' : 'text-tp-muted font-medium'}`}>
                {label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
