import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  CHANNELS,
  FLOWS,
  emptyProgress,
  flowFor,
  isComplete,
  nextStepIndex,
  setEndDate,
  toggleStep,
} from '../extension/lib/flows.js';

const manifest = JSON.parse(readFileSync(new URL('../extension/manifest.json', import.meta.url), 'utf8'));

describe('extension manifest (privacy guarantees)', () => {
  it('asks only for storage, identity (to know which Chrome account is signed in), and that email', () => {
    expect([...manifest.permissions].sort()).toEqual(['identity', 'identity.email', 'storage']);
  });

  it('can reach only the Gmail API, never arbitrary sites', () => {
    expect(manifest.host_permissions).toEqual(['https://gmail.googleapis.com/*']);
  });

  it('requests only the read-only Gmail scope', () => {
    expect(manifest.oauth2.scopes).toEqual(['https://www.googleapis.com/auth/gmail.readonly']);
  });

  it('has no content scripts and no background page, so it cannot read or click pages', () => {
    expect(manifest.content_scripts).toBeUndefined();
    expect(manifest.background).toBeUndefined();
  });

  it('is Manifest V3 with a popup', () => {
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.action.default_popup).toBe('popup.html');
  });
});

describe('guided flows', () => {
  it('every channel with a flow points at a real flow', () => {
    for (const channel of CHANNELS) {
      if (channel.flowId) expect(FLOWS[channel.flowId], channel.id).toBeDefined();
    }
  });

  it('"not sure" has no flow, so the popup shows the statement guide instead', () => {
    expect(flowFor('unsure')).toBeNull();
    expect(flowFor('unknown-id')).toBeNull();
  });

  it('every flow step has a unique id and a label, and ends by asking for the end date', () => {
    for (const flow of Object.values(FLOWS)) {
      const ids = flow.steps.map((s) => s.id);
      expect(new Set(ids).size, flow.id).toBe(ids.length);
      for (const step of flow.steps) expect(step.label.length, `${flow.id}/${step.id}`).toBeGreaterThan(10);
      expect(flow.steps.at(-1).endDate, flow.id).toBe(true);
    }
  });

  it('no step is automated: no selectors, scripts, or form fields to fill in', () => {
    for (const flow of Object.values(FLOWS)) {
      for (const step of flow.steps) {
        expect(Object.keys(step).sort().every((k) => ['id', 'label', 'open', 'endDate'].includes(k)), `${flow.id}/${step.id}`).toBe(true);
      }
    }
  });

  it('only opens URLs on the OpenAI domains', () => {
    for (const flow of Object.values(FLOWS)) {
      expect(new URL(flow.helpUrl).hostname.endsWith('openai.com'), flow.id).toBe(true);
      for (const step of flow.steps) {
        if (step.open) expect(new URL(step.open.url).hostname, flow.id).toBe('chatgpt.com');
      }
    }
  });

  it('the web flow includes the 24-hour rule', () => {
    expect(FLOWS['chatgpt-web'].notes.join(' ')).toMatch(/24 hours/);
  });
});

describe('progress helpers', () => {
  const flow = FLOWS['chatgpt-web'];

  it('starts empty with no channel', () => {
    expect(emptyProgress()).toEqual({ channel: null, done: [], endDate: '' });
  });

  it('toggles a step on and off without mutating the input', () => {
    const start = emptyProgress('web');
    const on = toggleStep(start, 'open');
    expect(on.done).toEqual(['open']);
    expect(start.done).toEqual([]);
    expect(toggleStep(on, 'open').done).toEqual([]);
  });

  it('nextStepIndex points at the first unfinished step, then -1 when all are done', () => {
    let p = emptyProgress('web');
    expect(nextStepIndex(flow, p)).toBe(0);
    for (const step of flow.steps) p = toggleStep(p, step.id);
    expect(nextStepIndex(flow, p)).toBe(-1);
    expect(isComplete(flow, p)).toBe(true);
  });

  it('a partly finished flow is not complete', () => {
    const p = toggleStep(emptyProgress('web'), 'open');
    expect(isComplete(flow, p)).toBe(false);
  });

  it('accepts a YYYY-MM-DD end date and clears on empty', () => {
    expect(setEndDate(emptyProgress('web'), '2026-11-15').endDate).toBe('2026-11-15');
    expect(setEndDate({ channel: 'web', done: [], endDate: '2026-11-15' }, '').endDate).toBe('');
  });

  it('rejects a malformed end date', () => {
    expect(() => setEndDate(emptyProgress('web'), '15/11/2026')).toThrow(/YYYY-MM-DD/);
    expect(() => setEndDate(emptyProgress('web'), '2026-11-15T00:00')).toThrow();
  });
});
