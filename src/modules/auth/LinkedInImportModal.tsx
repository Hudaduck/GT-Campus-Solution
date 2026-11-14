import React, { useEffect, useMemo, useState } from 'react';
import { X, Rocket, Sparkles, Zap, ArrowLeft, Trash2, Check, Linkedin, Target } from 'lucide-react';
import { UserProfile, UserRole } from '../../shared/contracts';
import {
  Repository,
  POPULAR_HOBBIES,
  getEventScoreDetails,
  RECOMMENDED_SCORE_THRESHOLD,
} from '../../shared/data/repository';
import { SheetDragHandle } from '../../shared/ui/SheetDragHandle';
import { IntentPicker } from '../../shared/ui/IntentPicker';
import { useAuth } from './AuthContext';
import { parseLinkedInInput, DEMO_LINKEDIN_PRESET, LinkedInImportResult, initialsAvatar } from './linkedinParser';

export interface LinkedInImportModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

type Step = 'input' | 'review' | 'launched';

// Brand "Import with LinkedIn" button reused in Onboarding and My Profile
export const LinkedInImportButton: React.FC<{ onClick: () => void; className?: string }> = ({ onClick, className = '' }) => (
  <button
    type="button"
    data-testid="open-linkedin-import"
    onClick={onClick}
    className={`w-full flex items-center justify-between gap-3 min-h-[52px] px-4 rounded-2xl bg-[#051E39] tp-on-navy border border-[#B39051]/50 hover:border-[#B39051] text-tp-ink transition ${className}`}
  >
    <span className="flex items-center gap-2.5">
      <span className="w-8 h-8 rounded-lg bg-[#B39051] text-[#051E39] flex items-center justify-center">
        <Linkedin className="w-4 h-4" />
      </span>
      <span className="text-left">
        <span className="block text-sm font-black">Import with LinkedIn</span>
        <span className="block text-[11px] text-tp-muted">Auto-fill career history, major & hobbies</span>
      </span>
    </span>
    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#B39051] text-[#051E39] uppercase tracking-wider">
      1-click
    </span>
  </button>
);

export const LinkedInImportModal: React.FC<LinkedInImportModalProps> = ({ isOpen: propsIsOpen, onClose: propsOnClose }) => {
  const { showLinkedInImport, setShowLinkedInImport, importLinkedInProfile } = useAuth();
  const isOpen = propsIsOpen ?? showLinkedInImport;
  const handleClose = propsOnClose ?? (() => setShowLinkedInImport(false));

  const [step, setStep] = useState<Step>('input');
  const [url, setUrl] = useState('');
  const [pasted, setPasted] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LinkedInImportResult | null>(null);
  const [draft, setDraft] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStep('input');
      setError(null);
      setResult(null);
      setDraft(null);
    }
  }, [isOpen]);

  // After launch: how many events now clear the "Recommended For You" bar
  const launchStats = useMemo(() => {
    if (step !== 'launched' || !draft) return null;
    const profiles = Repository.getProfiles();
    const scored = Repository.getEvents()
      .map((e) => ({ event: e, ...getEventScoreDetails(e, draft, profiles) }))
      .sort((a, b) => b.score - a.score);
    return {
      recommended: scored.filter((s) => s.score >= RECOMMENDED_SCORE_THRESHOLD).length,
      top: scored[0],
    };
  }, [step, draft]);

  if (!isOpen) return null;

  const generate = (inputUrl = url, inputText = pasted) => {
    const parsed = parseLinkedInInput(inputUrl, inputText);
    if (!parsed.ok) {
      setError(parsed.error ?? 'Could not read that LinkedIn URL.');
      return;
    }
    setError(null);
    setResult(parsed);
    setDraft(parsed.profile);
    setStep('review');
  };

  const applyDemoPreset = () => {
    setUrl(DEMO_LINKEDIN_PRESET.url);
    setPasted(DEMO_LINKEDIN_PRESET.text);
    generate(DEMO_LINKEDIN_PRESET.url, DEMO_LINKEDIN_PRESET.text);
  };

  const update = (changes: Partial<UserProfile>) => setDraft((d) => (d ? { ...d, ...changes } : d));

  const toggleHobby = (hobby: string) => {
    if (!draft) return;
    const has = draft.hobbies.some((h) => h.toLowerCase() === hobby.toLowerCase());
    if (has) update({ hobbies: draft.hobbies.filter((h) => h.toLowerCase() !== hobby.toLowerCase()) });
    else if (draft.hobbies.length < 5) update({ hobbies: [...draft.hobbies, hobby] });
  };

  const launch = () => {
    if (!draft) return;
    const name = draft.name.trim() || 'New Yellow Jacket';
    const finalProfile: UserProfile = {
      ...draft,
      name,
      // Keep the initials avatar in sync with any name edits
      avatarUrl: draft.avatarUrl.startsWith('data:image/svg') ? initialsAvatar(name) : draft.avatarUrl,
    };
    importLinkedInProfile(finalProfile);
    setDraft(finalProfile);
    setStep('launched');
  };

  const input =
    'w-full px-3 py-2.5 rounded-xl bg-tp-canvas border border-tp-line text-tp-ink text-xs outline-none focus:border-[#B39051]';

  return (
    <div data-testid="linkedin-import-modal" className="tp-sheet-backdrop !z-[60]" onClick={handleClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Import with LinkedIn"
        className="tp-sheet md:max-w-xl bg-tp-surface border-t md:border border-[#B39051]/50 text-tp-ink"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-[#051E39] tp-on-navy pt-2">
          <SheetDragHandle onClose={handleClose} className="!pb-1" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 bg-[#051E39] tp-on-navy border-b border-[#B39051]/35">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-[#B39051] text-[#051E39] flex items-center justify-center">
              <Linkedin className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-black">Import with LinkedIn</h2>
              <p className="text-[11px] text-tp-muted">Generate your ThirdPlace profile in seconds. Nothing leaves your device.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close LinkedIn importer"
            className="w-10 h-10 flex items-center justify-center rounded-full text-tp-muted hover:text-tp-ink hover:bg-tp-ink/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* STEP 1: URL + optional pasted text */}
          {step === 'input' && (
            <>
              <button
                type="button"
                data-testid="linkedin-demo-preset"
                onClick={applyDemoPreset}
                className="w-full flex items-center justify-center gap-2 min-h-[44px] rounded-xl bg-[#B39051] text-[#051E39] text-sm font-black hover:bg-[#8F713D] active:bg-[#8F713D] transition active:scale-[0.98]"
              >
                <Zap className="w-4 h-4" />
                Demo Preset: My LinkedIn
              </button>

              <div className="flex items-center gap-3 text-[10px] uppercase tracking-wider text-tp-subtle">
                <span className="flex-1 h-px bg-tp-elevated" /> or enter manually <span className="flex-1 h-px bg-tp-elevated" />
              </div>

              <div>
                <label htmlFor="linkedin-url" className="block text-xs font-semibold uppercase tracking-wider text-tp-accent mb-1.5">
                  LinkedIn Profile URL
                </label>
                <input
                  id="linkedin-url"
                  data-testid="linkedin-url-input"
                  type="url"
                  inputMode="url"
                  autoComplete="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && generate()}
                  placeholder="https://www.linkedin.com/in/first-last/"
                  className={input}
                />
              </div>

              <div>
                <label htmlFor="linkedin-text" className="block text-xs font-semibold uppercase tracking-wider text-tp-accent mb-1.5">
                  Paste LinkedIn About / Experience (Optional)
                </label>
                <textarea
                  id="linkedin-text"
                  data-testid="linkedin-text-input"
                  rows={5}
                  value={pasted}
                  onChange={(e) => setPasted(e.target.value)}
                  placeholder={'e.g.\nSoftware Engineering Intern at Google · Summer 2025\nB.S. Computer Science, Georgia Tech, Class of 2027'}
                  className={`${input} resize-none`}
                />
                <p className="mt-1 text-[10px] text-tp-subtle">
                  We'll detect companies, roles, grad year and GT major. URL-only works too.
                </p>
              </div>

              {error && (
                <p role="alert" className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-xl px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="button"
                data-testid="linkedin-generate"
                onClick={() => generate()}
                disabled={!url.trim()}
                className="w-full flex items-center justify-center gap-2 min-h-[44px] rounded-xl bg-tp-elevated border border-[#B39051]/50 text-tp-accent text-sm font-bold hover:bg-[#B39051]/15 disabled:opacity-40 transition"
              >
                <Sparkles className="w-4 h-4" />
                Generate My Profile
              </button>
            </>
          )}

          {/* STEP 2: review & tweak */}
          {step === 'review' && draft && result && (
            <>
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-tp-elevated/60 border border-[#B39051]/35">
                <img src={initialsAvatar(draft.name)} alt="" className="w-14 h-14 rounded-full border-2 border-[#B39051]" />
                <div className="min-w-0 flex-1">
                  <input
                    data-testid="linkedin-review-name"
                    aria-label="Name"
                    value={draft.name}
                    onChange={(e) => update({ name: e.target.value })}
                    className="w-full bg-transparent text-lg font-black outline-none border-b border-transparent focus:border-[#B39051]"
                  />
                  <p className="text-[11px] text-tp-muted truncate">{draft.companyOrLab}</p>
                </div>
                <div className="flex rounded-full border border-[#B39051]/50 overflow-hidden text-[11px] font-bold shrink-0">
                  {(['student', 'alumni'] as UserRole[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => update({ role: r })}
                      className={`px-2.5 min-h-[36px] ${draft.role === r ? 'bg-[#B39051] text-[#051E39]' : 'text-tp-muted'}`}
                    >
                      {r === 'student' ? 'Student' : 'Alum'}
                    </button>
                  ))}
                </div>
              </div>

              <p data-testid="linkedin-detected-summary" className="text-[11px] text-tp-subtle">
                Detected from LinkedIn: name{result.detected.major ? ', major' : ''}
                {result.detected.gradYear ? ', grad year' : ''}
                {result.detected.workHistory > 0 ? `, ${result.detected.workHistory} position${result.detected.workHistory === 1 ? '' : 's'}` : ''}
                {result.detected.extraHobbies.length > 0 ? `, interests (${result.detected.extraHobbies.join(', ')})` : ''}.
                {' '}Everything else uses Georgia Tech defaults — tweak below.
              </p>

              <div className="grid grid-cols-[1fr_96px] gap-2">
                <input aria-label="Major" value={draft.major} onChange={(e) => update({ major: e.target.value })} className={input} />
                <input
                  aria-label="Graduation year"
                  type="number"
                  value={draft.gradYear}
                  onChange={(e) => update({ gradYear: Number(e.target.value) || draft.gradYear })}
                  className={input}
                />
              </div>

              <section data-testid="linkedin-intents">
                <h3 className="text-xs font-bold uppercase tracking-wider text-tp-accent mb-1.5">Looking For</h3>
                <IntentPicker value={draft.intents} onChange={(intents) => update({ intents })} compact />
              </section>

              <section>
                <h3 className="text-xs font-bold uppercase tracking-wider text-tp-accent mb-1.5">Hobbies ({draft.hobbies.length}/5)</h3>
                <div className="flex flex-wrap gap-1.5">
                  {Array.from(new Set([...draft.hobbies, ...POPULAR_HOBBIES.filter((h) => !draft.hobbies.some((d) => d.toLowerCase() === h.toLowerCase()))]))
                    .slice(0, 12)
                    .map((h) => {
                      const on = draft.hobbies.some((d) => d.toLowerCase() === h.toLowerCase());
                      return (
                        <button
                          key={h}
                          type="button"
                          aria-pressed={on}
                          onClick={() => toggleHobby(h)}
                          className={`px-3 min-h-[32px] rounded-full text-xs transition ${
                            on ? 'bg-[#B39051] text-[#051E39] font-black' : 'bg-tp-canvas text-tp-muted border border-tp-line'
                          }`}
                        >
                          {on && <Check className="inline w-3 h-3 mr-1" />}
                          {h}
                        </button>
                      );
                    })}
                </div>
              </section>

              <section>
                <h3 className="text-xs font-bold uppercase tracking-wider text-tp-accent mb-1.5">Career history</h3>
                {draft.workHistory && draft.workHistory.length > 0 ? (
                  <ul className="space-y-1.5">
                    {draft.workHistory.map((w, i) => (
                      <li key={`${w.company}-${i}`} className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-tp-elevated text-xs">
                        <span className="min-w-0 truncate">
                          <strong>{w.company}</strong> • {w.role}
                          <span className="text-tp-subtle"> ({w.period}{w.isCurrent ? ', current' : ''})</span>
                        </span>
                        <button
                          type="button"
                          aria-label={`Remove ${w.company}`}
                          onClick={() => update({ workHistory: draft.workHistory!.filter((_, j) => j !== i) })}
                          className="p-1.5 text-tp-subtle hover:text-rose-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-tp-subtle">No positions found — paste your Experience section to add them, or edit later in My Profile.</p>
                )}
              </section>

              <section>
                <h3 className="text-xs font-bold uppercase tracking-wider text-tp-accent mb-1.5">Targeting</h3>
                <div className="flex flex-wrap gap-1.5">
                  {draft.targetCompanies?.map((c) => (
                    <span key={c} className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#051E39] tp-on-navy text-tp-accent border border-[#B39051]/40">
                      {c}
                    </span>
                  ))}
                  {draft.targetRoles?.map((r) => (
                    <span key={r} className="px-2.5 py-1 rounded-lg text-[11px] bg-tp-elevated text-tp-muted border border-[#B39051]/35">
                      <Target className="inline w-3 h-3 mr-1 -mt-0.5" />
                      {r}
                    </span>
                  ))}
                </div>
              </section>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('input')}
                  className="flex items-center gap-1.5 px-4 min-h-[48px] rounded-xl border border-tp-line text-xs font-semibold text-tp-muted hover:text-tp-ink"
                >
                  <ArrowLeft className="w-4 h-4" /> Edit
                </button>
                <button
                  type="button"
                  data-testid="linkedin-launch"
                  onClick={launch}
                  className="flex-1 flex items-center justify-center gap-2 min-h-[48px] rounded-xl bg-[#B39051] text-[#051E39] text-sm font-black hover:bg-[#8F713D] active:bg-[#8F713D] shadow-lg active:scale-[0.98] transition"
                >
                  <Rocket className="w-4 h-4" /> Launch My Profile
                </button>
              </div>
            </>
          )}

          {/* STEP 3: launched */}
          {step === 'launched' && draft && launchStats && (
            <div data-testid="linkedin-launched" className="text-center space-y-4 py-2">
              <img src={draft.avatarUrl} alt="" className="w-20 h-20 mx-auto rounded-full border-4 border-[#B39051]" />
              <div>
                <h3 className="text-xl font-black">You're live, {draft.name.split(' ')[0]}!</h3>
                <p className="text-xs text-tp-muted mt-1">
                  Your profile joined the Georgia Tech radar with {launchStats.recommended} events recommended for you.
                </p>
              </div>
              {launchStats.top && (
                <div className="text-left p-3 rounded-2xl bg-[#051E39] tp-on-navy border border-[#B39051]/40">
                  <p className="text-[10px] font-black uppercase tracking-wider text-tp-accent">#1 pick • {launchStats.top.score} pts</p>
                  <p className="text-sm font-bold">{launchStats.top.event.title}</p>
                  {launchStats.top.attendeeHighlightText && (
                    <p className="text-[11px] text-tp-muted mt-0.5">{launchStats.top.attendeeHighlightText}</p>
                  )}
                </div>
              )}
              <button
                type="button"
                data-testid="linkedin-done"
                onClick={handleClose}
                className="w-full min-h-[48px] rounded-xl bg-[#B39051] text-[#051E39] text-sm font-black hover:bg-[#8F713D] active:bg-[#8F713D] transition"
              >
                See My Matches
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
