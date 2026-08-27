// Traces to spec.md stories 6, 7, 9 and plan.md data model / "Persistence & identity".

import type { Assignment } from './assignment';
import type { PushSubscriptionData } from './push';

// v5, additive — see constitution.md's "Data safety" section and plan.md's
// "v5 revision note". Rides inside the `classes` array, which
// server/store.ts already round-trips opaquely (no per-entry shape
// validation), so no server-side change was needed to add this.
export type ClassColor =
  | 'lavender'
  | 'mint'
  | 'peach'
  | 'sky'
  | 'yellow'
  | 'coral'
  | 'amber'
  | 'sage';

export const CLASS_COLOR_ORDER: ClassColor[] = [
  'lavender',
  'mint',
  'peach',
  'sky',
  'yellow',
  'coral',
  'amber',
  'sage',
];

// `swatch` is a design-token var() for the picker's round color swatch —
// see lib/classes.ts's classColorClassName() for the matching bg/text CSS
// classes actually used on chips/icons.
export const CLASS_COLOR_META: Record<ClassColor, { label: string; swatch: string }> = {
  lavender: { label: 'Lavender', swatch: 'var(--accent)' },
  mint: { label: 'Mint', swatch: 'var(--mint)' },
  peach: { label: 'Peach', swatch: 'var(--peach)' },
  sky: { label: 'Sky', swatch: 'var(--sky)' },
  yellow: { label: 'Yellow', swatch: 'var(--yellow)' },
  coral: { label: 'Coral', swatch: 'var(--danger)' },
  amber: { label: 'Amber', swatch: 'var(--warn)' },
  sage: { label: 'Sage', swatch: 'var(--safe)' },
};

export interface ClassEntry {
  id: string;
  name: string;
  // Unset/undefined (every class created before v5) falls back to a
  // neutral default wherever it's displayed — see lib/classes.ts.
  color?: ClassColor | null;
}

export interface UserData {
  id: string;
  name: string | null;
  classes: ClassEntry[];
  assignments: Assignment[];
  onboardingDismissed: boolean;
  linkNoticeDismissed: boolean;
  // v4, additive — see constitution.md's "Data safety" section and
  // plan.md's "v4 revision note". Both default to null for every record
  // that predates this field; nothing existing was touched to add them.
  pushSubscription: PushSubscriptionData | null;
  timeZone: string | null; // IANA name, e.g. "America/New_York"; captured invisibly client-side
  updatedAt: string; // ISO timestamp, set server-side on every save
}

// The shape a client sends on PUT — everything except id/updatedAt, which
// the server owns.
export type UserDataInput = Omit<UserData, 'id' | 'updatedAt'>;
