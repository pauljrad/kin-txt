import { readFileSync, writeFileSync } from 'fs';

const path = 'src/components/KineticPlayer.tsx';
let content = readFileSync(path, 'utf8');

// 1. Add scrubPercentage state
content = content.replace(
  'const [isDragging, setIsDragging] = useState(false);',
  'const [isDragging, setIsDragging] = useState(false);\n  const [scrubPercentage, setScrubPercentage] = useState<number | null>(null);'
);

// 2. Modify handleProgressBarInteraction
content = content.replace(
  /const handleProgressBarInteraction = useCallback\(\(e: React\.MouseEvent \| React\.TouchEvent\) => \{[\s\S]*?seekToIndex\(targetIndex\);\n  \}, \[totalWords, seekToIndex\]\);/,
  `const handleProgressBarInteraction = useCallback((e: React.MouseEvent | React.TouchEvent, isFinal: boolean = false) => {
    if (!progressBarRef.current) return;

    const rect = progressBarRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as any).clientX;
    const percentage = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    
    if (isFinal) {
      const targetIndex = Math.floor(percentage * (totalWords - 1));
      seekToIndex(targetIndex);
    } else {
      setScrubPercentage(percentage);
    }
  }, [totalWords, seekToIndex]);`
);

// 3. Modify mouse down/move/up
content = content.replace(
  /const handleProgressMouseDown = \(e: React\.MouseEvent\) => \{[\s\S]*?\}, \[isDragging, handleProgressBarInteraction\]\);[\s\S]*?const handleProgressMouseUp = useCallback\(\(\) => \{[\s\S]*?\}, \[isDragging\]\);/,
  `const handleProgressMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    setIsPlaying(false);
    handleProgressBarInteraction(e, false);
  };

  const handleProgressMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    handleProgressBarInteraction(e as unknown as React.MouseEvent, false);
  }, [isDragging, handleProgressBarInteraction]);

  const handleProgressMouseUp = useCallback((e: MouseEvent) => {
    if (isDragging) {
      handleProgressBarInteraction(e as unknown as React.MouseEvent, true);
      setIsDragging(false);
      setScrubPercentage(null);
    }
  }, [isDragging, handleProgressBarInteraction]);`
);

// 4. Update the key to original
content = content.replace(
  /key=\{isDragging \? 'dragging-word' : `\$\{currentParagraph\}-\$\{currentWord\}`\}/,
  'key={`${currentParagraph}-${currentWord}`}'
);

// 5. Update progress bar visual to use scrubPercentage
content = content.replace(
  /const progress = totalWords > 0 \? \(getCurrentWordIndex\(\) \/ totalWords\) \* 100 : 0;/,
  'const readerProgress = totalWords > 0 ? (getCurrentWordIndex() / totalWords) * 100 : 0;\n  const progress = scrubPercentage !== null ? scrubPercentage * 100 : readerProgress;'
);

// 6. Update Word Counter in HUD to use scrubPercentage
content = content.replace(
  /\{getCurrentWordIndex\(\) \+ 1\} \/ \{totalWords\}/,
  '{scrubPercentage !== null ? Math.floor(scrubPercentage * (totalWords - 1)) + 1 : getCurrentWordIndex() + 1} / {totalWords}'
);

writeFileSync(path, content);
console.log('Fixed scrub states');
