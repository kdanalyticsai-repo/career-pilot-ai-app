export type UsageData = {
  plan: string;
  is_trial: boolean;
  trial_ends_at: string | null;
  usage: Record<string, { used: number; limit: number | null; blocked: boolean; reason: string | null }>;
} | null | undefined;

/** True when the 7-day trial has ended and the user is still on the free plan. */
export const isTrialEnded = (d: UsageData): boolean =>
  !!d && !d.is_trial && d.plan === 'free';

/** True when a specific AI feature is blocked (trial ended or no access). */
export const isFeatureBlocked = (d: UsageData, feature: string): boolean =>
  !!d?.usage?.[feature]?.blocked;

/** Returns a formatted trial end date string, e.g. "May 27, 2026". */
export const formatTrialEnd = (d: UsageData): string => {
  if (!d?.trial_ends_at) return '';
  return new Date(d.trial_ends_at).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
};
