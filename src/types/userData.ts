// Traces to spec.md stories 6, 7, 9 and plan.md data model / "Persistence & identity".

import type { Assignment } from './assignment';

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
  updatedAt: string; // ISO timestamp, set server-side on every save
}

// The shape a client sends on PUT — everything except id/updatedAt, which
// the server owns.
export type UserDataInput = Omit<UserData, 'id' | 'updatedAt'>;
