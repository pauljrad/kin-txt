import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type TextSize = 'small' | 'medium' | 'large';

interface TextSizeContextType {
  textSize: TextSize;
  setTextSize: (size: TextSize) => void;
  sizeMultiplier: number;
}

const TextSizeContext = createContext<TextSizeContextType | undefined>(undefined);

const SIZE_MULTIPLIERS: Record<TextSize, number> = {
  small: 0.65,
  medium: 0.75,
  large: 1.15,
};

export function TextSizeProvider({ children }: { children: ReactNode }) {
  const [textSize, setTextSize] = useState<TextSize>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('text-size');
      if (stored && (stored === 'small' || stored === 'medium' || stored === 'large')) {
        return stored as TextSize;
      }
    }
    return 'medium';
  });

  const sizeMultiplier = SIZE_MULTIPLIERS[textSize];

  useEffect(() => {
    localStorage.setItem('text-size', textSize);
    // Apply CSS custom property to document root
    document.documentElement.style.setProperty('--text-size-multiplier', String(sizeMultiplier));
  }, [textSize, sizeMultiplier]);

  // Initialize on mount
  useEffect(() => {
    document.documentElement.style.setProperty('--text-size-multiplier', String(sizeMultiplier));
  }, []);

  return (
    <TextSizeContext.Provider value={{ textSize, setTextSize, sizeMultiplier }}>
      {children}
    </TextSizeContext.Provider>
  );
}

export function useTextSize() {
  const context = useContext(TextSizeContext);
  if (context === undefined) {
    throw new Error('useTextSize must be used within a TextSizeProvider');
  }
  return context;
}
