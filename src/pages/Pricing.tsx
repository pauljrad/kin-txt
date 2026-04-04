import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Check, ArrowLeft } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { supabase } from '@/integrations/supabase/client';

// Animated KiN logo — same as splash screen, scaled down
const KinLogo = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
  const sizeClass = size === 'lg' ? 'text-7xl sm:text-8xl' : size === 'md' ? 'text-4xl sm:text-5xl' : 'text-2xl sm:text-3xl';
  return (
    <h1 className={`${sizeClass} font-display text-foreground tracking-wide flex items-baseline justify-center leading-none select-none`}>
      <span className="opacity-0">K</span>
      <span className="relative inline-flex flex-col items-center mx-[0.05em]" style={{ width: '0.36em' }}>
        <motion.span
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, ease: 'easeInOut', repeatType: 'reverse' }}
          className="absolute block rounded-full bg-foreground"
          style={{ width: '0.11em', height: '0.11em', top: '0.05em' }}
        />
        <span
          className="block bg-foreground rounded-sm"
          style={{ width: '0.11em', height: '0.55em', marginTop: '0.38em' }}
        />
      </span>
      <span className="opacity-0">n</span>
      <motion.span
        animate={{ x: [-4, 4, -4] }}
        transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
        className="inline-block text-foreground mx-[0.05em]"
      >
        -
      </motion.span>
      <span className="opacity-0">TXT</span>
    </h1>
  );
};

const PLANS = [
  {
    id: 'monthly',
    label: 'Monthly',
    price: '£3.99',
    period: '/month',
    annualEquiv: null,
    badge: null,
    priceId: 'price_1TIXZ1RuFCnPyOr9FehrdF7L',
    features: [
      '1-week free trial',
      'Unlimited RSVP reading',
      'Ebooks, articles & news',
      'KiN social reading',
      'All reading modes',
      'Cancel anytime',
    ],
  },
  {
    id: 'annual',
    label: 'Annual',
    price: '£30',
    period: '/year',
    annualEquiv: '£2.50/mo',
    badge: 'Save 37%',
    priceId: 'price_1TIXbZRuFCnPyOr91szBn2Aq',
    features: [
      '1-week free trial',
      'Unlimited RSVP reading',
      'Ebooks, articles & news',
      'KiN social reading',
      'All reading modes',
      'Cancel anytime',
    ],
  },
];

export default function Pricing() {
  const navigate = useNavigate();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleStartTrial = async (plan: typeof PLANS[0]) => {
    setLoadingPlan(plan.id);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { priceId: plan.priceId },
      });

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      // Show a friendly message if Stripe isn't fully wired yet
      alert('Unable to start checkout right now. Please try again shortly.');
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-[100svh] relative bg-background overflow-hidden flex flex-col">
      <ThemeToggle />

      {/* Back button */}
      <motion.button
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        onClick={() => navigate('/login')}
        className="absolute top-4 left-4 z-50 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        style={{ top: 'calc(1rem + env(safe-area-inset-top, 0px))' }}
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </motion.button>

      <div className="flex-1 flex flex-col items-center justify-start px-4 pt-16 pb-12">

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-2"
        >
          <KinLogo size="md" />
        </motion.div>

        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center mb-10"
        >
          <p className="text-muted-foreground text-sm mt-3 max-w-xs mx-auto">
            Start your free trial today. No charge for 7 days. Cancel anytime.
          </p>
        </motion.div>

        {/* Pricing Cards */}
        <div className="w-full max-w-md space-y-4">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 + i * 0.1 }}
              className={`relative rounded-2xl border p-6 transition-colors ${
                plan.id === 'annual'
                  ? 'border-foreground/40 bg-foreground/5'
                  : 'border-border bg-card/50'
              }`}
            >
              {/* Badge */}
              {plan.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-foreground text-background text-xs font-bold font-display tracking-widest px-3 py-1 rounded-full uppercase">
                  {plan.badge}
                </span>
              )}

              <div className="flex items-start justify-between mb-5">
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground font-display mb-1">
                    {plan.label}
                  </p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-display text-foreground">{plan.price}</span>
                    <span className="text-sm text-muted-foreground">{plan.period}</span>
                  </div>
                  {plan.annualEquiv && (
                    <p className="text-xs text-muted-foreground mt-0.5">{plan.annualEquiv} — billed annually</p>
                  )}
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-2 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="w-3.5 h-3.5 text-foreground shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <button
                id={`start-trial-${plan.id}`}
                onClick={() => handleStartTrial(plan)}
                disabled={loadingPlan !== null}
                className={`w-full h-12 rounded-xl font-display tracking-widest uppercase text-sm transition-all ${
                  plan.id === 'annual'
                    ? 'bg-foreground text-background hover:bg-foreground/90'
                    : 'border border-foreground/40 text-foreground hover:bg-foreground/10'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loadingPlan === plan.id ? 'Redirecting...' : 'Start Free Trial'}
              </button>
            </motion.div>
          ))}
        </div>

        {/* Legal footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="mt-8 text-center max-w-xs mx-auto"
        >
          <p className="text-xs text-muted-foreground leading-relaxed">
            Your free trial begins the moment you subscribe. If you do not cancel before the 7-day trial period ends, you will be charged for the plan you selected. You can cancel at any time from your account settings.
          </p>
          <div className="flex items-center justify-center gap-3 mt-3">
            <a href="/terms" className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2">
              Terms of Service
            </a>
            <span className="text-muted-foreground/40">·</span>
            <a href="/privacy" className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2">
              Privacy Policy
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
