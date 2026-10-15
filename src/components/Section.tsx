import type { ReactNode } from 'react';

type SectionProps = {
  id: string;
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
  align?: 'left' | 'center';
};

/** Standard section frame: eyebrow, heading, lead paragraph, content. */
export function Section({ id, eyebrow, title, description, children, className = '', align = 'left' }: SectionProps) {
  const headingId = `${id}-heading`;
  const centered = align === 'center';
  return (
    <section id={id} aria-labelledby={headingId} className={`scroll-mt-20 py-20 sm:py-24 ${className}`}>
      <div className="mx-auto w-full max-w-(--container-page) px-5 sm:px-8">
        <header className={`mb-12 max-w-2xl ${centered ? 'mx-auto text-center' : ''}`}>
          {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
          <h2 id={headingId} className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            {title}
          </h2>
          {description && <p className="mt-4 text-base leading-relaxed text-muted sm:text-lg">{description}</p>}
        </header>
        {children}
      </div>
    </section>
  );
}
