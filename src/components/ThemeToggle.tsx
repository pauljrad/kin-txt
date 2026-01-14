import { Moon, Sun } from 'lucide-react';
import { forwardRef, useEffect, useState } from 'react';

type ThemeToggleProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

export const ThemeToggle = forwardRef<HTMLButtonElement, ThemeToggleProps>(
  ({ className, style, ...props }, ref) => {
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
      // Check for saved preference or system preference
      const saved = localStorage.getItem('theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

      if (saved === 'dark' || (!saved && prefersDark)) {
        setIsDark(true);
        document.documentElement.classList.add('dark');
      }
    }, []);

    const toggle = () => {
      setIsDark((prev) => {
        const next = !prev;
        if (next) {
          document.documentElement.classList.add('dark');
          localStorage.setItem('theme', 'dark');
        } else {
          document.documentElement.classList.remove('dark');
          localStorage.setItem('theme', 'light');
        }
        return next;
      });
    };

    return (
      <button
        ref={ref}
        onClick={(e) => {
          props.onClick?.(e);
          if (!e.defaultPrevented) toggle();
        }}
        className={
          className ??
          'fixed right-4 z-50 p-3 rounded-full bg-card/80 backdrop-blur-sm border border-border/50 hover:bg-card transition-colors'
        }
        style={{ top: 'calc(1rem + env(safe-area-inset-top, 0px))', ...style }}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        type="button"
        {...props}
      >
        {isDark ? (
          <Sun className="w-5 h-5 text-foreground" />
        ) : (
          <Moon className="w-5 h-5 text-foreground" />
        )}
      </button>
    );
  }
);

ThemeToggle.displayName = 'ThemeToggle';

