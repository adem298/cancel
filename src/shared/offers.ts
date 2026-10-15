import type { OfferKind, Plan, ReasonId, Settings } from './types';
import { PLANS } from './catalog';
import { addMonthsIso } from './format';

export interface OfferDescription {
  label: string;
  detail: string;
}

/**
 * Describe each offer that is configured and applicable to this plan.
 * A downgrade is only offered when the target plan is cheaper than the current one.
 * Shared by the widget session endpoint and the mock backend so both agree.
 */
export function describeOffers(settings: Settings, plan: Plan): Partial<Record<OfferKind, OfferDescription>> {
  const out: Partial<Record<OfferKind, OfferDescription>> = {};
  const { discount, pause, downgrade } = settings.offers;

  out.discount = {
    label: `${discount.percentOff}% off for ${discount.months} ${discount.months === 1 ? 'month' : 'months'}`,
    detail: `Your next ${discount.months} ${discount.months === 1 ? 'invoice is' : 'invoices are'} discounted by ${discount.percentOff}%. Your regular price resumes after that.`,
  };

  out.pause = {
    label: `Pause billing for ${pause.months} ${pause.months === 1 ? 'month' : 'months'}`,
    detail: 'You will not be charged while paused. Your access and data stay in place, and billing resumes automatically.',
  };

  const target = PLANS.find((p) => p.id === downgrade.targetPlan);
  if (target && target.priceUsd < plan.priceUsd) {
    out.downgrade = {
      label: `Switch to ${target.name} at $${target.priceUsd}/mo`,
      detail: `Your plan changes to ${target.name} from your next billing period. Your account and data stay in place.`,
    };
  }

  return out;
}

/** Offers to show for a given reason, in the order configured by the owner. */
export function offersForReason(settings: Settings, reason: ReasonId, plan: Plan): OfferKind[] {
  const config = settings.reasons[reason];
  if (!config?.enabled) return [];
  const available = describeOffers(settings, plan);
  return config.offers.filter((kind) => available[kind] !== undefined);
}

/** Monthly revenue still coming in from this subscription after an accepted offer. */
export function mrrAfterOffer(
  kind: OfferKind,
  settings: Settings,
  plan: Plan,
): { planId: Plan['id']; priceUsd: number; mrrKeptUsd: number } {
  switch (kind) {
    case 'discount': {
      const priceUsd = plan.priceUsd;
      const mrrKeptUsd = Math.round(priceUsd * (100 - settings.offers.discount.percentOff)) / 100;
      return { planId: plan.id, priceUsd, mrrKeptUsd };
    }
    case 'pause':
      return { planId: plan.id, priceUsd: plan.priceUsd, mrrKeptUsd: 0 };
    case 'downgrade': {
      const target = PLANS.find((p) => p.id === settings.offers.downgrade.targetPlan) ?? plan;
      return { planId: target.id, priceUsd: target.priceUsd, mrrKeptUsd: target.priceUsd };
    }
  }
}

export function offerEffectEnd(kind: OfferKind, settings: Settings, nowIso: string): string | null {
  if (kind === 'discount') return addMonthsIso(nowIso, settings.offers.discount.months);
  if (kind === 'pause') return addMonthsIso(nowIso, settings.offers.pause.months);
  return null;
}
