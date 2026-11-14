import { useState } from 'react';
import { AuthProvider, useAuth, OnboardingModal, MyProfileDrawer, LinkedInImportModal } from './modules/auth';
import { ModuleErrorBoundary } from './shared/ui/ModuleErrorBoundary';
import { AppTab } from './shell/ModuleOutlet';
import { PhoneShell } from './shell/PhoneShell';
import { WebShell } from './shell/WebShell';
import { DeviceFrameStage } from './shell/DeviceFrameStage';
import { useViewMode, isEmbeddedPhoneFrame } from './shell/useViewMode';

function readInitialTab(): AppTab {
  const tab = new URLSearchParams(window.location.search).get('tab');
  return tab === 'swipe' || tab === 'plans' ? tab : 'map';
}

function MainAppShell() {
  const { showOnboarding, setShowOnboarding } = useAuth();
  const { shell, presenterView, setPresenterView } = useViewMode();
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<AppTab>(readInitialTab);

  // Desktop presenter "Phone App" mode: the real app runs inside the device frame
  if (shell === 'phone-frame') {
    return (
      <DeviceFrameStage
        presenterView={presenterView}
        onPresenterViewChange={setPresenterView}
        initialTab={activeTab}
      />
    );
  }

  return (
    <>
      {shell === 'phone-native' ? (
        <PhoneShell
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onOpenProfile={() => setIsProfileOpen(true)}
          showStatusBar={isEmbeddedPhoneFrame()}
        />
      ) : (
        <WebShell
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onOpenProfile={() => setIsProfileOpen(true)}
          presenterView={presenterView}
          onPresenterViewChange={setPresenterView}
        />
      )}

      {/* Fast Profile Onboarding */}
      <OnboardingModal isOpen={showOnboarding} onClose={() => setShowOnboarding(false)} />

      {/* My Profile: career history, targets & hobbies */}
      <MyProfileDrawer isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />

      {/* Import with LinkedIn profile generator */}
      <ModuleErrorBoundary moduleName="LinkedIn Import" fallbackTitle="LinkedIn import is currently recovering">
        <LinkedInImportModal />
      </ModuleErrorBoundary>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainAppShell />
    </AuthProvider>
  );
}
