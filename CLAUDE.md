# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

ThirdPlace ("Your Campus, Everywhere"): a Georgia Tech–branded React + TypeScript + Vite PWA that connects students and alumni through pop-up events on a map, a 1-on-1 matcher (Pass / Connect buttons, no drag gestures), and a meetup scheduler. There is no backend; all data is seeded in code and persisted in `localStorage`.

## Commands

```bash
npm run dev          # Vite dev server on http://localhost:5173
npm run build        # tsc && vite build
npm run typecheck    # tsc --noEmit
npm test             # vitest run (unit/component tests, happy-dom)
npm run test:watch
npm run test:e2e     # Playwright; starts its own Vite server on port 5180 (--strictPort; override with E2E_PORT)

npx vitest run src/modules/auth/auth.test.ts      # single file
npx vitest run -t "re-issues expired demo"        # single test by name
npx playwright test -g "Flow 1"                    # single e2e test
```

Vitest picks up `src/**/*.test.ts(x)` and `tests/**/*.test.ts`; Playwright only runs `tests/*.spec.ts`. Test setup is `src/test-setup.ts` (jest-dom).

## Architecture

**Layers** (imports are relative; the `@/` alias exists in vite config but isn't used):
- `src/shared/contracts/index.ts`: all domain types (`UserProfile`, `EventItem`, `MatchItem`, `CalendarMeetup`, `SwipeCandidate`...). Modules share types only through here.
- `src/shared/data/repository.ts`: the single data layer. It holds the seed data (`INITIAL_PROFILES`, `buildInitialEvents`, demo personas, the Volleyball/Baking "hobby ecosystem"), the pure scoring logic (`getEventScoreDetails` / `scoreEventByHobbiesAndNetwork` with `EVENT_SCORE_WEIGHTS`, career overlap badges, `buildSwipeCandidate`), and the static `Repository` class that reads and writes `localStorage` (`thirdplace_*` keys). `Repository.resetAllData()` is the standard test reset.
- `src/shared/config/brandConfig.ts`: white-label `BrandConfig` (app name, email domains, map center, theme tokens) exposed via `BrandProvider` / `useBrand`. Tests assert specific GT values here.
- `src/modules/<feature>/`: feature modules (`auth`, `events-map`, `swipe-radar`, `scheduler`), each with an `index.ts` barrel. Import from the barrel, not internal files.
- `src/shell/`: app chrome and tab routing.

**Shell / view modes** (`src/shell/useViewMode.ts`): `App.tsx` renders one of three shells:
- `phone-native` (`PhoneShell`): viewport < 768px (`DESKTOP_BREAKPOINT_PX`), or the page is running inside the device frame (`?frame=phone`).
- `phone-frame` (`DeviceFrameStage`): desktop "Phone App" presenter mode. It loads the *same app* in an iframe at 412×860 so mobile breakpoints and `dvh` behave like a real phone.
- `web` (`WebShell`): desktop "Web App" mode.
`ModuleOutlet` maps the `AppTab` (`map | swipe | plans`, initial value from `?tab=`) to a module, wrapping each in `ModuleErrorBoundary` for per-module fault isolation. Modules receive a `layout: 'phone' | 'web'` prop and must work in both.

**Cross-document state sync**: because the device frame is a separate document, state is shared only through `localStorage`. `AuthContext` and the views listen for `storage` events, and `Repository.setCurrentUser` also dispatches `USER_CHANGED_EVENT` (`thirdplace:user-changed`) for same-document listeners. Any new view that shows user-derived data must subscribe to both.

**Time-relative seeds**: seed events are built relative to `Date.now()`. `Repository.getEvents()` filters out expired items (`expiresAt`), but built-in seed events are "rolling": when one expires it is re-issued with fresh times (`renewSeedEvents`), keeping its RSVPs. User-hosted events expire normally. Tests that depend on time use `vi.useFakeTimers({ toFake: ['Date'] })` + `vi.setSystemTime` (see `src/shared/rolling-seeds.test.ts`).

**LinkedIn import** (`modules/auth/linkedinParser.ts` → `AuthContext.importLinkedInProfile` → `Repository.registerImportedProfile`): parses a LinkedIn URL or pasted text into a profile, then seeds the hobby-ecosystem profiles and events. This must be idempotent.

**1-on-1 connections** (`modules/scheduler`): a match opens a `ChatDrawer` thread (`Repository.getMessages` / `sendMessage`, keyed by match id; `getOrCreateMatch` creates a match for Re-Connect contacts). There is no backend, so the partner's single reply is simulated: it is stored with a future `sentAt`, and the UI hides it behind a "typing…" indicator until that time passes. A fresh match only offers messaging, and scheduling stays locked until both people have sent a delivered message (`Repository.hasConversation`) so availability is worked out in chat; this applies in the chat and on My Plans. From there, `SchedulerDrawer` books either an in-person meetup (recommended `MIDPOINT_COFFEE_SPOTS` or "Somewhere else" with a user-entered address) or an online one (`format: 'online'`, platform plus an optional link that must pass `sanitizeMeetingLink`), then posts the plan back into the thread.

**Intents** (`src/shared/intents.ts` is the single catalog; icons in `shared/ui/intentIcons.ts`, picker in `shared/ui/IntentPicker.tsx`): profiles carry `intents: MeetupIntent[]` (any number, but only ONE mentorship side, enforced by `toggleIntent`/`resolveIntents`; empty = open to anything; always stored in canonical `INTENT_ORDER`). The gold tags on a swipe card's photo show only intents that match the viewer; the full-profile sheet lists all. Mentorship is directional (`find-mentor` ↔ `give-mentorship`); other intents pair with themselves. Either side is open to anyone: never derive mentor/mentee from `role` (student vs alumni). `getMutualIntents` drives the swipe "For You" filter, the overlap score, card badges and the match modal text. Old profiles with a single `intent` are migrated on read (`'mentorship'` and `'all'` → empty, since the side is unknown) by `normalizeProfile` → `resolveIntents`, so never read `.intent`.

**Location preference** (`src/shared/location.ts`; UI in `shared/ui/LocationPreference.tsx`): `user.locationPreference` = an area (`LOCATION_AREAS` preset or `'current'` browser location) + `radiusMiles` (`null` = Anywhere); read it via `getLocationPreference()`, which defaults to Georgia Tech Campus / 5 mi. The Map only shows, counts and recommends events inside the radius and fits/draws the radius circle; the Connect 1-on-1 radar deck only shows people inside it (the Reconnect deck is unaffected). People have no coordinates: `profileLocation()` derives an approximate neighborhood point from `neighborhoodZone`/`currentCity`, so distances are deliberately coarse. The seed `distanceText` field is no longer displayed. The quick chip on Map/Connect saves immediately via `Repository.updateCurrentUser`; AuthContext listens for `USER_CHANGED_EVENT` so My Profile doesn't overwrite it with stale state.

**Demo personas**: the alum `INITIAL_CURRENT_USER` and `DEMO_STUDENT_USER` have seed "twins" (same person, different id). Use `isSamePerson()` (id or email match), not id equality.

## Styling

Tailwind theme colors are CSS-variable tokens defined in `src/index.css` (`bg-tp-canvas`, `bg-tp-surface`, `text-tp-ink`, `text-tp-muted`, `border-tp-line`, `tp-accent`...), stored as RGB triplets so opacity modifiers work. Dark (navy) is the default; a `.light` class switches tokens; `.tp-on-navy` pins dark tokens inside navy brand chrome. Use these tokens instead of raw hex. The brand palette is fixed to gold `#B39051`, dark gold `#8F713D`, navy `#051E39` and white. Icons come from `lucide-react`; maps use `react-leaflet`.
