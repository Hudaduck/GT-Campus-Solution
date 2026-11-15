import React, { useState, useEffect } from 'react';
import { BrandMark } from '../../shared/ui/BrandMark';
import { useAuth } from './AuthContext';
import { useBrand } from '../../shared/config/brandConfig';
import { POPULAR_HOBBIES, formatHobby } from '../../shared/data/repository';
import { UserRole, MeetupIntent } from '../../shared/contracts';
import { IntentPicker } from '../../shared/ui/IntentPicker';
import { SheetDragHandle } from '../../shared/ui/SheetDragHandle';
import { LinkedInImportButton } from './LinkedInImportModal';
import { X, GraduationCap, Briefcase, Check, ShieldCheck, Sparkles, Plus, AlertCircle } from 'lucide-react';

export interface OnboardingModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}


export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen: propsIsOpen,
  onClose: propsOnClose,
}) => {
  const {
    user,
    showOnboarding,
    setShowOnboarding,
    completeOnboarding,
    verifyStudentEmail,
    verifyAlumniEmail,
    verifyAlumniLinkedIn,
    verifyAlumniPeerVouch,
    setShowLinkedInImport,
  } = useAuth();
  const { brand } = useBrand();

  const isOpen = propsIsOpen !== undefined ? propsIsOpen : showOnboarding;
  const handleClose = propsOnClose || (() => setShowOnboarding(false));

  // Form State
  const [role, setRole] = useState<UserRole>(user.role || 'student');
  const [name, setName] = useState<string>(user.name || '');
  const [gradYear, setGradYear] = useState<number>(user.gradYear || 2026);
  const [major, setMajor] = useState<string>(user.major || '');
  const [companyOrLab, setCompanyOrLab] = useState<string>(user.companyOrLab || '');
  const [workCompany, setWorkCompany] = useState<string>(user.workHistory?.[0]?.company || '');
  const [workRole, setWorkRole] = useState<string>(user.workHistory?.[0]?.role || '');
  const [targetCompaniesInput, setTargetCompaniesInput] = useState<string>(
    user.targetCompanies?.join(', ') || 'Stripe, Anthropic, Google'
  );
  const [targetRolesInput, setTargetRolesInput] = useState<string>(
    user.targetRoles?.join(', ') || 'AI/ML Engineer, Product Manager'
  );
  const [intents, setIntents] = useState<MeetupIntent[]>(user.intents ?? []);
  const [selectedHobbies, setSelectedHobbies] = useState<string[]>(
    user.hobbies && user.hobbies.length > 0 ? [...user.hobbies] : ['AI Startups', 'Bouldering', 'Pour-Over Coffee']
  );
  const [customHobbyInput, setCustomHobbyInput] = useState<string>('');

  // Dual Verification Sub-state
  const [verificationTab, setVerificationTab] = useState<'email' | 'linkedin' | 'vouch'>('email');
  const [emailInput, setEmailInput] = useState<string>(user.email || '');
  const [linkedinInput, setLinkedinInput] = useState<string>(user.linkedinUrl || '');
  const [vouchSuccessMessage, setVouchSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      setRole(user.role || 'student');
      setName(user.name || '');
      setGradYear(user.gradYear || 2026);
      setMajor(user.major || '');
      setCompanyOrLab(user.companyOrLab || '');
      setWorkCompany(user.workHistory?.[0]?.company || '');
      setWorkRole(user.workHistory?.[0]?.role || '');
      setTargetCompaniesInput(user.targetCompanies?.join(', ') || 'Stripe, Anthropic, Google');
      setTargetRolesInput(user.targetRoles?.join(', ') || 'AI/ML Engineer, Product Manager');
      setIntents(user.intents ?? []);
      setSelectedHobbies(
        user.hobbies && user.hobbies.length > 0 ? [...user.hobbies] : ['AI Startups', 'Bouldering', 'Pour-Over Coffee']
      );
      setEmailInput(user.email || '');
      setLinkedinInput(user.linkedinUrl || '');
      setErrorMessage(null);
      setVouchSuccessMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleHobby = (hobby: string) => {
    setErrorMessage(null);
    if (selectedHobbies.includes(hobby)) {
      setSelectedHobbies(selectedHobbies.filter((h) => h !== hobby));
    } else {
      if (selectedHobbies.length >= 5) {
        setErrorMessage('Maximum 5 hobbies allowed.');
        return;
      }
      setSelectedHobbies([...selectedHobbies, hobby]);
    }
  };

  const handleAddCustomHobby = (e?: React.SyntheticEvent) => {
    if (e) e.preventDefault();
    const trimmed = formatHobby(customHobbyInput);
    if (!trimmed) return;
    if (selectedHobbies.some((h) => h.toLowerCase() === trimmed.toLowerCase())) {
      setCustomHobbyInput('');
      return;
    }
    if (selectedHobbies.length >= 5) {
      setErrorMessage('Maximum 5 hobbies allowed.');
      return;
    }
    setSelectedHobbies([...selectedHobbies, trimmed]);
    setCustomHobbyInput('');
    setErrorMessage(null);
  };

  const handleInstantVerifyStudent = () => {
    setErrorMessage(null);
    const res = verifyStudentEmail(emailInput);
    if (!res.success) {
      setErrorMessage(res.error || 'Failed to verify student email');
    }
  };

  const handleVerifyAlumniEmail = () => {
    setErrorMessage(null);
    const res = verifyAlumniEmail(emailInput);
    if (!res.success) {
      setErrorMessage(res.error || 'Failed to verify alumni email');
    }
  };

  const handleVerifyLinkedIn = () => {
    setErrorMessage(null);
    const res = verifyAlumniLinkedIn(linkedinInput);
    if (!res.success) {
      setErrorMessage(res.error || 'Invalid LinkedIn URL');
    }
  };

  const handleOneTapPeerVouch = () => {
    setErrorMessage(null);
    const res = verifyAlumniPeerVouch('Georgia Tech Alumni Association');
    if (res.success) {
      setVouchSuccessMessage('1-Tap Peer Vouch registered! Verified by GTAA Alumni Ambassador network.');
    } else {
      setErrorMessage(res.error || 'Peer vouching failed');
    }
  };

  const handleSaveAndComplete = () => {
    setErrorMessage(null);

    if (selectedHobbies.length < 3 || selectedHobbies.length > 5) {
      setErrorMessage('Please select between 3 and 5 hobbies.');
      return;
    }

    if (!major.trim()) {
      setErrorMessage('Please enter your major.');
      return;
    }

    if (!gradYear || gradYear < 1960 || gradYear > 2035) {
      setErrorMessage('Please enter a valid graduation year.');
      return;
    }

    const parsedCompanies = targetCompaniesInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const parsedRoles = targetRolesInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    // The first work-history entry is the "current / most recent" role edited here;
    // older positions are kept and remain editable from My Profile.
    const priorHistory = user.workHistory || [];
    const workHistory =
      workCompany.trim() && workRole.trim()
        ? [
            {
              company: workCompany.trim(),
              role: workRole.trim(),
              period: priorHistory[0]?.period || `${new Date().getFullYear()} - Present`,
              isCurrent: true,
            },
            ...priorHistory.slice(1),
          ]
        : priorHistory;

    const res = completeOnboarding({
      name: name.trim() || (role === 'student' ? 'Alex Chen' : 'Sarah Jenkins'),
      role,
      gradYear: Number(gradYear),
      major: major.trim(),
      companyOrLab: companyOrLab.trim() || undefined,
      targetCompanies: parsedCompanies.length > 0 ? parsedCompanies : user.targetCompanies,
      targetRoles: parsedRoles.length > 0 ? parsedRoles : user.targetRoles,
      workHistory,
      intents,
      hobbies: selectedHobbies,
      email: emailInput.trim() || user.email,
      linkedinUrl: linkedinInput.trim() || user.linkedinUrl,
    });

    if (!res.success) {
      setErrorMessage(res.error || 'Failed to save onboarding details');
    } else {
      handleClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      data-testid="onboarding-modal"
      className="tp-sheet-backdrop"
    >
      <div
        className="tp-sheet md:max-w-xl bg-tp-surface text-tp-ink border-t md:border border-[#B39051]/50 !overflow-hidden flex flex-col"
      >
        <div className="bg-[#051E39]/90 tp-on-navy pt-2">
          <SheetDragHandle onClose={handleClose} className="!pb-1" />
        </div>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#B39051]/35 bg-[#051E39]/90 tp-on-navy">
          <div className="flex items-center gap-3">
            <BrandMark size={32} />
            <div>
              <h2 className="text-lg font-bold tracking-tight text-tp-ink flex items-center gap-2">
                <span>{brand.shortName} Fast Onboarding</span>
              </h2>
              <p className="text-xs text-tp-muted">
                Set your role, intent, hobbies, and verification credentials
              </p>
            </div>
          </div>
          <button
            type="button"
            data-testid="close-onboarding-modal"
            onClick={handleClose}
            className="p-1 rounded-lg text-tp-muted hover:text-tp-ink hover:bg-tp-ink/10 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto min-h-0 space-y-6 flex-1 text-sm">
          <LinkedInImportButton
            onClick={() => {
              handleClose();
              setShowLinkedInImport(true);
            }}
          />

          {errorMessage && (
            <div
              data-testid="onboarding-error-alert"
              className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs"
            >
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. Role Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-tp-accent mb-2">
              1. Your Campus Affiliation
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                data-testid="role-student-btn"
                onClick={() => setRole('student')}
                className={`p-3.5 rounded-xl border flex flex-col items-start gap-1 text-left transition-all ${
                  role === 'student'
                    ? 'border-[#B39051] bg-[#051E39] tp-on-navy shadow-lg ring-1 ring-[#B39051]'
                    : 'border-tp-line bg-tp-canvas/70 hover:border-[#B39051]/60'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2 font-bold text-tp-ink">
                    <GraduationCap className="w-4 h-4 text-tp-accent" />
                    <span>Current Student</span>
                  </div>
                  {role === 'student' && <Check className="w-4 h-4 text-tp-accent" />}
                </div>
                <span className="text-xs text-tp-muted">
                  Instant verification with {brand.studentEmailDomain}
                </span>
              </button>

              <button
                type="button"
                data-testid="role-alumni-btn"
                onClick={() => setRole('alumni')}
                className={`p-3.5 rounded-xl border flex flex-col items-start gap-1 text-left transition-all ${
                  role === 'alumni'
                    ? 'border-[#B39051] bg-[#051E39] tp-on-navy shadow-lg ring-1 ring-[#B39051]'
                    : 'border-tp-line bg-tp-canvas/70 hover:border-[#B39051]/60'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2 font-bold text-tp-ink">
                    <Briefcase className="w-4 h-4 text-tp-accent" />
                    <span>Alumni</span>
                  </div>
                  {role === 'alumni' && <Check className="w-4 h-4 text-tp-accent" />}
                </div>
                <span className="text-xs text-tp-muted">
                  LinkedIn, {brand.alumniEmailDomain}, or Peer Vouching
                </span>
              </button>
            </div>
          </div>

          {/* 2. Grad Year & Major/Company */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="onboard-grad-year" className="block text-xs font-semibold uppercase tracking-wider text-tp-accent mb-1.5">
                2. Graduation Year
              </label>
              <input
                id="onboard-grad-year"
                type="number"
                data-testid="onboard-gradyear-input"
                value={gradYear}
                onChange={(e) => setGradYear(Number(e.target.value))}
                min={1960}
                max={2035}
                className="w-full px-3.5 py-2.5 bg-tp-canvas border border-tp-line rounded-xl text-tp-ink focus:outline-none focus:border-[#B39051] transition-colors"
                placeholder="e.g. 2026"
              />
            </div>

            <div>
              <label htmlFor="onboard-major" className="block text-xs font-semibold uppercase tracking-wider text-tp-accent mb-1.5">
                3. Major / Field of Study
              </label>
              <input
                id="onboard-major"
                type="text"
                data-testid="onboard-major-input"
                value={major}
                onChange={(e) => setMajor(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-tp-canvas border border-tp-line rounded-xl text-tp-ink focus:outline-none focus:border-[#B39051] transition-colors"
                placeholder="e.g. Computer Science (AI)"
              />
            </div>
          </div>

          {/* Optional Company/Lab */}
          <div>
            <label htmlFor="onboard-company" className="block text-xs font-semibold uppercase tracking-wider text-tp-accent mb-1.5">
              {role === 'student' ? 'Lab, Project, or Student Org (Optional)' : 'Current Company & Title'}
            </label>
            <input
              id="onboard-company"
              type="text"
              data-testid="onboard-company-input"
              value={companyOrLab}
              onChange={(e) => setCompanyOrLab(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-tp-canvas border border-tp-line rounded-xl text-tp-ink focus:outline-none focus:border-[#B39051] transition-colors"
              placeholder={role === 'student' ? 'e.g. GT EcoCAR or VIP Lab' : 'e.g. Stripe • Senior Product Lead'}
            />
          </div>

          {/* Current / Most Recent Role (seeds workHistory) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="onboard-work-company" className="block text-xs font-semibold uppercase tracking-wider text-tp-accent mb-1.5">
                Current / Recent Company
              </label>
              <input
                id="onboard-work-company"
                type="text"
                data-testid="onboard-work-company-input"
                value={workCompany}
                onChange={(e) => setWorkCompany(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-tp-canvas border border-tp-line rounded-xl text-tp-ink text-xs focus:outline-none focus:border-[#B39051] transition-colors"
                placeholder="e.g. Google, Stripe, GT Research Lab"
              />
            </div>
            <div>
              <label htmlFor="onboard-work-role" className="block text-xs font-semibold uppercase tracking-wider text-tp-accent mb-1.5">
                Role / Title
              </label>
              <input
                id="onboard-work-role"
                type="text"
                data-testid="onboard-work-role-input"
                value={workRole}
                onChange={(e) => setWorkRole(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-tp-canvas border border-tp-line rounded-xl text-tp-ink text-xs focus:outline-none focus:border-[#B39051] transition-colors"
                placeholder="e.g. SWE Intern, Product Manager"
              />
            </div>
          </div>

          {/* Target Companies & Roles for Radar Matching */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="onboard-target-companies" className="block text-xs font-semibold uppercase tracking-wider text-tp-accent mb-1.5">
                Target Companies
              </label>
              <input
                id="onboard-target-companies"
                type="text"
                data-testid="onboard-target-companies-input"
                value={targetCompaniesInput}
                onChange={(e) => setTargetCompaniesInput(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-tp-canvas border border-tp-line rounded-xl text-tp-ink text-xs focus:outline-none focus:border-[#B39051] transition-colors"
                placeholder="e.g. Stripe, Anthropic, Delta, Figma"
              />
              <span className="text-[10px] text-tp-subtle mt-1 block">Comma-separated</span>
            </div>

            <div>
              <label htmlFor="onboard-target-roles" className="block text-xs font-semibold uppercase tracking-wider text-tp-accent mb-1.5">
                Target Roles / Careers
              </label>
              <input
                id="onboard-target-roles"
                type="text"
                data-testid="onboard-target-roles-input"
                value={targetRolesInput}
                onChange={(e) => setTargetRolesInput(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-tp-canvas border border-tp-line rounded-xl text-tp-ink text-xs focus:outline-none focus:border-[#B39051] transition-colors"
                placeholder="e.g. AI/ML Engineer, Product Manager"
              />
              <span className="text-[10px] text-tp-subtle mt-1 block">Comma-separated</span>
            </div>
          </div>

          {/* 4. Meetup Intents (multi-select) */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-tp-accent mb-2">
              4. What are you looking for?
            </label>
            <IntentPicker value={intents} onChange={setIntents} viewer={user} />
          </div>

          {/* 5. 3-5 Hobbies */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-tp-accent">
                5. Hobbies & Passions
              </label>
              <span
                data-testid="hobbies-count"
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  selectedHobbies.length >= 3 && selectedHobbies.length <= 5
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-[#B39051]/15 text-tp-accent border border-[#B39051]/50'
                }`}
              >
                {selectedHobbies.length} / 5 selected (Min 3)
              </span>
            </div>

            {/* Hobby Tags (Popular + Custom) */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {Array.from(new Set([...POPULAR_HOBBIES, ...selectedHobbies])).map((h) => {
                const isSelected = selectedHobbies.includes(h);
                return (
                  <button
                    key={h}
                    type="button"
                    data-testid={`hobby-tag-${h.replace(/\s+/g, '-')}`}
                    onClick={() => toggleHobby(h)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-[#B39051] text-[#051E39] font-bold shadow-sm ring-1 ring-tp-ink/20'
                        : 'bg-tp-canvas text-tp-muted border border-tp-line hover:border-[#B39051]/60'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                    <span>{h}</span>
                  </button>
                );
              })}
            </div>

            {/* Custom Hobby Input */}
            <div className="flex gap-2">
              <input
                type="text"
                data-testid="custom-hobby-input"
                value={customHobbyInput}
                onChange={(e) => setCustomHobbyInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomHobby();
                  }
                }}
                placeholder="Add custom hobby (e.g. pickleball, espresso, chess)..."
                className="flex-1 px-3 py-1.5 text-xs bg-tp-canvas border border-tp-line rounded-lg text-tp-ink focus:outline-none focus:border-[#B39051]"
              />
              <button
                type="button"
                data-testid="add-custom-hobby-btn"
                onClick={() => handleAddCustomHobby()}
                disabled={!customHobbyInput.trim() || selectedHobbies.length >= 5}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#051E39] tp-on-navy border border-[#B39051]/50 text-tp-accent hover:bg-[#B39051]/15 disabled:opacity-50 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          </div>

          {/* 6. Dual Verification Step */}
          <div className="p-4 rounded-xl bg-tp-canvas/90 border border-[#B39051]/35 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-tp-accent" />
                <span className="font-semibold text-xs text-tp-ink">
                  {role === 'student' ? 'Instant Student Verification' : 'Dual Alumni Verification'}
                </span>
              </div>
              {user.verified && (
                <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  <Check className="inline w-3 h-3 mr-1 -mt-0.5" />
                  Verified ({user.verificationMethod})
                </span>
              )}
            </div>

            {role === 'student' ? (
              <div className="space-y-2">
                <p className="text-xs text-tp-muted">
                  Enter your official campus email for instant dual verification.
                </p>
                <div className="flex gap-2">
                  <input
                    type="email"
                    data-testid="student-email-input"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder={`username${brand.studentEmailDomain}`}
                    className="flex-1 px-3 py-2 text-xs bg-tp-surface border border-tp-line rounded-lg text-tp-ink focus:outline-none focus:border-[#B39051]"
                  />
                  <button
                    type="button"
                    data-testid="instant-verify-student-btn"
                    onClick={handleInstantVerifyStudent}
                    className="px-3.5 py-2 text-xs font-bold rounded-lg bg-[#B39051] text-[#051E39] hover:bg-[#8F713D] active:bg-[#8F713D] transition-colors"
                  >
                    Verify Email
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Alumni verification 3 tabs */}
                <div className="flex gap-1.5 border-b border-tp-line pb-2">
                  <button
                    type="button"
                    data-testid="alum-tab-email"
                    onClick={() => setVerificationTab('email')}
                    className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                      verificationTab === 'email'
                        ? 'bg-[#051E39] tp-on-navy text-tp-accent border border-[#B39051]/50'
                        : 'text-tp-subtle hover:text-tp-ink'
                    }`}
                  >
                    Alumni Email
                  </button>
                  <button
                    type="button"
                    data-testid="alum-tab-linkedin"
                    onClick={() => setVerificationTab('linkedin')}
                    className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                      verificationTab === 'linkedin'
                        ? 'bg-[#051E39] tp-on-navy text-tp-accent border border-[#B39051]/50'
                        : 'text-tp-subtle hover:text-tp-ink'
                    }`}
                  >
                    LinkedIn Profile
                  </button>
                  <button
                    type="button"
                    data-testid="alum-tab-vouch"
                    onClick={() => setVerificationTab('vouch')}
                    className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                      verificationTab === 'vouch'
                        ? 'bg-[#051E39] tp-on-navy text-tp-accent border border-[#B39051]/50'
                        : 'text-tp-subtle hover:text-tp-ink'
                    }`}
                  >
                    1-Tap Peer Vouch
                  </button>
                </div>

                {verificationTab === 'email' && (
                  <div className="space-y-2">
                    <p className="text-xs text-tp-muted">
                      Verify with your <code className="text-tp-accent">{brand.alumniEmailDomain}</code> or <code className="text-tp-accent">{brand.studentEmailDomain}</code> address.
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        data-testid="alumni-email-input"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        placeholder={`you${brand.alumniEmailDomain}`}
                        className="flex-1 px-3 py-2 text-xs bg-tp-surface border border-tp-line rounded-lg text-tp-ink focus:outline-none focus:border-[#B39051]"
                      />
                      <button
                        type="button"
                        data-testid="verify-alumni-email-btn"
                        onClick={handleVerifyAlumniEmail}
                        className="px-3.5 py-2 text-xs font-bold rounded-lg bg-[#B39051] text-[#051E39] hover:bg-[#8F713D] active:bg-[#8F713D] transition-colors"
                      >
                        Verify
                      </button>
                    </div>
                  </div>
                )}

                {verificationTab === 'linkedin' && (
                  <div className="space-y-2">
                    <p className="text-xs text-tp-muted">
                      Link your public LinkedIn profile confirming your Georgia Tech degree.
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        data-testid="linkedin-url-input"
                        value={linkedinInput}
                        onChange={(e) => setLinkedinInput(e.target.value)}
                        placeholder="https://linkedin.com/in/your-profile"
                        className="flex-1 px-3 py-2 text-xs bg-tp-surface border border-tp-line rounded-lg text-tp-ink focus:outline-none focus:border-[#B39051]"
                      />
                      <button
                        type="button"
                        data-testid="verify-linkedin-btn"
                        onClick={handleVerifyLinkedIn}
                        className="px-3.5 py-2 text-xs font-bold rounded-lg bg-[#B39051] text-[#051E39] hover:bg-[#8F713D] active:bg-[#8F713D] transition-colors"
                      >
                        Verify URL
                      </button>
                    </div>
                  </div>
                )}

                {verificationTab === 'vouch' && (
                  <div className="space-y-2">
                    <p className="text-xs text-tp-muted">
                      Need alumni verification without a .edu address? Tap below to receive a campus ambassador vouch.
                    </p>
                    {vouchSuccessMessage && (
                      <div className="text-xs text-emerald-400 font-semibold bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/30">
                        {vouchSuccessMessage}
                      </div>
                    )}
                    <button
                      type="button"
                      data-testid="peer-vouch-btn"
                      onClick={handleOneTapPeerVouch}
                      className="w-full py-2 px-3 text-xs font-bold rounded-lg bg-[#051E39] tp-on-navy text-tp-accent border border-[#B39051]/50 hover:bg-[#B39051]/15 transition-colors flex items-center justify-center gap-2"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-tp-accent" />
                      <span>Request 1-Tap Peer Vouch</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-[#051E39]/90 tp-on-navy border-t border-[#B39051]/35 flex items-center justify-end gap-3">
          <button
            type="button"
            data-testid="cancel-onboarding-btn"
            onClick={handleClose}
            className="px-4 py-2 text-xs font-semibold text-tp-muted hover:text-tp-ink transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            data-testid="save-onboarding-btn"
            onClick={handleSaveAndComplete}
            disabled={selectedHobbies.length < 3 || selectedHobbies.length > 5 || !major.trim()}
            className="px-5 py-2 text-xs font-bold rounded-xl bg-[#B39051] text-[#051E39] shadow-lg hover:bg-[#8F713D] active:bg-[#8F713D] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Save & Enter Campus
          </button>
        </div>
      </div>
    </div>
  );
};
