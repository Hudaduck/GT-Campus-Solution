import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { X, Send, MapPin, Video, MessageCircle } from 'lucide-react';
import { UserProfile, ChatMessage, CalendarMeetup, MeetingFormat } from '../../shared/contracts';
import { SheetDragHandle } from '../../shared/ui/SheetDragHandle';
import { Repository, getSharedHobbies } from '../../shared/data/repository';
import { SchedulerDrawer } from './SchedulerDrawer';

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  partner: UserProfile | null;
  onScheduled?: (meetup: CalendarMeetup) => void;
}

const TICK_MS = 400;

function buildIcebreakers(viewer: UserProfile, partner: UserProfile): string[] {
  const firstName = partner.name.split(' ')[0];
  const shared = getSharedHobbies(viewer, partner)[0];
  const work = partner.companyOrLab;
  return [
    `Hi ${firstName}! Great to match. Up for a quick chat sometime this week?`,
    shared ? `Fellow ${shared} fan! How did you get into it?` : `What are you working on these days?`,
    work ? `I'd love to hear what it's like at ${work}.` : `Would you rather meet for coffee or do a video call?`,
  ];
}

const timeLabel = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

/**
 * 1-on-1 message thread with a match. Lets people talk first, then decide whether to
 * meet in person or online. "Plan a meetup" swaps this sheet for the SchedulerDrawer
 * and returns here once it closes, where the scheduled plan shows up in the thread.
 */
export const ChatDrawer: React.FC<ChatDrawerProps> = ({ isOpen, onClose, partner, onScheduled }) => {
  const [viewer, setViewer] = useState<UserProfile>(() => Repository.getCurrentUser());
  const [matchId, setMatchId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const [planFormat, setPlanFormat] = useState<MeetingFormat | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const reload = useCallback((id: string) => setMessages(Repository.getMessages(id)), []);

  // Resolve (or create) the match thread whenever the drawer opens for a partner
  useEffect(() => {
    if (!isOpen || !partner) return;
    const me = Repository.getCurrentUser();
    const match = Repository.getOrCreateMatch(me, partner);
    setViewer(me);
    setMatchId(match.id);
    setDraft('');
    setPlanFormat(null);
    setNow(Date.now());
    reload(match.id);
  }, [isOpen, partner, reload]);

  // Pick up messages written by the other document (Phone App frame) too
  useEffect(() => {
    if (!isOpen || !matchId) return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === 'thirdplace_messages_data') reload(matchId);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [isOpen, matchId, reload]);

  const hasPending = messages.some((m) => m.sentAt > now);

  // Advance the clock only while a simulated reply is still "being typed"
  useEffect(() => {
    if (!hasPending) return;
    const id = window.setInterval(() => setNow(Date.now()), TICK_MS);
    return () => window.clearInterval(id);
  }, [hasPending]);

  const visible = useMemo(() => messages.filter((m) => m.sentAt <= now), [messages, now]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [visible.length, hasPending]);

  if (!isOpen || !partner) return null;

  if (planFormat) {
    return (
      <SchedulerDrawer
        isOpen
        partner={partner}
        matchId={matchId ?? undefined}
        initialFormat={planFormat}
        onClose={() => {
          setPlanFormat(null);
          setNow(Date.now());
          if (matchId) reload(matchId);
        }}
        onScheduled={onScheduled}
      />
    );
  }

  const send = (text: string) => {
    if (!matchId) return;
    const sent = Repository.sendMessage(matchId, viewer, text, partner);
    if (!sent) return;
    setDraft('');
    setNow(Date.now());
    reload(matchId);
  };

  return (
    <div role="dialog" aria-modal="true" aria-label={`Chat with ${partner.name}`} className="tp-sheet-backdrop">
      <div
        data-testid="chat-drawer"
        className="tp-sheet md:max-w-lg bg-tp-surface border-t md:border border-[#B39051]/35 flex flex-col !overflow-hidden h-[80dvh] md:h-[640px]"
      >
        <div className="bg-[#051E39] tp-on-navy pt-2">
          <SheetDragHandle onClose={onClose} className="!pb-1" />
        </div>

        {/* Header */}
        <div className="bg-[#051E39] tp-on-navy px-5 py-3 border-b border-[#B39051]/35 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={partner.avatarUrl}
              alt={partner.name}
              className="w-10 h-10 rounded-full object-cover border-2 border-[#B39051]"
            />
            <div className="min-w-0">
              <h3 className="font-bold text-tp-ink text-sm truncate">{partner.name}</h3>
              <p className="text-[11px] text-tp-muted truncate">
                {partner.companyOrLab || partner.major} • {partner.neighborhoodZone}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close chat"
            className="text-tp-subtle hover:text-tp-ink p-1.5 rounded-lg hover:bg-tp-ink/10 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Thread */}
        <div ref={listRef} data-testid="chat-thread" className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-2.5">
          {visible.length === 0 && !hasPending ? (
            <div className="text-center py-6 space-y-3">
              <MessageCircle className="w-8 h-8 mx-auto text-tp-accent" />
              <p className="text-sm text-tp-ink font-semibold">Say hi to {partner.name.split(' ')[0]}</p>
              <p className="text-xs text-tp-muted">
                Get to know each other first, then decide whether to meet in person or online.
              </p>
              <div className="flex flex-col gap-2 pt-1">
                {buildIcebreakers(viewer, partner).map((line) => (
                  <button
                    key={line}
                    type="button"
                    onClick={() => send(line)}
                    className="text-left text-xs px-3 py-2 rounded-xl border border-[#B39051]/35 bg-tp-canvas/60 text-tp-muted hover:border-[#B39051] hover:text-tp-ink transition"
                  >
                    {line}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            visible.map((m) => {
              const mine = m.senderId === viewer.id;
              return (
                <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div
                    data-testid={mine ? 'chat-message-mine' : 'chat-message-theirs'}
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs leading-relaxed break-words ${
                      mine
                        ? 'bg-[#B39051] text-[#051E39] rounded-br-md'
                        : 'bg-tp-elevated text-tp-ink border border-[#B39051]/25 rounded-bl-md'
                    }`}
                  >
                    <p>{m.text}</p>
                    <p className={`text-[9px] mt-1 ${mine ? 'text-[#051E39]/70' : 'text-tp-subtle'}`}>
                      {timeLabel(m.sentAt)}
                    </p>
                  </div>
                </div>
              );
            })
          )}

          {hasPending && (
            <div className="flex justify-start" data-testid="chat-typing">
              <div className="bg-tp-elevated border border-[#B39051]/25 rounded-2xl rounded-bl-md px-3 py-2 text-[11px] text-tp-muted">
                {partner.name.split(' ')[0]} is typing…
              </div>
            </div>
          )}
        </div>

        {/* Plan a meetup */}
        <div className="px-4 pt-2 pb-1 border-t border-[#B39051]/25">
          <p className="text-[10px] uppercase tracking-wider font-bold text-tp-subtle mb-1.5">Ready to meet?</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              data-testid="plan-in-person"
              onClick={() => setPlanFormat('in-person')}
              className="py-2 rounded-xl border border-[#B39051]/50 bg-tp-canvas/60 text-tp-ink text-xs font-semibold flex items-center justify-center gap-1.5 hover:border-[#B39051] transition"
            >
              <MapPin className="w-3.5 h-3.5 text-tp-accent" />
              Meet in person
            </button>
            <button
              type="button"
              data-testid="plan-online"
              onClick={() => setPlanFormat('online')}
              className="py-2 rounded-xl border border-[#B39051]/50 bg-tp-canvas/60 text-tp-ink text-xs font-semibold flex items-center justify-center gap-1.5 hover:border-[#B39051] transition"
            >
              <Video className="w-3.5 h-3.5 text-tp-accent" />
              Meet online
            </button>
          </div>
        </div>

        {/* Composer */}
        <form
          className="p-3 flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            send(draft);
          }}
        >
          <input
            aria-label="Message"
            placeholder={`Message ${partner.name.split(' ')[0]}…`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={1000}
            className="flex-1 bg-tp-canvas border border-[#B39051]/35 rounded-xl px-3 py-2 text-xs text-tp-ink focus:outline-none focus:border-[#B39051]"
          />
          <button
            type="submit"
            aria-label="Send message"
            disabled={!draft.trim()}
            className="w-9 h-9 rounded-xl bg-[#B39051] text-[#051E39] flex items-center justify-center hover:bg-[#8F713D] transition disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
