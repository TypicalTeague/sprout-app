// Traces to spec.md story 12. Mirrors the shape of the browser's native
// PushSubscription.toJSON() — not a custom shape we invented, so the
// client can hand this straight to the server and back without mapping.

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}
