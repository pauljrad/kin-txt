import { useState, useEffect, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AnimatedTitle } from '@/components/AnimatedTitle';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { usePullGesture } from '@/hooks/usePullGesture';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

const Login = forwardRef<HTMLDivElement>((_, ref) => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading, signIn, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [isPongGameActive, setIsPongGameActive] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      navigate('/home');
    }
  }, [user, authLoading, navigate]);

  // Use shared pull-down gesture hook
  usePullGesture(true);

  // Capture shared link ID if present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shareId = params.get('share_id');
    if (shareId) {
      localStorage.setItem('pending_share_id', shareId);
      toast.info("Login to view the shared TXT");
    }
  }, []);

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};

    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      newErrors.email = emailResult.error.errors[0].message;
    }

    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      newErrors.password = passwordResult.error.errors[0].message;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle email verification redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('verified') === 'true') {
      toast.success("Email address verified", {
        description: "You have been successfully verified.",
        duration: 5000, // Make it last longer
      });
      // Clean up the URL
      window.history.replaceState({}, '', '/');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      if (isSignUp) {
        // We handle the verification link manually in the edge function, 
        // but we pass the redirect URL here just in case standard auth flows are used
        const { error } = await signUp(email, password, displayName || undefined);
        if (error) {
          if (error.message.includes('already registered')) {
            toast.error('This email is already registered. Please sign in instead.');
          } else {
            toast.error(error.message);
          }
          setIsLoading(false);
          return;
        }

        // Get user info for notifications
        const { data: { user: newUser } } = await supabase.auth.getUser();

        // Send welcome email (fire and forget - don't block signup)
        supabase.functions.invoke('send-welcome-email', {
          body: {
            email,
            displayName: displayName || undefined
          }
        }).catch(err => console.error('Welcome email failed:', err));

        // Send admin notification (fire and forget - don't block signup)
        if (newUser) {
          supabase.functions.invoke('notify-admin-signup', {
            body: {
              email,
              displayName: displayName || undefined,
              userId: newUser.id,
              createdAt: newUser.created_at
            }
          }).catch(err => console.error('Admin notification failed:', err));
        }

        toast.success('Account created! Please check your email to verify your account.');

        // Force sign out to ensure they verify email first
        await supabase.auth.signOut();

        // Reset form or show specific UI
        setIsSignUp(false);
        setPassword('');
        // navigate('/home') removed to prevent auto-login
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast.error('Invalid email or password');
          } else {
            toast.error(error.message);
          }
          setIsLoading(false);
          return;
        }
        toast.success('Welcome back to KiN-TXT');
        navigate('/home');
      }
    } catch (err) {
      toast.error('An unexpected error occurred');
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-[100svh] relative bg-background overflow-hidden flex flex-col">
      <ThemeToggle />

      <div className="flex-1 flex flex-col items-center justify-center px-4">
        {/* Animated Title */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-center mb-12"
        >
          <AnimatedTitle onGameStateChange={setIsPongGameActive} />
        </motion.div>

        {/* Login/Signup Form */}
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{
            opacity: isPongGameActive ? 0 : 1,
            y: 0,
            filter: isPongGameActive ? 'blur(6px)' : 'blur(0px)',
          }}
          transition={{ duration: 0.4, delay: isPongGameActive ? 0 : 0.4 }}
          onSubmit={handleSubmit}
          className="w-full max-w-sm space-y-4"
          style={{ pointerEvents: isPongGameActive ? 'none' : 'auto' }}
        >
          {isSignUp && (
            <div className="space-y-1">
              <Input
                type="text"
                placeholder="Display Name (optional)"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="h-12 text-center bg-card/50 border-border/50 focus:border-foreground/30"
                autoComplete="name"
              />
            </div>
          )}

          <div className="space-y-1">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErrors(prev => ({ ...prev, email: undefined }));
              }}
              className={`h-12 text-center bg-card/50 border-border/50 focus:border-foreground/30 ${errors.email ? 'border-destructive' : ''}`}
              autoComplete="email"
            />
            {errors.email && (
              <p className="text-xs text-destructive text-center">{errors.email}</p>
            )}
          </div>

          <div className="space-y-1">
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setErrors(prev => ({ ...prev, password: undefined }));
              }}
              className={`h-12 text-center bg-card/50 border-border/50 focus:border-foreground/30 ${errors.password ? 'border-destructive' : ''}`}
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
            />
            {errors.password && (
              <p className="text-xs text-destructive text-center">{errors.password}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isLoading || !email || !password}
            className="w-full h-12 text-base"
          >
            {isLoading ? (isSignUp ? 'Creating account...' : 'Signing in...') : (isSignUp ? 'Create Account' : 'Sign In')}
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setErrors({});
              }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>
        </motion.form>
      </div>
    </div>
  );
});

Login.displayName = 'Login';

export default Login;
