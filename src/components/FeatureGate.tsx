import { ReactNode } from "react";
import { tierHasFeature, type Feature, type Tier } from "@/lib/tiers";

export function FeatureGate({ tier, feature, children, fallback = null }: { tier: Tier | null | undefined; feature: Feature; children: ReactNode; fallback?: ReactNode }) {
  if (!tier || !tierHasFeature(tier, feature)) return <>{fallback}</>;
  return <>{children}</>;
}
