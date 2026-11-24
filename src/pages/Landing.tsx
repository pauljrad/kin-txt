import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { trackMarketingEvent } from '@/lib/marketingAnalytics'
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
import { AppStoreBadge } from '@/components/landing/AppStoreBadge'

const Landing = () => {
    // Enable global pull gesture
    usePullGesture(true);

    // iPhone Safari can expose the document/root background and cache a light
    // browser chrome colour while its toolbars expand/collapse. Keep the public
    // landing canvas black for the lifetime of this page, then restore the app's
    // normal theme as soon as the user leaves.
    useEffect(() => {
        const html = document.documentElement;
        const body = document.body;
        const previousHtmlBackground = html.style.backgroundColor;
        const previousBodyBackground = body.style.backgroundColor;
        const themeMetas = Array.from(document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]'));
        const previousThemeColors = themeMetas.map((meta) => meta.content);

        html.style.backgroundColor = '#000000';
        body.style.backgroundColor = '#000000';
        themeMetas.forEach((meta) => {
            meta.content = '#000000';
        });

        return () => {
            html.style.backgroundColor = previousHtmlBackground;
            body.style.backgroundColor = previousBodyBackground;
            themeMetas.forEach((meta, index) => {
                meta.content = previousThemeColors[index] || '';
            });
        };
    }, []);

    return (
        <div className="relative min-h-screen bg-black">
            <AppStoreBadge />

            <a
                href="/submissions"
                className="absolute left-0 right-0 z-[80] w-full border-b border-white/25 bg-white px-4 py-3 text-center text-[10px] sm:text-xs font-bold uppercase tracking-[0.18em] text-black mix-blend-difference transition-opacity hover:opacity-90"
                style={{
                    top: 'env(safe-area-inset-top, 0px)',
                }}
            >
                Writers &amp; Contributors Wanted
            </a>

            {/*
        The Fixed/Sticky Title Overlay.
        It uses mix-blend-difference (defined in SplashScreen) 
        so it changes color based on the background behind it.
      */}
            <InteractiveSplashScreen />

            {/* Scrollable Content Layers */}
            <main className="relative z-10 font-body">

                {/* Section 1: Intro (Black) */}
                <section className="landing-hero-screen w-full bg-black flex flex-col items-center justify-start pt-12">
                </section>

                <KineticScrollSection />

                <RhythmEmphasisSection />

                <AccelerationSection />

                <TargetModeSection />

                <LibrarySection />

                <NewsSection />

                <NetworkSection />

                <MobileShowcaseSection />

                {/* A practical next step after seeing the demos. Keeps visitors
                    focused on reading instead of abandoning a long scroll. */}
                <section aria-labelledby="reader-invitation" className="relative z-20 w-full bg-black px-6 py-24 text-white sm:py-32">
                    <div className="mx-auto max-w-4xl">
                        <p className="mb-5 text-xs font-semibold uppercase tracking-[0.32em] text-white/55">A reading experience you control</p>
                        <h2 id="reader-invitation" className="max-w-3xl font-display text-4xl font-semibold tracking-tight sm:text-6xl">
                            Stay with the words.
                        </h2>
                        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/75">
                            Some days you want the rhythm to carry you through a paragraph. Other days, you want
                            to turn a page like a normal ebook. KiN-TXT lets you choose how you read —
                            with adjustable pace, emphasis and a familiar Page Reader.
                        </p>
                        <div className="mt-10 grid gap-4 text-left sm:grid-cols-3">
                            {[
                                { title: 'Rhythm', detail: 'Let the words appear at a pace you can follow.' },
                                { title: 'Page Reader', detail: 'Read full pages and swipe to turn them, with playback when you want it.' },
                                { title: 'Your pace', detail: 'Slow down, speed up, or turn off playback and read normally.' },
                            ].map(feature => (
                                <div key={feature.title} className="border border-white/20 p-5">
                                    <h3 className="mb-2 text-sm font-semibold uppercase tracking-widest">{feature.title}</h3>
                                    <p className="text-sm leading-relaxed text-white/65">{feature.detail}</p>
                                </div>
                            ))}
                        </div>
                        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                            <Link
                                to="/home"
                                onClick={() => trackMarketingEvent('reader_entry_click', { placement: 'landing_after_demos' })}
                                className="inline-flex min-h-12 items-center justify-center bg-white px-7 text-xs font-bold uppercase tracking-[0.16em] text-black transition-opacity hover:opacity-85"
                            >
                                Try the reader
                            </Link>
                            <Link
                                to="/pricing"
                                onClick={() => trackMarketingEvent('trial_cta_click', { placement: 'landing_after_demos' })}
                                className="inline-flex min-h-12 items-center justify-center border border-white/50 px-7 text-xs font-bold uppercase tracking-[0.16em] text-white transition-colors hover:bg-white/10"
                            >
                                Start a 7-day free trial
                            </Link>
                        </div>
                        <p className="mt-4 text-xs leading-relaxed text-white/50">
                            Pro costs £3.99 per month or £30 per year after the trial. Cancel before the trial ends to avoid a charge.
                        </p>
                    </div>
                </section>

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
                        { label: 'Writers & Submissions', href: '/submissions' },
                        { label: 'How to stay focused while reading', href: '/reading-focus.html' },
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
