import { describe, expect, it } from 'vitest';
import { accentIssues, contrastRatio, readableInkOn, INK_DARK } from '../src/shared/color';
import { toCsv } from '../src/shared/csv';
import { describeOffers, mrrAfterOffer, offersForReason } from '../src/shared/offers';
import { addMonthsIso, isValidEmail, maskEmail } from '../src/shared/format';
import { defaultSettings, getPlan } from '../src/shared/catalog';
import type { Settings } from '../src/shared/types';

describe('color', () => {
  it('chooses dark ink on the default green accent and white ink on deep blue', () => {
    expect(readableInkOn('#34d399')).toBe(INK_DARK);
    expect(readableInkOn('#1e3a8a')).toBe('#ffffff');
  });

  it('every accent the validator accepts reaches 4.5:1 with the chosen ink', () => {
    let checked = 0;
    for (let r = 0; r <= 255; r += 17) {
      for (let g = 0; g <= 255; g += 17) {
        for (let b = 0; b <= 255; b += 17) {
          const hex = `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
          if (accentIssues(hex).length > 0) continue;
          checked += 1;
          expect(contrastRatio(hex, readableInkOn(hex))).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
    expect(checked).toBeGreaterThan(20);
  });

  it('rejects malformed and near-invisible accents with a readable message', () => {
    expect(accentIssues('green')[0]).toMatch(/six-digit hex/);
    expect(accentIssues('#0a0a0b').length).toBeGreaterThan(0);
    expect(accentIssues('#34d399')).toEqual([]);
  });
});

describe('csv', () => {
  it('quotes separators, quotes and newlines, and neutralises formula injection', () => {
    const csv = toCsv(
      [{ name: 'Acme, "Inc"', note: 'line\nbreak', formula: '=HYPERLINK("x")' }],
      [
        { header: 'Name', value: (r) => r.name },
        { header: 'Note', value: (r) => r.note },
        { header: 'Formula', value: (r) => r.formula },
      ],
    );
    expect(csv).toBe('Name,Note,Formula\r\n"Acme, ""Inc""","line\nbreak","\'=HYPERLINK(""x"")"\r\n');
  });
});

describe('offers', () => {
  const settings = defaultSettings(new Date('2026-10-15T09:00:00Z'));

  it('does not offer a downgrade on the cheapest plan', () => {
    expect(Object.keys(describeOffers(settings, getPlan('starter')))).not.toContain('downgrade');
    expect(Object.keys(describeOffers(settings, getPlan('growth')))).toContain('downgrade');
  });

  it('shows only configured offers for the reason, in the owner’s order', () => {
    expect(offersForReason(settings, 'too_expensive', getPlan('growth'))).toEqual(['discount', 'downgrade']);
    expect(offersForReason(settings, 'too_expensive', getPlan('starter'))).toEqual(['discount']);
    expect(offersForReason(settings, 'not_using', getPlan('growth'))).toEqual(['pause']);
    expect(offersForReason(settings, 'missing_feature', getPlan('growth'))).toEqual([]);
  });

  it('drops offers the owner has disabled for a reason', () => {
    const disabled: Settings = {
      ...settings,
      reasons: { ...settings.reasons, too_expensive: { enabled: false, offers: ['discount'] } },
    };
    expect(offersForReason(disabled, 'too_expensive', getPlan('growth'))).toEqual([]);
  });

  it('computes the monthly revenue kept after each offer', () => {
    expect(mrrAfterOffer('discount', settings, getPlan('growth')).mrrKeptUsd).toBeCloseTo(55.3, 2);
    expect(mrrAfterOffer('pause', settings, getPlan('growth')).mrrKeptUsd).toBe(0);
    expect(mrrAfterOffer('downgrade', settings, getPlan('growth')).mrrKeptUsd).toBe(29);
  });
});

describe('format', () => {
  it('adds months and clamps to the end of shorter months', () => {
    expect(addMonthsIso('2026-01-31T00:00:00.000Z', 1).slice(0, 10)).toBe('2026-02-28');
    expect(addMonthsIso('2026-10-15T00:00:00.000Z', 2).slice(0, 10)).toBe('2026-12-15');
  });

  it('masks emails and validates them', () => {
    expect(maskEmail('maya@acme.io')).toBe('m•••@acme.io');
    expect(isValidEmail('maya@acme.io')).toBe(true);
    expect(isValidEmail('maya@acme')).toBe(false);
  });
});
