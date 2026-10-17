import { BRAND, NAV_LINKS } from '../lib/site';
import { Logo } from './Logo';

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto grid w-full max-w-(--container-page) grid-cols-1 gap-10 px-5 py-14 sm:px-8 md:grid-cols-[1.4fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">{BRAND.tagline} Free, with no account.</p>
          <p className="mt-4 text-sm text-muted">
            Contact{' '}
            <a href={`mailto:${BRAND.contactEmail}`} className="text-ink-2 underline decoration-line-strong underline-offset-4 hover:text-accent">
              {BRAND.contactEmail}
            </a>
          </p>
        </div>

        <nav aria-label="Footer">
          <h2 className="text-xs font-semibold tracking-wider text-faint uppercase">Site</h2>
          <ul className="mt-4 grid grid-cols-2 gap-2.5 text-sm">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a href={link.href} className="text-muted transition-colors hover:text-ink">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="border-t border-line">
        <div className="mx-auto flex w-full max-w-(--container-page) flex-col gap-3 px-5 py-6 text-xs text-faint sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>© {new Date().getFullYear()} {BRAND.name}. All rights reserved.</p>
          <p>
            {BRAND.name} is not affiliated with, endorsed by, or sponsored by OpenAI. ChatGPT is a trademark of its owner.
          </p>
        </div>
      </div>
    </footer>
  );
}
