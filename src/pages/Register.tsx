import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const schema = z.object({
  displayName: z.string().min(2, 'Display name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  agreed: z.boolean().refine(v => v === true, 'You must agree to the Terms of Service'),
}).refine(d => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type FormErrors = Partial<Record<keyof z.infer<typeof schema> | 'confirmPassword', string>>;

const PLAN_LABELS: Record<string, { label: string; price: string; priceId: string }> = {
  monthly: { label: 'Monthly', price: '£3.99/month', priceId: 'price_1TIXZ1RuFCnPyOr9FehrdF7L' },
  annual:  { label: 'Annual',  price: '£30/year',    priceId: 'price_1TIXbZRuFCnPyOr91szBn2Aq' },
};

export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const plan = searchParams.get('plan') ?? 'monthly';
  const planInfo = PLAN_LABELS[plan] ?? PLAN_LABELS.monthly;

  const { signUp } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  const validate = () => {
    const result = schema.safeParse({ displayName, email, password, confirmPassword, agreed });
    if (result.success) { setErrors({}); return true; }
    const fieldErrors: FormErrors = {};
    result.error.errors.forEach(e => {
      const field = e.path[0] as keyof FormErrors;
      if (!fieldErrors[field]) fieldErrors[field] = e.message;
    });
    setErrors(fieldErrors);
    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError('');
    if (!validate()) return;

    setIsLoading(true);
    try {
      // 1. Create Supabase account
      const { error: signUpError } = await signUp(email, password, displayName);
      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          setServerError('An account with this email already exists. Please sign in instead.');
        } else {
          setServerError(signUpError.message);
        }
        setIsLoading(false);
        return;
      }

      // 2. Send welcome email (fire and forget)
      supabase.functions.invoke('send-welcome-email', {
        body: { email, displayName }
      }).catch(() => {});

      // 3. Create Stripe Checkout session with their email pre-filled
      const { data, error: stripeError } = await supabase.functions.invoke('create-checkout-session', {
        body: { priceId: planInfo.priceId, email },
      });

      if (stripeError || !data?.url) {
        // Account created — fall back to login so they can pay later
        navigate('/login?checkout=pending');
        return;
      }

      // 4. Redirect to Stripe Checkout
      window.location.href = data.url;

    } catch (err) {
      setServerError('Something went wrong. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[100svh] relative bg-background overflow-hidden flex flex-col">
      <ThemeToggle />

      {/* Back to pricing */}
      <motion.button
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
        onClick={() => navigate('/pricing')}
        className="absolute left-4 z-50 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        style={{ top: 'calc(1rem + env(safe-area-inset-top, 0px))' }}
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </motion.button>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">

        {/* Selected plan pill */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mb-6 px-4 py-1.5 rounded-full border border-border bg-card/50 text-sm text-muted-foreground"
        >
          {planInfo.label} plan — <span className="text-foreground font-medium">{planInfo.price}</span>
          <span className="text-muted-foreground/60 ml-1">· 7-day free trial</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="w-full max-w-sm"
        >
          <h1 className="font-display text-3xl text-center mb-1 tracking-wide">Create Account</h1>
          <p className="text-center text-sm text-muted-foreground mb-8">
            Your details, then straight to payment.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Display Name */}
            <div className="space-y-1">
              <Input
                id="register-display-name"
                type="text"
                placeholder="Display Name"
                value={displayName}
                onChange={e => { setDisplayName(e.target.value); setErrors(p => ({ ...p, displayName: undefined })); }}
                className={`h-12 text-center bg-card/50 border-border/50 focus:border-foreground/30 ${errors.displayName ? 'border-destructive' : ''}`}
                autoComplete="name"
                disabled={isLoading}
              />
              {errors.displayName && <p className="text-xs text-destructive text-center">{errors.displayName}</p>}
            </div>

            {/* Email */}
            <div className="space-y-1">
              <Input
                id="register-email"
                type="email"
                placeholder="Email address"
                value={email}
                onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: undefined })); }}
                className={`h-12 text-center bg-card/50 border-border/50 focus:border-foreground/30 ${errors.email ? 'border-destructive' : ''}`}
                autoComplete="email"
                disabled={isLoading}
              />
              {errors.email && <p className="text-xs text-destructive text-center">{errors.email}</p>}
            </div>

            {/* Password */}
            <div className="space-y-1">
              <Input
                id="register-password"
                type="password"
                placeholder="Password (min. 8 characters)"
                value={password}
                onChange={e => { setPassword(e.target.value); setErrors(p => ({ ...p, password: undefined })); }}
                className={`h-12 text-center bg-card/50 border-border/50 focus:border-foreground/30 ${errors.password ? 'border-destructive' : ''}`}
                autoComplete="new-password"
                disabled={isLoading}
              />
              {errors.password && <p className="text-xs text-destructive text-center">{errors.password}</p>}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1">
              <Input
                id="register-confirm-password"
                type="password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={e => { setConfirmPassword(e.target.value); setErrors(p => ({ ...p, confirmPassword: undefined })); }}
                className={`h-12 text-center bg-card/50 border-border/50 focus:border-foreground/30 ${errors.confirmPassword ? 'border-destructive' : ''}`}
                autoComplete="new-password"
                disabled={isLoading}
              />
              {errors.confirmPassword && <p className="text-xs text-destructive text-center">{errors.confirmPassword}</p>}
            </div>

            {/* Terms checkbox */}
            <div className="space-y-1">
              <label className={`flex items-start gap-3 cursor-pointer rounded-xl p-3 border transition-colors ${errors.agreed ? 'border-destructive bg-destructive/5' : 'border-border/50 bg-card/30 hover:bg-card/50'}`}>
                <input
                  id="register-terms"
                  type="checkbox"
                  checked={agreed}
                  onChange={e => { setAgreed(e.target.checked); setErrors(p => ({ ...p, agreed: undefined })); }}
                  className="mt-0.5 accent-foreground w-4 h-4 shrink-0"
                  disabled={isLoading}
                />
                <span className="text-sm text-muted-foreground leading-snug">
                  I agree to the{' '}
                  <Link to="/terms" target="_blank" className="text-foreground underline underline-offset-2 hover:opacity-80">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link to="/privacy" target="_blank" className="text-foreground underline underline-offset-2 hover:opacity-80">
                    Privacy Policy
                  </Link>
                </span>
              </label>
              {errors.agreed && <p className="text-xs text-destructive text-center">{errors.agreed}</p>}
            </div>

            {/* Server error */}
            {serverError && (
              <p className="text-sm text-destructive text-center bg-destructive/10 rounded-lg px-3 py-2">
                {serverError}
              </p>
            )}

            <Button
              id="register-submit"
              type="submit"
              disabled={isLoading}
              className="w-full h-12 text-base font-display tracking-widest uppercase"
            >
              {isLoading ? 'Creating account...' : 'Continue to Payment →'}
            </Button>

            <p className="text-center text-xs text-muted-foreground pt-1">
              Already have an account?{' '}
              <Link to="/login" className="text-foreground underline underline-offset-2">
                Sign in
              </Link>
            </p>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
