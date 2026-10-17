import { Download } from 'lucide-react';
import { BRAND } from '../lib/site';
import { Section } from './Section';

const INSTALL_STEPS = [
  'Download the extension zip and unzip it into a folder you will keep.',
  'Open chrome://extensions (or edge://, brave://, opera://extensions), then turn on Developer mode.',
  'Choose Load unpacked and select the unzipped folder.',
  'Pin Stopbill from the extensions menu, then click it to start.',
];

export function Install() {
  return (
    <Section
      id="install"
      eyebrow="Install"
      title="Add it to your Chromium browser."
      description="Early access. Works in Chrome, Edge, Brave, and Opera. Install it from the zip. Gmail scanning needs Google approval for each account during early access."
    >
      <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="panel flex flex-col justify-between p-6">
          <div>
            <h3 className="text-base font-semibold text-ink">Stopbill for Chromium browsers</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">Version 0.4.0 · Free · No Stopbill account</p>
          </div>
          <a href={BRAND.extensionZip} className="btn-primary mt-8 w-full sm:w-auto">
            <Download className="size-4" aria-hidden="true" />
            Download stopbill-extension.zip
          </a>
        </div>
        <ol className="panel grid gap-4 p-6">
          {INSTALL_STEPS.map((step, index) => (
            <li key={step} className="flex gap-4 text-sm leading-relaxed text-ink-2">
              <span className="font-mono text-xs text-accent">0{index + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>
    </Section>
  );
}
