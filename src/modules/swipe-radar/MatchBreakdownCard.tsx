import React from 'react';
import { Briefcase, Target, Sparkles, Heart, Compass } from 'lucide-react';
import { INTENT_CATALOG, describeMutualIntent } from '../../shared/intents';
import { SwipeCandidate, UserProfile } from '../../shared/contracts';

interface MatchBreakdownCardProps {
  candidate: SwipeCandidate | null;
  viewer: UserProfile;
}

const MAX_SCORE = 100;

// Desktop-only side panel explaining *why* the current swipe card is a match
export const MatchBreakdownCard: React.FC<MatchBreakdownCardProps> = ({ candidate, viewer }) => {
  if (!candidate) {
    return (
      <aside className="bg-tp-surface border border-[#B39051]/35 rounded-3xl p-6 text-sm text-tp-muted">
        No active card. Adjust filters or review profiles again to see a match breakdown.
      </aside>
    );
  }

  const companyBadges = candidate.careerBadges.filter((b) => b.kind === 'works-at' || b.kind === 'ex-company');
  const targetingBadges = candidate.careerBadges.filter((b) => b.kind === 'targeting' || b.kind === 'shared-target');
  const sharedRoles = (viewer.targetRoles || []).filter((r) =>
    candidate.targetRoles.some((cr) => cr.toLowerCase().includes(r.toLowerCase()) || r.toLowerCase().includes(cr.toLowerCase()))
  );
  const pct = Math.min(100, Math.round((candidate.overlapScore / MAX_SCORE) * 100));

  return (
    <aside
      data-testid="match-breakdown-card"
      className="bg-tp-surface border border-[#B39051]/35 rounded-3xl p-5 space-y-5 shadow-xl"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-tp-accent">Career & Hobby Match Breakdown</p>
          <h3 className="text-lg font-black text-tp-ink">{candidate.name}</h3>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black text-tp-accent">{pct}%</p>
          <p className="text-[10px] text-tp-subtle">overlap</p>
        </div>
      </div>

      <div className="h-2 rounded-full bg-tp-elevated overflow-hidden" aria-hidden="true">
        <div className="h-full bg-[#B39051] rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>

      <section className="space-y-2" data-testid="breakdown-intents">
        <h4 className="text-xs font-bold text-tp-ink flex items-center gap-1.5">
          <Compass className="w-3.5 h-3.5 text-tp-accent" /> Looking for
        </h4>
        {candidate.intents.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {candidate.intents.map((i) => (
              <span key={i} className="text-xs px-2.5 py-1 rounded-xl bg-tp-elevated text-tp-ink border border-[#B39051]/40 font-semibold">
                {INTENT_CATALOG[i].label}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-tp-subtle">Open to anything.</p>
        )}
        {candidate.mutualIntents.map((i) => (
          <p key={i} className="text-xs text-tp-muted">
            <Sparkles className="inline w-3 h-3 text-tp-accent mr-1" />
            {describeMutualIntent(i, candidate.name.split(' ')[0])}
          </p>
        ))}
      </section>

      <section className="space-y-2">
        <h4 className="text-xs font-bold text-tp-ink flex items-center gap-1.5">
          <Heart className="w-3.5 h-3.5 text-tp-accent" /> Shared hobbies ({candidate.sharedHobbies.length})
        </h4>
        {candidate.sharedHobbies.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {candidate.sharedHobbies.map((h) => (
              <span key={h} className="text-xs px-2.5 py-1 rounded-xl bg-[#B39051] text-[#051E39] font-bold">
                {h}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-tp-subtle">No hobby overlap yet — a great chance to try something new.</p>
        )}
      </section>

      <section className="space-y-2">
        <h4 className="text-xs font-bold text-tp-ink flex items-center gap-1.5">
          <Briefcase className="w-3.5 h-3.5 text-tp-accent" /> At your target companies
        </h4>
        {companyBadges.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {companyBadges.map((b) => (
              <span key={b.label} className="text-xs px-2.5 py-1 rounded-xl bg-[#B39051] text-[#051E39] font-black">
                {b.label}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-tp-subtle">
            Not at {viewer.targetCompanies?.slice(0, 2).join(' or ') || 'your target companies'} — yet.
          </p>
        )}
        {candidate.workHistory.length > 0 && (
          <ul className="space-y-1 pt-1">
            {candidate.workHistory.map((w, i) => (
              <li key={i} className="flex justify-between gap-3 text-xs text-tp-muted">
                <span className="truncate">
                  <strong className="text-tp-ink">{w.company}</strong> • {w.role}
                </span>
                <span className="text-tp-subtle shrink-0">{w.period}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h4 className="text-xs font-bold text-tp-ink flex items-center gap-1.5">
          <Target className="w-3.5 h-3.5 text-tp-accent" /> Career goals
        </h4>
        <div className="flex flex-wrap gap-1.5">
          {targetingBadges.map((b) => (
            <span
              key={b.label}
              className={`text-[11px] px-2 py-1 rounded-lg font-semibold ${
                b.kind === 'shared-target'
                  ? 'bg-[#B39051]/20 text-tp-accent border border-[#B39051]/50'
                  : 'bg-tp-elevated text-tp-muted border border-tp-line'
              }`}
            >
              {b.label}
            </span>
          ))}
        </div>
        {sharedRoles.length > 0 && (
          <p className="text-xs text-tp-muted">
            <Sparkles className="inline w-3 h-3 text-tp-accent mr-1" />
            You're both aiming for <strong className="text-tp-ink">{sharedRoles.join(', ')}</strong>
          </p>
        )}
      </section>
    </aside>
  );
};
