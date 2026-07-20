export type Tier = "starter" | "growth" | "pro" | "developer";
export type Feature =
  | "feed"
  | "tickets_basic"
  | "tickets_states"
  | "guests"
  | "payments_tracking"
  | "payments_reminders"
  | "payments_reconciliation"
  | "analytics_basic"
  | "analytics_realtime"
  | "analytics_advanced"
  | "amenities"
  | "roles_by_area"
  | "white_label"
  | "custom_payments"
  | "polls"
  | "visits_log";

const STARTER: Feature[] = [
  "feed",
  "tickets_basic",
  "guests",
  "payments_tracking",
  "analytics_basic",
];
const GROWTH: Feature[] = [
  ...STARTER,
  "tickets_states",
  "payments_reminders",
  "analytics_realtime",
  "polls",
  "visits_log",
];
const PRO: Feature[] = [
  ...GROWTH,
  "amenities",
  "roles_by_area",
  "payments_reconciliation",
  "analytics_advanced",
];
const DEVELOPER: Feature[] = [...PRO, "white_label", "custom_payments"];

export const TIER_FEATURES: Record<Tier, Feature[]> = {
  starter: STARTER,
  growth: GROWTH,
  pro: PRO,
  developer: DEVELOPER,
};

export const TIER_SEATS: Record<Tier, number | null> = {
  starter: 1,
  growth: 3,
  pro: 10,
  developer: null,
};

export const TIER_LABELS: Record<Tier, string> = {
  starter: "Starter",
  growth: "Growth",
  pro: "Pro",
  developer: "Developer",
};

export function tierHasFeature(tier: Tier, f: Feature) {
  return TIER_FEATURES[tier].includes(f);
}
