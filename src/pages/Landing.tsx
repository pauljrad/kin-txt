import { InteractiveSplashScreen } from '@/components/landing/SplashScreen'
import { usePullGesture } from '@/hooks/usePullGesture'
import { KineticScrollSection } from '@/components/landing/KineticScrollSection'
import { RhythmEmphasisSection } from '@/components/landing/RhythmEmphasisSection'
import { AccelerationSection } from '@/components/landing/AccelerationSection'
import { TargetModeSection } from '@/components/landing/TargetModeSection'
import { LibrarySection } from '@/components/landing/LibrarySection'
import { MobileShowcaseSection } from '@/components/landing/MobileShowcaseSection'
import { NewsSection } from '@/components/landing/NewsSection'
import { NetworkSection } from '@/components/landing/NetworkSection'
import { SonarLogo } from '@/components/landing/SonarLogo'

const Landing = () => {
    // Enable global pull gesture
    usePullGesture(true);

    return (
        <div className="relative min-h-screen bg-black">
            {/* 
        The Fixed/Sticky Title Overlay.
        It uses mix-blend-difference (defined in SplashScreen) 
        so it changes color based on the background behind it.
      */}
            <InteractiveSplashScreen />

            {/* Scrollable Content Layers */}
            <main className="relative z-10 font-body">

                {/* Section 1: Intro (Black) */}
                <section className="h-screen w-full bg-black flex flex-col items-center justify-start pt-12">
                </section>

                <KineticScrollSection />

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
                    <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
                      {[
                        { label: 'Terms of Use', href: '/terms' },
                        { label: 'Privacy Policy', href: '/privacy' },
                        { label: 'Data Policy', href: '/data' },
                        { label: 'Copyright Policy', href: '/copyright' },
                        { label: 'Payment Policy', href: '/payment-policy' },
                      ].map(link => (
                        <a
                          key={link.href}
                          href={link.href}
                          className="text-xs uppercase tracking-widest text-white/40 hover:text-white/80 transition-colors"
                        >
                          {link.label}
                        </a>
                      ))}
                    </div>
                    <button
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        className="relative z-50 text-sm font-light tracking-widest uppercase hover:text-red-500 transition-colors opacity-100 cursor-pointer pointer-events-auto"
                    >
                        Return to Top
                    </button>
                </section>

            </main>
        </div>
    )
}

export default Landing;
