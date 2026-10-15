import { BRAND, NAV_LINKS } from '../lib/site';
import { Logo } from './Logo';

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto grid grid-cols-1 w-full max-w-(--container-page) gap-10 px-5 py-14 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">{BRAND.tagline}</p>
          <p className="mt-4 text-sm text-muted">
            Contact{' '}
            <a href={`mailto:${BRAND.contactEmail}`} className="text-ink-2 underline decoration-line-strong underline-offset-4 hover:text-accent">
              {BRAND.contactEmail}
            </a>
          </p>
        </div>

        <nav aria-label="Footer">
          <h2 className="text-xs font-semibold tracking-wider text-faint uppercase">Product</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            {NAV_LINKS.slice(0, 4).map((link) => (
              <li key={link.href}>
                <a href={link.href} className="text-muted transition-colors hover:text-ink">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="text-xs font-semibold tracking-wider text-faint uppercase">Company</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li>
              <a href="#faq" className="text-muted transition-colors hover:text-ink">
                FAQ
              </a>
            </li>
            <li>
              <a href="#audit" className="text-muted transition-colors hover:text-ink">
                Free audit
              </a>
            </li>
            <li>
              <a href={`mailto:${BRAND.contactEmail}`} className="text-muted transition-colors hover:text-ink">
                Contact
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="mx-auto flex w-full max-w-(--container-page) flex-col gap-3 px-5 py-6 text-xs text-faint sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>© {new Date().getFullYear()} {BRAND.name}. All rights reserved.</p>
          <p>Stripe is a trademark of Stripe, Inc. {BRAND.name} is not affiliated with or endorsed by Stripe.</p>
        </div>
      </div>
    </footer>
  );
}
