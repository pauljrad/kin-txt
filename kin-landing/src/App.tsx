import { TickerBanner } from './components/TickerBanner'
import { SplashScreen } from './components/SplashScreen'
import { usePullGesture } from './hooks/usePullGesture'
import { ReadInTimeSection } from './components/ReadInTimeSection'
import { RhythmEmphasisSection } from './components/RhythmEmphasisSection'
import { AccelerationSection } from './components/AccelerationSection'
import { TargetModeSection } from './components/TargetModeSection'
import { LibrarySection } from './components/LibrarySection'
import { MobileShowcaseSection } from './components/MobileShowcaseSection'
import { NewsSection } from './components/NewsSection'
import { NetworkSection } from './components/NetworkSection'
import { SonarLogo } from './components/SonarLogo'

function App() {
  // Enable global pull gesture
  usePullGesture(true);

  return (
    <div className="relative min-h-screen bg-black">
      {/* 
        The Fixed/Sticky Title Overlay.
        It uses mix-blend-difference (defined in SplashScreen) 
        so it changes color based on the background behind it.
      */}
      <SplashScreen />

      {/* Scrollable Content Layers */}
      <main className="relative z-10 font-body">

        {/* Section 1: Intro (Black) */}
        {/* This sits behind the initial splash screen position */}
        <section className="h-screen w-full bg-black flex flex-col items-center justify-start pt-12">
          <TickerBanner />

        </section>

        <ReadInTimeSection />

        <RhythmEmphasisSection />

        <AccelerationSection />

        <TargetModeSection />

        <LibrarySection />

        <NewsSection />

        <NetworkSection />

        <MobileShowcaseSection />

        {/* Footer (Black) */}
        <section className="min-h-[50vh] w-full bg-black text-white flex flex-col items-center justify-center p-8 gap-12">
          <SonarLogo />

          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="text-sm font-light tracking-widest uppercase hover:text-red-500 transition-colors opacity-100"
          >
            Return to Top
          </button>
        </section>

      </main>
    </div>
  )
}

export default App
// force rebuild
