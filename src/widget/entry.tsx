import { StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot, type Root as ReactRoot } from 'react-dom/client';
import widgetCss from './widget.css?inline';
import { Widget } from './Widget';
import { createHttpWidgetApi } from '../shared/http/client';
import { createMockWidgetApi } from '../shared/mock/api';
import type { WidgetApi, WidgetSession } from '../shared/types';
import { readableInkOn, isHexColor } from '../shared/color';

/**
 * Stopbill cancel widget.
 *
 * Embed with one script tag:
 *   <script src="https://cdn.stopbill.dev/v1/stopbill.js"
 *           data-token="SIGNED_CUSTOMER_TOKEN"
 *           async></script>
 *
 * Optional attributes:
 *   data-label   Launcher text (default "Cancel subscription")
 *   data-mount   CSS selector for where the launcher goes (default: right after the script tag)
 *   data-api     API origin (default: the origin the script was loaded from)
 *   data-mode    "demo" uses the in-browser demo backend. Never use in production.
 *
 * Events (bubble and cross shadow boundaries, dispatched on the host element):
 *   stopbill:outcome   { outcome: 'scheduled' | 'canceled' | 'saved' | 'unconfirmed', cancellationId }
 */

declare global {
  interface Window {
    Stopbill?: { version: string; open: () => void; close: () => void };
    __stopbillMounted?: boolean;
  }
}

const VERSION = '1.0.0';

interface ScriptConfig {
  token: string;
  label: string;
  mount: string | null;
  apiBase: string;
  mode: 'demo' | 'live';
}

function readScriptConfig(): ScriptConfig | null {
  const script =
    (document.currentScript as HTMLScriptElement | null) ??
    (document.querySelector('script[src*="stopbill"][data-token]') as HTMLScriptElement | null);
  if (!script) return null;
  const token = script.dataset.token ?? '';
  if (!token) {
    console.error('[Stopbill] Missing data-token on the script tag.');
    return null;
  }
  let origin = '';
  try {
    origin = new URL(script.src, document.baseURI).origin;
  } catch {
    origin = '';
  }
  return {
    token,
    label: script.dataset.label?.trim() || 'Cancel subscription',
    mount: script.dataset.mount ?? null,
    apiBase: script.dataset.api ?? origin,
    mode: script.dataset.mode === 'demo' ? 'demo' : 'live',
  };
}

function applyBrand(host: HTMLElement, accent: string): void {
  if (!isHexColor(accent)) return;
  host.style.setProperty('--sb-accent', accent);
  host.style.setProperty('--sb-accent-ink', readableInkOn(accent));
}

interface RootProps {
  api: WidgetApi;
  token: string;
  label: string;
  host: HTMLElement;
  registerOpen: (open: () => void, close: () => void) => void;
}

function WidgetRoot({ api, token, label, host, registerOpen }: RootProps) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    registerOpen(
      () => setOpen(true),
      () => setOpen(false),
    );
  }, [registerOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    // Native close (Escape key) keeps React state in sync and returns focus to the launcher.
    const onNativeClose = () => {
      setOpen(false);
      launcherRef.current?.focus();
    };
    dialog.addEventListener('close', onNativeClose);
    return () => dialog.removeEventListener('close', onNativeClose);
  }, []);

  const close = () => setOpen(false);

  return (
    <>
      <button
        ref={launcherRef}
        type="button"
        className="sb-launcher"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        {label}
      </button>
      <dialog
        ref={dialogRef}
        className="sb-dialog"
        aria-label="Cancel subscription"
        onClick={(e) => {
          // A click on the dialog element itself (not its content) is a backdrop click.
          if (e.target === dialogRef.current) close();
        }}
      >
        {open && (
          <Widget
            api={api}
            token={token}
            onClose={close}
            onSession={(s: WidgetSession) => applyBrand(host, s.business.accentColor)}
            onOutcome={(detail) => {
              host.dispatchEvent(new CustomEvent('stopbill:outcome', { bubbles: true, composed: true, detail }));
            }}
          />
        )}
      </dialog>
    </>
  );
}

function mount(): void {
  if (window.__stopbillMounted) return;
  const config = readScriptConfig();
  if (!config) return;
  const script = document.currentScript as HTMLScriptElement | null;

  let container: Element | null = null;
  if (config.mount) container = document.querySelector(config.mount);
  if (!container && script?.parentNode) {
    // Insert right after the script tag, in the same place the host page put it.
    const holder = document.createElement('div');
    holder.setAttribute('data-stopbill-holder', '');
    script.parentNode.insertBefore(holder, script.nextSibling);
    container = holder;
  }
  if (!container) {
    console.error('[Stopbill] No mount point found. Add data-mount or place the script in the page body.');
    return;
  }

  window.__stopbillMounted = true;
  const host = document.createElement('div');
  host.setAttribute('data-stopbill', '');
  host.style.display = 'contents';
  container.appendChild(host);

  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = widgetCss;
  shadow.appendChild(style);
  const app = document.createElement('div');
  shadow.appendChild(app);

  const api =
    config.mode === 'demo'
      ? createMockWidgetApi()
      : createHttpWidgetApi({ baseUrl: config.apiBase });

  let openFn: () => void = () => undefined;
  let closeFn: () => void = () => undefined;
  const root: ReactRoot = createRoot(app);
  root.render(
    <StrictMode>
      <WidgetRoot
        api={api}
        token={config.token}
        label={config.label}
        host={host}
        registerOpen={(o, c) => {
          openFn = o;
          closeFn = c;
        }}
      />
    </StrictMode>,
  );

  window.Stopbill = {
    version: VERSION,
    open: () => openFn(),
    close: () => closeFn(),
  };
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount, { once: true });
  } else {
    mount();
  }
}
