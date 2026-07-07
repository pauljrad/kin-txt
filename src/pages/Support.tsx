import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

const Section = ({ number, title, children }: { number: string; title: string; children: React.ReactNode }) => (
  <div className="mb-8">
    <h2 className="font-display text-lg tracking-widest text-foreground mb-3 uppercase">
      {number}. {title}
    </h2>
    <div className="text-sm text-muted-foreground leading-relaxed space-y-2">
      {children}
    </div>
  </div>
);

export default function Support() {
  const navigate = useNavigate();
  return (
    <div className="min-h-[100svh] bg-background flex flex-col">
      <ThemeToggle />
      <motion.button
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => navigate(-1)}
        className="absolute left-4 z-50 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        style={{ top: 'calc(1rem + env(safe-area-inset-top, 0px))' }}
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </motion.button>

      <div className="flex-1 max-w-2xl mx-auto px-6 pt-[calc(6.5rem+env(safe-area-inset-top,0px))] pb-16 w-full">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-display mb-2">KiN-TXT</p>
          <h1 className="font-display text-4xl tracking-wide text-foreground mb-2">Support</h1>
          <p className="text-xs text-muted-foreground mb-10">Need a hand? We're here to help.</p>

          <Section number="1" title="Contact Us">
            <p>The fastest way to reach us is by email — we read every message and aim to reply within 2 business days.</p>
            <p>
              For anything at all — help, questions, billing, or reporting abuse or a safety concern:{' '}
              <a href="mailto:hello@kin-txt.com" className="text-foreground underline underline-offset-2">hello@kin-txt.com</a>
            </p>
          </Section>

          <Section number="2" title="Getting Started">
            <p>KiN-TXT streams text to you one word at a time, so your eyes stay still and your focus stays whole. To start reading:</p>
            <ul className="list-disc list-inside space-y-1 mt-1">
              <li>Open the <span className="text-foreground">Ebooks</span> tab for a library of classics, or <span className="text-foreground">News</span> for live articles.</li>
              <li>Under <span className="text-foreground">My TXTs</span>, paste or type text, upload a document, or paste a link and let our AI import it.</li>
              <li>Tap a title, then <span className="text-foreground">Read Now</span>. Tap the screen to pause or resume, and use the controls to change speed and mode.</li>
            </ul>
          </Section>

          <Section number="3" title="Reading Modes">
            <ul className="list-disc list-inside space-y-1 mt-1">
              <li><span className="text-foreground">Rhythm &amp; Emphasis</span> — words arrive through pace, pause and emphasis.</li>
              <li><span className="text-foreground">Acceleration</span> — gradually increases your speed as you read.</li>
              <li><span className="text-foreground">Target Mode</span> — locks each word to a fixed point so your gaze never moves.</li>
            </ul>
            <p>You can adjust speed, open the full text, and skip to any word at any time.</p>
          </Section>

          <Section number="4" title="Subscriptions &amp; Billing">
            <p>KiN Pro is an auto-renewing subscription sold through Apple In-App Purchase. It is billed to your Apple ID and renews automatically unless cancelled at least 24 hours before the end of the current period.</p>
            <p>To manage or cancel your subscription, open the iOS <span className="text-foreground">Settings</span> app → tap your name → <span className="text-foreground">Subscriptions</span>. To restore a previous purchase on a new device, use <span className="text-foreground">Account &amp; Settings → Restore Purchases</span> in the app.</p>
            <p>Refunds for App Store purchases are handled by Apple at <a href="https://reportaproblem.apple.com" className="text-foreground underline underline-offset-2">reportaproblem.apple.com</a>.</p>
          </Section>

          <Section number="5" title="Your Account &amp; Data">
            <p>You can permanently delete your account and associated data at any time from within the app via <span className="text-foreground">Account &amp; Settings → Delete account</span>. For details on how we handle data, see our <a href="/privacy" className="text-foreground underline underline-offset-2">Privacy Policy</a> and <a href="/data" className="text-foreground underline underline-offset-2">Data Policy</a>.</p>
          </Section>

          <Section number="6" title="Community Safety">
            <p>KiN's social features have zero tolerance for objectionable content or abusive behaviour. You can report or block any user directly from their profile in the app. Reports are reviewed and acted on within 24 hours. You can also email <a href="mailto:hello@kin-txt.com" className="text-foreground underline underline-offset-2">hello@kin-txt.com</a>.</p>
          </Section>

          <Section number="7" title="Policies">
            <p className="flex flex-wrap gap-x-4 gap-y-1">
              <a href="/terms" className="text-foreground underline underline-offset-2">Terms of Use</a>
              <a href="/privacy" className="text-foreground underline underline-offset-2">Privacy Policy</a>
              <a href="/data" className="text-foreground underline underline-offset-2">Data Policy</a>
              <a href="/copyright" className="text-foreground underline underline-offset-2">Copyright Policy</a>
              <a href="/payment-policy" className="text-foreground underline underline-offset-2">Payment Policy</a>
            </p>
          </Section>
        </motion.div>
      </div>
    </div>
  );
}
