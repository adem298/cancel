import { AuditCTA } from './components/AuditCTA';
import { CancelFlowDemo } from './components/CancelFlowDemo';
import { Dashboard } from './components/Dashboard';
import { FAQ } from './components/FAQ';
import { Features } from './components/Features';
import { Footer } from './components/Footer';
import { Hero } from './components/Hero';
import { HowItWorks } from './components/HowItWorks';
import { Nav } from './components/Nav';
import { Pricing } from './components/Pricing';
import { Principles } from './components/Principles';
import { Problem } from './components/Problem';
import { Security } from './components/Security';

export default function App() {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-canvas"
      >
        Skip to content
      </a>
      <Nav />
      <main id="main" className="min-h-screen">
        <Hero />
        <Problem />
        <CancelFlowDemo />
        <HowItWorks />
        <Features />
        <Dashboard />
        <Principles />
        <Security />
        <Pricing />
        <FAQ />
        <AuditCTA />
      </main>
      <Footer />
    </>
  );
}
