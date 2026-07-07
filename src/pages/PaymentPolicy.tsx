import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

const Section = ({ number, title, children }: { number: string; title: string; children: React.ReactNode }) => (
  <div className="mb-8">
    <h2 className="font-display text-lg tracking-widest text-foreground mb-3 uppercase">{number}. {title}</h2>
    <div className="text-sm text-muted-foreground leading-relaxed space-y-2">{children}</div>
  </div>
);

const List = ({ items }: { items: string[] }) => (
  <ul className="list-disc list-inside space-y-1 mt-1">{items.map(i => <li key={i}>{i}</li>)}</ul>
);

export default function PaymentPolicy() {
  const navigate = useNavigate();
  return (
    <div className="min-h-[100svh] bg-background flex flex-col">
      <ThemeToggle />
      <motion.button initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} onClick={() => navigate(-1)}
        className="absolute left-4 z-50 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        style={{ top: 'calc(1rem + env(safe-area-inset-top, 0px))' }}>
        <ArrowLeft className="w-4 h-4" /> Back
      </motion.button>
      <div className="flex-1 max-w-2xl mx-auto px-6 pt-[calc(6.5rem+env(safe-area-inset-top,0px))] pb-16 w-full">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-display mb-2">KiN-TXT</p>
          <h1 className="font-display text-4xl tracking-wide text-foreground mb-2">Payment Policy</h1>
          <p className="text-xs text-muted-foreground mb-10">Last updated: June 2026</p>

          <Section number="1" title="Pricing">
            <p>KiN-TXT is offered on a subscription basis:</p>
            <List items={['£3.99 per month','£30 per year']} />
            <p className="mt-2">All new subscriptions include a 7-day free trial. No charge is made during the trial period. Prices may vary depending on location or platform provider. All applicable taxes are included where required by law unless stated otherwise.</p>
          </Section>

          <Section number="2" title="Payment Processing">
            <p>Payments are processed securely via third-party providers, including Stripe. KiN-TXT does not store full payment details and does not have direct access to payment credentials. By submitting payment details, you confirm you are authorised to use the payment method and authorise the payment provider to charge the applicable subscription fees.</p>
          </Section>

          <Section number="3" title="Subscription Agreement">
            <p>By subscribing to KiN-TXT, you agree that you are purchasing access to a digital service, access is provided immediately upon successful payment, and the service is considered delivered once access is granted. This applies regardless of the level of usage after purchase.</p>
          </Section>

          <Section number="4" title="Billing and Renewal">
            <p>Subscriptions are billed in advance on a recurring basis. By subscribing, you expressly authorise KiN-TXT (or its payment provider) to charge your payment method at the selected interval and automatically renew your subscription unless cancelled. Monthly subscriptions renew each month. Annual subscriptions renew each year. Renewal charges are applied using the payment method on file unless updated.</p>
          </Section>

          <Section number="5" title="Platform-Specific Billing (Apple / Google)">
            <p>If you subscribe via a third-party platform (e.g. Apple App Store or Google Play), billing is handled by that platform, their terms and conditions apply in addition to these, and subscription management — including cancellation and refunds — must be handled through that platform. KiN-TXT is not responsible for billing processes managed by third-party providers.</p>
          </Section>

          <Section number="6" title="Cancellation">
            <p>You may cancel your subscription at any time. Cancellation prevents future renewal charges but does not affect the current billing period. Access to the Service continues until the end of the active billing period. No partial refunds are provided for unused time.</p>
          </Section>

          <Section number="7" title="Cooling-Off Period (UK Consumers)">
            <p>If you are a consumer in the UK, you may have a legal right to cancel within 14 days. However, by subscribing and accessing the Service immediately, you acknowledge that the Service begins immediately upon subscription, you receive full access to digital content, and you may lose your right to cancel once performance has begun. This does not affect your statutory rights where they otherwise apply.</p>
            <p>Note: if you are within your 7-day free trial period and have not been charged, no refund right is applicable as no payment has been taken.</p>
          </Section>

          <Section number="8" title="Refunds">
            <p>Refunds are not provided for change of mind, lack of usage, or partial billing periods. Refunds may be issued where required by law or at our discretion in exceptional circumstances. Where access to the Service has been provided, this is considered fulfilment of the subscription. For purchases made via third-party platforms, refund requests must be directed to that platform.</p>
          </Section>

          <Section number="9" title="Failed Payments">
            <p>If a payment attempt fails, access to the Service may be suspended or restricted. We may retry the payment using the stored method. The subscription may be cancelled if payment cannot be completed. KiN-TXT reserves the right to recover outstanding amounts where permitted.</p>
          </Section>

          <Section number="10" title="Price Changes">
            <p>KiN-TXT may update subscription pricing. Existing subscriptions continue at the current price until renewal. Updated pricing applies from the next billing cycle. We will provide reasonable notice of any price changes. Continued use after renewal constitutes acceptance of the new price.</p>
          </Section>

          <Section number="11" title="Account vs Subscription">
            <p>Cancelling a subscription does not delete your account. Your account may remain active with limited or no access to paid features. Your reading history and saved documents are retained.</p>
            <p>If you wish to permanently delete your account and associated data, you can do so at any time from within the app via <span className="text-foreground">Account &amp; Settings → Delete account</span>. Deleting your account does not automatically cancel an App Store subscription — cancel that separately in your device Settings.</p>
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
