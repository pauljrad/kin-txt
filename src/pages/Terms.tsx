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

export default function Terms() {
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

      <div className="flex-1 max-w-2xl mx-auto px-6 pt-20 pb-16 w-full">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-display mb-2">KiN-TXT</p>
          <h1 className="font-display text-4xl tracking-wide text-foreground mb-2">Terms &amp; Conditions</h1>
          <p className="text-xs text-muted-foreground mb-10">Last updated: April 2026</p>

          <Section number="1" title="Overview">
            <p>These Terms and Conditions govern your access to and use of KiN-TXT ("the Service"), operated by So-Nah Ltd. By registering an account or using the Service, you agree to be bound by these Terms.</p>
          </Section>

          <Section number="2" title="Eligibility">
            <p>You must be at least 18 years of age to use the Service. By registering, you confirm that you meet this requirement and that the information you provide is accurate and complete.</p>
          </Section>

          <Section number="3" title="Account">
            <p>You are responsible for maintaining the security of your account credentials. KiN-TXT is not liable for any loss or damage arising from unauthorised access to your account.</p>
          </Section>

          <Section number="4" title="Subscription and Free Trial">
            <p>Access to the Service requires a paid subscription. All new subscriptions include a 7-day free trial period. No charge is made during the trial. If you do not cancel before the trial ends, you will be charged for the plan you selected (monthly at £3.99/month or annual at £30/year) and your subscription will continue on a recurring basis.</p>
            <p>You may cancel at any time. Cancellation prevents future renewal charges but does not affect the current billing period. Access continues until the end of the active billing period.</p>
          </Section>

          <Section number="5" title="Third-Party Billing">
            <p>Payments are processed by Stripe. Their terms and conditions apply in addition to these Terms. Subscription management — including cancellation — must be handled through the Service or the relevant platform. KiN-TXT is not responsible for billing processes managed by third-party providers.</p>
          </Section>

          <Section number="6" title="Cancellation">
            <p>You may cancel your subscription at any time. Cancellation prevents future renewal charges but does not affect the current billing period. Access to the Service continues until the end of the active billing period. No partial refunds are provided for unused time.</p>
          </Section>

          <Section number="7" title="Cooling-Off Period (UK Consumers)">
            <p>If you are a consumer in the UK, you have a legal right to cancel within 14 days of subscribing. However, by subscribing and accessing the Service, you acknowledge that the Service begins immediately upon subscription and that you receive full access to digital content. You may lose your statutory right to cancel once performance has begun. This does not affect your statutory rights where they otherwise apply.</p>
            <p>Note: if you are within your 7-day free trial period and have not been charged, no right to a refund is applicable as no payment has been taken.</p>
          </Section>

          <Section number="8" title="Refunds">
            <p>Refunds are not provided for change of mind, lack of usage, or partial billing periods. Refunds may be issued where required by law or at our discretion in exceptional circumstances. Where access to the Service has been provided, this is considered fulfilment of the subscription.</p>
          </Section>

          <Section number="9" title="Failed Payments">
            <p>If a payment attempt fails, access to the Service may be suspended or restricted. We may retry the payment using the stored method. The subscription may be cancelled if payment cannot be completed. KiN-TXT reserves the right to recover outstanding amounts where permitted.</p>
          </Section>

          <Section number="10" title="Price Changes">
            <p>KiN-TXT may update subscription pricing. Existing subscriptions continue at the current price until renewal. Updated pricing applies from the next billing cycle. We will provide reasonable notice of any price changes. Continued use after renewal constitutes acceptance of the new price.</p>
          </Section>

          <Section number="11" title="Account vs Subscription">
            <p>Cancelling a subscription does not delete your account. Your account may remain active with limited or no access to paid features. Your reading history and saved documents are retained.</p>
          </Section>

          <Section number="12" title="Chargebacks and Payment Disputes">
            <p>If you initiate a chargeback or payment dispute, access to the Service may be immediately suspended and your account may be restricted or terminated. By subscribing, you acknowledge that the service is delivered digitally upon access and that recurring billing terms have been clearly disclosed and agreed. KiN-TXT reserves the right to provide evidence to payment processors to dispute invalid claims and to recover unpaid amounts where legally permitted.</p>
          </Section>

          <Section number="13" title="Service Changes">
            <p>KiN-TXT may modify, update, or remove features of the Service at any time. Such changes do not entitle users to refunds unless required by law.</p>
          </Section>

          <Section number="14" title="Contact">
            <p><a href="mailto:hello@kin-txt.com" className="text-foreground underline underline-offset-2">hello@kin-txt.com</a></p>
          </Section>
        </motion.div>
      </div>
    </div>
  );
}
