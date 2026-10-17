import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// The copy is the product's promise. These checks stop claims we cannot support from creeping back in.
const copy = ['src/lib/site.ts', 'src/components/Hero.tsx', 'src/components/Install.tsx', 'src/components/Limits.tsx', 'src/components/FAQ.tsx']
  .map((f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8'))
  .join('\n');

describe('site copy guards', () => {
  it('does not mention Stripe or a paid plan', () => {
    expect(copy).not.toMatch(/stripe/i);
    expect(copy).not.toMatch(/\$\s?\d/);
  });

  it('does not promise automation or refunds', () => {
    expect(copy).not.toMatch(/guaranteed refund|we will get you a refund|we cancel for you|one-click cancel/i);
  });

  it('states it is not affiliated with OpenAI', () => {
    expect(copy).toMatch(/not affiliated with OpenAI/);
  });
});
