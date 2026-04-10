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

export default function Privacy() {
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
          <h1 className="font-display text-4xl tracking-wide text-foreground mb-2">Privacy Policy</h1>
          <p className="text-xs text-muted-foreground mb-10">Last updated: April 2026</p>

          <Section number="1" title="Data Controller">
            <p>KiN-TXT is the data controller responsible for your personal data.</p>
          </Section>

          <Section number="2" title="Data Collected">
            <p>We collect the minimum personal data necessary to operate the Service. This includes:</p>
            <ul className="list-disc list-inside space-y-1 mt-1">
              <li>Email address</li>
              <li>Display name (if provided)</li>
              <li>Payment information (processed and stored by Stripe — not retained by KiN-TXT directly)</li>
              <li>Reading activity, documents, and progress data stored within the Service</li>
            </ul>
            <p>We may also process limited technical data necessary to operate and secure the Service, such as account activity and basic system logs.</p>
          </Section>

          <Section number="3" title="Purpose of Processing">
            <p>Your data is used only to:</p>
            <ul className="list-disc list-inside space-y-1 mt-1">
              <li>provide access to your account and the Service</li>
              <li>operate, maintain, and improve the Service</li>
              <li>communicate essential service-related information (such as account confirmation and service notices)</li>
            </ul>
            <p>We do not send unsolicited marketing communications.</p>
          </Section>

          <Section number="4" title="Legal Basis">
            <p>We process personal data on the basis of:</p>
            <ul className="list-disc list-inside space-y-1 mt-1">
              <li>Contract — to provide the Service you have requested</li>
              <li>Legitimate interest — to operate, secure, and improve the Service</li>
            </ul>
            <p>We do not use your data for advertising, profiling, or automated decision-making.</p>
          </Section>

          <Section number="5" title="Data Sharing">
            <p>We do not sell or share your data for marketing purposes. Data may be processed by trusted service providers where necessary to operate the Service, including:</p>
            <ul className="list-disc list-inside space-y-1 mt-1">
              <li>Stripe — payment processing</li>
              <li>Supabase — hosting and infrastructure</li>
            </ul>
            <p>These providers are required to process data securely and in accordance with applicable law.</p>
          </Section>

          <Section number="6" title="International Transfers">
            <p>Some service providers may process data outside the UK. Where this occurs, appropriate safeguards are used to protect your data in accordance with applicable law.</p>
          </Section>

          <Section number="7" title="Legal Disclosure">
            <p>We may disclose data where required to comply with legal obligations, to enforce our rights, or to prevent fraud or misuse.</p>
          </Section>

          <Section number="8" title="Data Security">
            <p>We take reasonable technical and organisational measures to protect your data. However, no system is completely secure.</p>
          </Section>

          <Section number="9" title="Retention">
            <p>We retain data only for as long as necessary to provide the Service and comply with legal obligations. You may request deletion at any time, subject to any legal obligations requiring retention.</p>
          </Section>

          <Section number="10" title="Your Rights">
            <p>Under UK GDPR, you have the right to:</p>
            <ul className="list-disc list-inside space-y-1 mt-1">
              <li>access your data</li>
              <li>correct inaccurate data</li>
              <li>request deletion</li>
              <li>restrict or object to processing</li>
              <li>request data portability (where applicable)</li>
            </ul>
            <p>You also have the right to lodge a complaint with the UK Information Commissioner's Office (ICO).</p>
          </Section>

          <Section number="11" title="Contact">
            <p><a href="mailto:hello@kin-txt.com" className="text-foreground underline underline-offset-2">hello@kin-txt.com</a></p>
          </Section>
        </motion.div>
      </div>
    </div>
  );
}
