import React, { useState, useEffect } from 'react';
import { X, Briefcase, Target, Tag, Check, Plus, Trash2, GraduationCap, MapPin, Moon, Sun } from 'lucide-react';
import { useBrand } from '../../shared/config/brandConfig';
import { ResetDemoButton } from '../../shared/ui/ResetDemoButton';
import { useAuth } from './AuthContext';
import { WorkExperience, MeetupIntent, LocationPreference } from '../../shared/contracts';
import { getLocationPreference } from '../../shared/location';
import { LocationPreferenceEditor } from '../../shared/ui/LocationPreference';
import { HOBBY_SUGGESTIONS, Repository } from '../../shared/data/repository';
import { HobbyCombobox } from '../../shared/ui/HobbyCombobox';
import { SheetDragHandle } from '../../shared/ui/SheetDragHandle';
import { IntentPicker } from '../../shared/ui/IntentPicker';
import { LinkedInImportButton } from './LinkedInImportModal';
import { avatarSrc } from '../../shared/ui/avatarSrc';

export interface MyProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MyProfileDrawer: React.FC<MyProfileDrawerProps> = ({ isOpen, onClose }) => {
  const { user, updateProfile, setShowOnboarding, setShowLinkedInImport } = useAuth();
  const { isDarkMode, toggleDarkMode } = useBrand();

  const [name, setName] = useState(user.name || '');
  const [major, setMajor] = useState(user.major || '');
  const [gradYear, setGradYear] = useState(user.gradYear || 2026);
  const [companyOrLab, setCompanyOrLab] = useState(user.companyOrLab || '');
  const [bio, setBio] = useState(user.bio || '');
  const [intents, setIntents] = useState<MeetupIntent[]>(user.intents ?? []);
  const [locationPref, setLocationPref] = useState<LocationPreference>(() => getLocationPreference(user));
  const [hobbies, setHobbies] = useState<string[]>(user.hobbies || []);

  // Career fields
  const [workHistory, setWorkHistory] = useState<WorkExperience[]>(user.workHistory || []);
  const [targetCompanies, setTargetCompanies] = useState<string[]>(user.targetCompanies || []);
  const [targetRoles, setTargetRoles] = useState<string[]>(user.targetRoles || []);

  // New item inputs
  const [newCompany, setNewCompany] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newPeriod, setNewPeriod] = useState('');
  const [newTargetCompany, setNewTargetCompany] = useState('');
  const [newTargetRole, setNewTargetRole] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(user.name || '');
      setMajor(user.major || '');
      setGradYear(user.gradYear || 2026);
      setCompanyOrLab(user.companyOrLab || '');
      setBio(user.bio || '');
      setIntents(user.intents ?? []);
      setLocationPref(getLocationPreference(user));
      setHobbies(user.hobbies || []);
      setWorkHistory(user.workHistory || []);
      setTargetCompanies(user.targetCompanies || []);
      setTargetRoles(user.targetRoles || []);
      setSavedSuccess(false);
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  // Curated list + what people on the radar already like (picking a shared one helps matching)
  const hobbySuggestions = [...HOBBY_SUGGESTIONS, ...Repository.getProfiles().flatMap((p) => p.hobbies)];

  const handleAddWork = () => {
    if (!newCompany.trim() || !newRole.trim()) return;
    setWorkHistory([
      ...workHistory,
      {
        company: newCompany.trim(),
        role: newRole.trim(),
        period: newPeriod.trim() || '2024 - Present',
        isCurrent: workHistory.length === 0,
      },
    ]);
    setNewCompany('');
    setNewRole('');
    setNewPeriod('');
  };

  const handleRemoveWork = (index: number) => {
    setWorkHistory(workHistory.filter((_, i) => i !== index));
  };

  const handleAddTargetCompany = () => {
    const trimmed = newTargetCompany.trim();
    if (trimmed && !targetCompanies.includes(trimmed)) {
      setTargetCompanies([...targetCompanies, trimmed]);
      setNewTargetCompany('');
    }
  };

  const handleRemoveTargetCompany = (comp: string) => {
    setTargetCompanies(targetCompanies.filter((c) => c !== comp));
  };

  const handleAddTargetRole = () => {
    const trimmed = newTargetRole.trim();
    if (trimmed && !targetRoles.includes(trimmed)) {
      setTargetRoles([...targetRoles, trimmed]);
      setNewTargetRole('');
    }
  };

  const handleRemoveTargetRole = (role: string) => {
    setTargetRoles(targetRoles.filter((r) => r !== role));
  };


  const handleSave = () => {
    updateProfile({
      name: name.trim() || user.name,
      major: major.trim() || user.major,
      gradYear: Number(gradYear) || user.gradYear,
      companyOrLab: companyOrLab.trim() || undefined,
      bio: bio.trim() || user.bio,
      intents,
      locationPreference: locationPref,
      hobbies,
      workHistory,
      targetCompanies,
      targetRoles,
    });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div
      data-testid="my-profile-drawer"
      className="tp-sheet-backdrop"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="My Profile"
        className="tp-sheet md:max-w-2xl bg-tp-surface border-t md:border border-[#B39051]/35 px-5 pt-2 pb-5 md:p-6 text-tp-ink"
        onClick={(e) => e.stopPropagation()}
      >
        <SheetDragHandle onClose={onClose} />

        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#B39051]/35 mb-5">
          <div className="flex items-center gap-3">
            <div className="relative">
              {user.avatarUrl ? (
                <img
                  src={avatarSrc(user.avatarUrl)}
                  alt={user.name}
                  className="w-12 h-12 rounded-full object-cover border-2 border-[#B39051]"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-[#051E39] tp-on-navy border-2 border-[#B39051] flex items-center justify-center text-lg font-black text-tp-accent">
                  {user.name ? user.name[0] : 'GT'}
                </div>
              )}
              {user.verified && (
                <span className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-0.5 rounded-full">
                  <Check className="w-2.5 h-2.5" />
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-tp-ink">{name || 'Your Profile'}</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#051E39] tp-on-navy text-tp-accent border border-[#B39051]/50 uppercase">
                  {user.role} '{gradYear.toString().slice(-2)}
                </span>
              </div>
              <p className="text-xs text-tp-muted">{companyOrLab || major || 'Georgia Tech'}</p>
            </div>
          </div>

          <button
            data-testid="close-profile-drawer"
            onClick={onClose}
            className="p-1.5 text-tp-subtle hover:text-tp-ink rounded-full bg-tp-elevated hover:bg-[#B39051]/15 border border-tp-line transition"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {savedSuccess && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-xs font-semibold flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>Profile and career preferences updated successfully!</span>
          </div>
        )}

        <div className="space-y-6">
          <LinkedInImportButton
            onClick={() => {
              onClose();
              setShowLinkedInImport(true);
            }}
          />

          {/* Section 1: Basic Campus Info */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-tp-accent flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-tp-accent" />
              <span>Campus & Academic Identity</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-tp-muted mb-1">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-tp-elevated border border-tp-line text-tp-ink text-xs outline-none focus:border-[#B39051]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-tp-muted mb-1">Graduation Year</label>
                <input
                  type="number"
                  value={gradYear}
                  onChange={(e) => setGradYear(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-tp-elevated border border-tp-line text-tp-ink text-xs outline-none focus:border-[#B39051]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-tp-muted mb-1">Major / Concentration</label>
                <input
                  type="text"
                  value={major}
                  onChange={(e) => setMajor(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-tp-elevated border border-tp-line text-tp-ink text-xs outline-none focus:border-[#B39051]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-tp-muted mb-1">Current Company / Lab</label>
                <input
                  type="text"
                  value={companyOrLab}
                  onChange={(e) => setCompanyOrLab(e.target.value)}
                  placeholder="e.g. Stripe • Senior Product Lead"
                  className="w-full px-3 py-2 rounded-xl bg-tp-elevated border border-tp-line text-tp-ink text-xs outline-none focus:border-[#B39051]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-tp-muted mb-1">Bio / Headline</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 rounded-xl bg-tp-elevated border border-tp-line text-tp-ink text-xs outline-none focus:border-[#B39051]"
              />
            </div>
          </div>

          {/* Section 2: Work History (Upgrade 1) */}
          <div className="space-y-3 pt-3 border-t border-tp-line">
            <h3 className="text-xs font-bold uppercase tracking-wider text-tp-accent flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-tp-accent" />
              <span>Work & Research Experience</span>
            </h3>

            {/* List of existing experiences */}
            <div className="space-y-2">
              {workHistory.map((exp, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-tp-elevated border border-[#B39051]/35 text-xs"
                >
                  <div>
                    <span className="font-bold text-tp-ink">{exp.company}</span>
                    <span className="text-tp-subtle mx-1.5">•</span>
                    <span className="text-tp-muted">{exp.role}</span>
                    <span className="text-[10px] text-tp-subtle ml-2">({exp.period})</span>
                  </div>
                  <button
                    onClick={() => handleRemoveWork(idx)}
                    className="p-1 text-tp-subtle hover:text-rose-400 transition"
                    title="Remove position"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add new work experience */}
            <div className="p-3 rounded-2xl bg-tp-canvas border border-tp-line space-y-2">
              <span className="text-[11px] font-semibold text-tp-muted">Add Position:</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="Company (e.g. NCR Voyix)"
                  value={newCompany}
                  onChange={(e) => setNewCompany(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg bg-tp-elevated border border-tp-line text-xs text-tp-ink outline-none focus:border-[#B39051]"
                />
                <input
                  type="text"
                  placeholder="Role (e.g. SWE Intern)"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg bg-tp-elevated border border-tp-line text-xs text-tp-ink outline-none focus:border-[#B39051]"
                />
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="Period (e.g. Summer '24)"
                    value={newPeriod}
                    onChange={(e) => setNewPeriod(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 rounded-lg bg-tp-elevated border border-tp-line text-xs text-tp-ink outline-none focus:border-[#B39051]"
                  />
                  <button
                    onClick={handleAddWork}
                    disabled={!newCompany.trim() || !newRole.trim()}
                    className="px-3 py-1.5 rounded-lg bg-[#B39051] text-[#051E39] font-bold text-xs hover:bg-[#8F713D] active:bg-[#8F713D] transition disabled:opacity-40"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Target Companies & Target Roles (Upgrade 1) */}
          <div className="space-y-3 pt-3 border-t border-tp-line">
            <h3 className="text-xs font-bold uppercase tracking-wider text-tp-accent flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-tp-accent" />
              <span>Target Companies & Roles (Radar Matching)</span>
            </h3>

            {/* Target Companies */}
            <div>
              <label className="block text-[11px] font-medium text-tp-muted mb-1.5">
                Target Companies (Matches alumni & students from these firms)
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {targetCompanies.map((comp) => (
                  <span
                    key={comp}
                    className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-xl bg-[#051E39] tp-on-navy text-tp-accent border border-[#B39051]/40 font-bold"
                  >
                    <span>{comp}</span>
                    <button
                      onClick={() => handleRemoveTargetCompany(comp)}
                      className="hover:text-tp-ink"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add target company (e.g. Stripe, Anthropic, Delta, Figma)"
                  value={newTargetCompany}
                  onChange={(e) => setNewTargetCompany(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTargetCompany()}
                  className="flex-1 px-3 py-1.5 rounded-xl bg-tp-elevated border border-tp-line text-xs text-tp-ink outline-none focus:border-[#B39051]"
                />
                <button
                  onClick={handleAddTargetCompany}
                  className="px-3 py-1.5 rounded-xl bg-tp-elevated hover:bg-[#B39051]/15 text-tp-accent border border-[#B39051]/35 text-xs font-bold"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Target Roles */}
            <div>
              <label className="block text-[11px] font-medium text-tp-muted mb-1.5">
                Target Roles / Career Paths
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {targetRoles.map((role) => (
                  <span
                    key={role}
                    className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-xl bg-tp-elevated text-tp-muted border border-[#B39051]/35"
                  >
                    <span>{role}</span>
                    <button
                      onClick={() => handleRemoveTargetRole(role)}
                      className="hover:text-rose-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add target role (e.g. AI/ML Engineer, APM / Product Manager)"
                  value={newTargetRole}
                  onChange={(e) => setNewTargetRole(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTargetRole()}
                  className="flex-1 px-3 py-1.5 rounded-xl bg-tp-elevated border border-tp-line text-xs text-tp-ink outline-none focus:border-[#B39051]"
                />
                <button
                  onClick={handleAddTargetRole}
                  className="px-3 py-1.5 rounded-xl bg-tp-elevated hover:bg-[#B39051]/15 text-tp-accent border border-[#B39051]/35 text-xs font-bold"
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* Location preference: where you want to meet + how far */}
          <div data-testid="profile-location" className="space-y-3 pt-3 border-t border-tp-line">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-tp-accent flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-tp-accent" />
                <span>Location Preference</span>
              </h3>
              <p className="text-[11px] text-tp-muted mt-1">
                Sets which events show on your map and who appears in Connect 1-on-1.
              </p>
            </div>
            <LocationPreferenceEditor value={locationPref} onChange={setLocationPref} />
          </div>

          {/* Section 4: What you're looking for */}
          <div data-testid="profile-intents" className="space-y-3 pt-3 border-t border-tp-line">
            <h3 className="text-xs font-bold uppercase tracking-wider text-tp-accent flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-tp-accent" />
              <span>Looking For</span>
            </h3>
            <IntentPicker value={intents} onChange={setIntents} compact />
          </div>

          {/* Section 5: Hobbies */}
          <div className="space-y-3 pt-3 border-t border-tp-line">
            <h3 className="text-xs font-bold uppercase tracking-wider text-tp-accent flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-tp-accent" />
                <span>Hobbies & Passions (3–5 recommended)</span>
              </span>
              <span className="text-[11px] text-tp-subtle">{hobbies.length}/5 selected</span>
            </h3>

            <HobbyCombobox value={hobbies} onChange={setHobbies} suggestions={hobbySuggestions} max={5} />
          </div>

          {/* Appearance: the only theme switch reachable on phones (desktop also has one in the header) */}
          <div data-testid="profile-appearance" className="space-y-2 pt-3 border-t border-tp-line">
            <h3 className="text-xs font-bold uppercase tracking-wider text-tp-accent">Appearance</h3>
            <div role="group" aria-label="Theme" className="grid grid-cols-2 gap-2 max-w-xs">
              {([
                { dark: true, label: 'Dark', Icon: Moon },
                { dark: false, label: 'Light', Icon: Sun },
              ] as const).map(({ dark, label, Icon }) => (
                <button
                  key={label}
                  type="button"
                  data-testid={`theme-${label.toLowerCase()}`}
                  aria-pressed={isDarkMode === dark}
                  onClick={() => {
                    if (isDarkMode !== dark) toggleDarkMode();
                  }}
                  className={`min-h-[40px] rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                    isDarkMode === dark
                      ? 'bg-[#B39051] text-[#051E39] border-[#B39051]'
                      : 'bg-tp-canvas/60 text-tp-muted border-tp-line hover:border-[#B39051]/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Demo: back to a fresh start between run-throughs */}
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-tp-line">
            <p className="text-[11px] text-tp-subtle">Restore the default demo profiles, pop-ups and plans.</p>
            <ResetDemoButton compact />
          </div>

          {/* Save Action Button */}
          <div className="pt-4 border-t border-[#B39051]/35 flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                onClose();
                setShowOnboarding(true);
              }}
              className="mr-auto min-h-[44px] px-3 text-xs font-semibold text-tp-accent hover:underline"
            >
              Re-run Fast Onboarding
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-tp-line text-xs font-semibold text-tp-muted hover:text-tp-ink"
            >
              Cancel
            </button>
            <button
              data-testid="save-profile-button"
              onClick={handleSave}
              className="px-6 py-2.5 rounded-xl bg-[#B39051] text-[#051E39] font-black text-xs hover:bg-[#8F713D] active:bg-[#8F713D] shadow-lg flex items-center gap-2 active:scale-95 transition"
            >
              <Check className="w-4 h-4 text-[#051E39]" />
              <span>Save & Update Profile</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
