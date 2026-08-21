// Traces to spec.md stories 6, 7, 9 and plan.md data model / "Persistence & identity".

import type { Assignment } from './assignment';
import type { PushSubscriptionData } from './push';

export interface ClassEntry {
  id: string;
  name: string;
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
