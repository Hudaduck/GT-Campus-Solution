import React from 'react';
import { useAuth } from './AuthContext';
import { useBrand } from '../../shared/config/brandConfig';
import { GraduationCap, Briefcase, ShieldCheck, UserCheck, Sparkles } from 'lucide-react';

export interface DemoRoleSwitcherProps {
  className?: string;
  showDetails?: boolean;
  variant?: 'full' | 'compact'; // compact = mobile header Student / Alum pill
}

export const DemoRoleSwitcher: React.FC<DemoRoleSwitcherProps> = ({
  className = '',
  showDetails = false,
  variant = 'full',
}) => {
  const { user, isStudent, isAlum, switchRole, setShowOnboarding } = useAuth();
  const { brand } = useBrand();

  if (variant === 'compact') {
    const pill = (active: boolean) =>
      `px-3 h-11 rounded-full text-xs font-bold transition ${
        active ? 'bg-[#B39051] text-[#051E39]' : 'text-tp-muted'
      }`;
    return (
      <div
        data-testid="demo-role-switcher"
        className={`flex items-center rounded-full bg-tp-canvas/70 border border-[#B39051]/35 ${className}`}
      >
        <button
          type="button"
          data-testid="switch-student-btn"
          onClick={() => switchRole('student')}
          aria-pressed={isStudent}
          className={pill(isStudent)}
        >
          Student
        </button>
        <button
          type="button"
          data-testid="switch-alum-btn"
          onClick={() => switchRole('alumni')}
          aria-pressed={isAlum}
          className={pill(isAlum)}
        >
          Alum
        </button>
      </div>
    );
  }

  const getVerificationBadge = () => {
    if (!user.verified) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-[#B39051]/15 text-tp-accent border border-[#B39051]/50">
          Unverified
        </span>
      );
    }

    switch (user.verificationMethod) {
      case 'gatech_sso':
      case 'domain':
        return (
          <span
            data-testid="verification-badge"
            className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#8F713D] text-white border border-[#8F713D]"
            title={`Verified via ${brand.studentEmailDomain} campus domain`}
          >
            <ShieldCheck className="w-3 h-3 text-white" />
            <span>{isStudent ? 'Student SSO' : 'Campus Verified'}</span>
          </span>
        );
      case 'linkedin':
        return (
          <span
            data-testid="verification-badge"
            className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#8F713D] text-white border border-[#8F713D]"
            title="LinkedIn profile linked (not identity-verified)"
          >
            <UserCheck className="w-3 h-3 text-white" />
            <span>LinkedIn Linked</span>
          </span>
        );
      case 'peer_vouch':
        return (
          <span
            data-testid="verification-badge"
            className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#8F713D] text-white border border-[#8F713D]"
            title={`Vouched by ${user.vouchesCount || 1} campus peers`}
          >
            <Sparkles className="w-3 h-3 text-white" />
            <span>Peer Vouched ({user.vouchesCount || 1})</span>
          </span>
        );
      default:
        return (
          <span
            data-testid="verification-badge"
            className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#8F713D] text-white border border-[#8F713D]"
          >
            <ShieldCheck className="w-3 h-3 text-white" />
            <span>Verified</span>
          </span>
        );
    }
  };

  return (
    <div
      data-testid="demo-role-switcher"
      className={`inline-flex flex-wrap items-center gap-2 p-1 rounded-xl bg-tp-canvas/80 border border-[#B39051]/35 text-xs shadow-inner ${className}`}
    >
      {/* Segmented Switcher Controls */}
      <div className="flex items-center bg-tp-surface p-0.5 rounded-lg border border-[#B39051]/35">
        <button
          type="button"
          data-testid="switch-student-btn"
          onClick={() => switchRole('student')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-all ${
            isStudent
              ? 'bg-[#B39051] text-[#051E39] font-bold shadow-sm'
              : 'text-tp-muted hover:text-tp-ink hover:bg-tp-ink/5'
          }`}
          aria-pressed={isStudent}
          title="Preview campus experience as a Georgia Tech student"
        >
          <GraduationCap className="w-3.5 h-3.5" />
          <span>Preview as Student</span>
        </button>

        <button
          type="button"
          data-testid="switch-alum-btn"
          onClick={() => switchRole('alumni')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-all ${
            isAlum
              ? 'bg-[#B39051] text-[#051E39] font-bold shadow-sm'
              : 'text-tp-muted hover:text-tp-ink hover:bg-tp-ink/5'
          }`}
          aria-pressed={isAlum}
          title="Preview campus experience as a verified Georgia Tech alum"
        >
          <Briefcase className="w-3.5 h-3.5" />
          <span>Preview as Alum</span>
        </button>
      </div>

      {/* Verification status pill */}
      <div className="hidden sm:flex items-center gap-1.5">
        {getVerificationBadge()}
      </div>

      {/* Optional User Details or Fast Onboard Trigger */}
      <div className="flex items-center gap-1.5 pl-1">
        <button
          type="button"
          data-testid="open-onboarding-btn"
          onClick={() => setShowOnboarding(true)}
          className="text-[11px] font-medium text-tp-muted hover:text-tp-accent underline-offset-2 hover:underline transition-colors px-1"
          title="Customize profile and role attributes"
        >
          Onboarding
        </button>

        {showDetails && (
          <span className="text-[11px] text-tp-subtle font-mono hidden md:inline">
            ({user.name} • ’{String(user.gradYear).slice(-2)})
          </span>
        )}
      </div>
    </div>
  );
};
