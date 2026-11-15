import React from 'react';
import { MapPin, Users, Calendar, Moon, Sun, UserCircle2 } from 'lucide-react';
import { useBrand } from '../shared/config/brandConfig';
import { BrandMark } from '../shared/ui/BrandMark';
import { useAuth, DemoRoleSwitcher } from '../modules/auth';
import { ModuleOutlet, AppTab } from './ModuleOutlet';
import { ViewModeToggle } from './ViewModeToggle';
import { ResetDemoButton } from '../shared/ui/ResetDemoButton';
import { PresenterView } from './useViewMode';

interface WebShellProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  onOpenProfile: () => void;
  presenterView: PresenterView;
  onPresenterViewChange: (view: PresenterView) => void;
}

const NAV: { id: AppTab; label: string; subtitle: string; Icon: typeof MapPin }[] = [
  { id: 'map', label: 'Map Radar', subtitle: 'Recommended pop-ups', Icon: MapPin },
  { id: 'swipe', label: 'Connect 1-on-1', subtitle: 'Career & hobby matches', Icon: Users },
  { id: 'plans', label: 'My Plans', subtitle: 'Meetups & RSVPs', Icon: Calendar },
];

// Responsive desktop web app: 240px GT Navy rail + multi-column content area
export const WebShell: React.FC<WebShellProps> = ({
  activeTab,
  onTabChange,
  onOpenProfile,
  presenterView,
  onPresenterViewChange,
}) => {
  const { brand, isDarkMode, toggleDarkMode } = useBrand();
  const { user } = useAuth();
  const current = NAV.find((n) => n.id === activeTab)!;

  return (
    <div data-testid="web-shell" className="h-screen flex bg-tp-canvas text-tp-ink overflow-hidden">
      <aside className="w-[240px] shrink-0 bg-[#051E39] tp-on-navy text-tp-ink border-r border-[#B39051] flex flex-col">
        <div className="px-5 pt-6 pb-5 border-b border-[#B39051]/35">
          <div className="flex items-center gap-2">
            <BrandMark size={30} />
            <h1 className="text-xl font-black tracking-tight">{brand.appName}</h1>
          </div>
          <span className="inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#B39051] text-[#051E39] uppercase tracking-wider">
            {brand.shortName}
          </span>
          <p className="mt-1.5 text-[11px] text-tp-muted">{brand.tagline}</p>
        </div>

        <nav aria-label="Primary" className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ id, label, subtitle, Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onTabChange(id)}
                data-testid={`nav-tab-${id}`}
                aria-current={active ? 'page' : undefined}
                className={`w-full flex items-center gap-3 px-3 min-h-[52px] rounded-xl text-left transition ${
                  active
                    ? 'bg-[#B39051] text-[#051E39] ring-1 ring-[#B39051]'
                    : 'text-tp-muted hover:bg-[#8F713D]/30 hover:text-tp-ink'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="min-w-0">
                  <span className="block text-sm font-bold">{label}</span>
                  <span className={`block text-[11px] truncate ${active ? 'text-[#051E39]/80' : 'text-tp-subtle'}`}>
                    {subtitle}
                  </span>
                </span>
              </button>
            );
          })}
        </nav>

        <div className="px-3 pb-5 space-y-2 border-t border-[#B39051]/35 pt-4">
          <p className="px-1 text-[10px] font-bold uppercase tracking-wider text-tp-accent">Live demo view</p>
          <ViewModeToggle value={presenterView} onChange={onPresenterViewChange} className="w-full justify-between" />
          <ResetDemoButton className="w-full" compact />

          <button
            type="button"
            onClick={onOpenProfile}
            data-testid="header-my-profile-button"
            className="w-full flex items-center gap-2.5 px-2 min-h-[48px] rounded-xl bg-tp-surface border border-[#B39051]/35 hover:border-[#B39051] transition text-left"
          >
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover border border-[#B39051]" />
            ) : (
              <UserCircle2 className="w-8 h-8 text-tp-accent" />
            )}
            <span className="min-w-0">
              <span className="block text-xs font-bold truncate">My Profile</span>
              <span className="block text-[11px] text-tp-subtle truncate">{user.name}</span>
            </span>
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 shrink-0 flex items-center justify-between gap-4 px-6 bg-[#051E39] tp-on-navy text-tp-ink border-b border-[#B39051]">
          <div>
            <h2 className="text-base font-black">{current.label}</h2>
            <p className="text-[11px] text-tp-subtle">{current.subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <DemoRoleSwitcher />
            <button
              type="button"
              onClick={toggleDarkMode}
              aria-label="Toggle Theme"
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-[#B39051]/50 bg-tp-surface text-tp-accent hover:bg-tp-elevated transition-colors"
            >
              {isDarkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
          </div>
        </header>

        <main className="flex-1 min-h-0 overflow-y-auto">
          <ModuleOutlet activeTab={activeTab} layout="web" onNavigate={onTabChange} />
        </main>
      </div>
    </div>
  );
};
