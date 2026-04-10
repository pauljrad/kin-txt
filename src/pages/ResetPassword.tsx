import { useState, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AnimatedTitle } from '@/components/AnimatedTitle';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { usePullGesture } from '@/hooks/usePullGesture';
import { z } from 'zod';

const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

const ResetPassword = forwardRef<HTMLDivElement>((_, ref) => {
  const navigate = useNavigate();
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [isPongGameActive, setIsPongGameActive] = useState(false);

  // Use shared pull-down gesture hook
  usePullGesture(true);

  const validateForm = () => {
    const newErrors: { password?: string; confirm?: string } = {};

    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      newErrors.password = passwordResult.error.errors[0].message;
    }

    if (password !== confirmPassword) {
      newErrors.confirm = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const { error } = await updatePassword(password);
      if (error) {
        toast.error(error.message);
        setIsLoading(false);
        return;
      }
      
      toast.success('Password updated successfully! ✅', {
          description: "You can now log in with your new password.",
          duration: 5000,
      });
      
      // Delay navigation slightly to let the toast be seen
      setTimeout(() => {
        navigate('/login');
      }, 1500);
      
    } catch (err) {
      toast.error('An unexpected error occurred');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[100svh] relative bg-background overflow-hidden flex flex-col">
      <ThemeToggle />

      <div className="flex-1 flex flex-col items-center justify-start sm:justify-center px-4 pt-44 sm:pt-12">
        {/* Animated Title */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-center mb-12"
        >
          <AnimatedTitle onGameStateChange={setIsPongGameActive} />
        </motion.div>

        {/* Reset Password Form */}
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
          <div className="text-center mb-4">
            <h1 className="text-xl font-medium tracking-tight">Set New Password</h1>
            <p className="text-sm text-muted-foreground mt-1">Please enter your new password below.</p>
          </div>

          <div className="space-y-1">
            <Input
              type="password"
              placeholder="New Password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setErrors(prev => ({ ...prev, password: undefined }));
              }}
              className={`h-12 text-center bg-card/50 border-border/50 focus:border-foreground/30 ${errors.password ? 'border-destructive' : ''}`}
              autoComplete="new-password"
            />
            {errors.password && (
              <p className="text-xs text-destructive text-center">{errors.password}</p>
            )}
          </div>

          <div className="space-y-1">
            <Input
              type="password"
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setErrors(prev => ({ ...prev, confirm: undefined }));
              }}
              className={`h-12 text-center bg-card/50 border-border/50 focus:border-foreground/30 ${errors.confirm ? 'border-destructive' : ''}`}
              autoComplete="new-password"
            />
            {errors.confirm && (
              <p className="text-xs text-destructive text-center">{errors.confirm}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isLoading || !password || !confirmPassword}
            className="w-full h-12 text-base"
          >
            {isLoading ? 'Updating...' : 'Update Password'}
          </Button>

          <div className="text-center pt-1">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
            >
              Back to Login
            </button>
          </div>
        </motion.form>
      </div>
    </div>
  );
});

ResetPassword.displayName = 'ResetPassword';

export default ResetPassword;
