import { Channels } from './components/Channels';
import { FAQ } from './components/FAQ';
import { Footer } from './components/Footer';
import { Hero } from './components/Hero';
import { Install } from './components/Install';
import { Limits } from './components/Limits';
import { Nav } from './components/Nav';
import { Steps } from './components/Steps';

export default function App() {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-canvas"
      >
        Skip to content
      </a>
      <div id="top" />
      <Nav />
      <main id="main" className="min-h-screen">
        <Hero />
        <Channels />
        <Steps />
        <Limits />
        <Install />
        <FAQ />
      </main>
      <Footer />
    </>
  );
}
