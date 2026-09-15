from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"Expected snippet not found in {path}: {old[:90]!r}")
    p.write_text(text.replace(old, new, 1))


replace_once(
    "src/App.tsx",
    'import { CreatorHomeShortcut } from "@/components/CreatorHomeShortcut";\n',
    "",
)
replace_once(
    "src/App.tsx",
    '''        <Route
          path="/home"
          element={(
            <div className="relative min-h-[100svh]">
              <CreatorHomeShortcut />
              <Index />
            </div>
          )}
        />''',
    '''        <Route
          path="/home"
          element={<Index />}
        />''',
)

replace_once(
    "src/pages/Index.tsx",
    "import { AnimatedTitle } from '@/components/AnimatedTitle';\n",
    "import { AnimatedTitle } from '@/components/AnimatedTitle';\nimport { CreatorHomeShortcut } from '@/components/CreatorHomeShortcut';\n",
)
replace_once(
    "src/pages/Index.tsx",
    '''              <AnimatedTitle enabled={hasCompletedOnboarding !== false && !showStartupSplash} />

              <div className="w-full space-y-6 mt-8">''',
    '''              <AnimatedTitle enabled={hasCompletedOnboarding !== false && !showStartupSplash} />
              <CreatorHomeShortcut />

              <div className="w-full space-y-5 mt-4">''',
)
replace_once(
    "src/pages/Index.tsx",
    '<div className="flex justify-center gap-2 sm:gap-4 mb-4">',
    '<div className="grid grid-cols-3 gap-2 w-full max-w-lg mx-auto mb-2">',
)

p = Path("src/pages/Index.tsx")
text = p.read_text()
old_button = "className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${activeTab === "
new_button = "className={`min-w-0 h-10 flex items-center justify-center gap-1.5 px-2 sm:px-3 rounded-xl text-[13px] sm:text-sm whitespace-nowrap transition-all ${activeTab === "
if text.count(old_button) != 3:
    raise SystemExit(f"Expected 3 nav button class snippets, found {text.count(old_button)}")
text = text.replace(old_button, new_button)
text = text.replace(
    '<FileText className="w-4 h-4" />\n                    <span>My TXTs</span>',
    '<FileText className="w-3.5 h-3.5 shrink-0" />\n                    <span className="whitespace-nowrap leading-none">My TXTs</span>',
    1,
)
text = text.replace(
    '<Library className="w-4 h-4" />\n                    <span>Ebooks</span>',
    '<Library className="w-3.5 h-3.5 shrink-0" />\n                    <span className="whitespace-nowrap leading-none">Ebooks</span>',
    1,
)
text = text.replace(
    '<Newspaper className="w-4 h-4" />\n                    <span>Journal</span>',
    '<Newspaper className="w-3.5 h-3.5 shrink-0" />\n                    <span className="whitespace-nowrap leading-none">Journal</span>',
    1,
)
p.write_text(text)

p = Path("src/components/TextInput.tsx")
text = p.read_text()
text = text.replace(
    '<div className="flex justify-center gap-2">',
    '<div className="grid grid-cols-3 gap-2 w-full max-w-lg mx-auto">',
    1,
)
old = "className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all duration-300 ${mode === "
new = "className={`min-w-0 h-9 flex items-center justify-center gap-1.5 px-2 rounded-lg text-[12px] sm:text-sm whitespace-nowrap transition-all duration-300 ${mode === "
if text.count(old) != 3:
    raise SystemExit(f"Expected 3 TextInput button classes, found {text.count(old)}")
text = text.replace(old, new)
p.write_text(text)

Path("src/components/CreatorHomeShortcut.tsx").write_text('''import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useCreatorAccess } from '@/hooks/useCreatorAccess';

export function CreatorHomeShortcut() {
  const navigate = useNavigate();
  const { isCreator, loading } = useCreatorAccess();

  if (loading || !isCreator) return null;

  return (
    <div className="mt-2.5 flex w-full justify-center">
      <motion.button
        onClick={() => navigate('/create')}
        whileTap={{ scale: 0.96 }}
        whileHover={{ scale: 1.025 }}
        animate={{
          boxShadow: [
            '0 0 0px rgba(255,255,255,0)',
            '0 0 14px rgba(255,255,255,0.10)',
            '0 0 0px rgba(255,255,255,0)',
          ],
        }}
        transition={{
          boxShadow: { duration: 3.2, repeat: Infinity, ease: 'easeInOut' },
          scale: { duration: 0.16 },
        }}
        className="group inline-flex h-8 items-center gap-2 rounded-full border border-foreground/20 bg-secondary/35 px-3 text-foreground backdrop-blur-sm transition-colors hover:bg-secondary/65"
        aria-label="Open KiN-Creator studio"
      >
        <span className="flex h-4 items-center font-display text-[11px] leading-none tracking-[-0.04em]" aria-hidden="true">
          <span>K</span>
          <span className="relative mx-[1px] inline-flex h-4 w-[5px] justify-center">
            <motion.span
              className="absolute top-[1px] h-[2.5px] w-[2.5px] rounded-full bg-current"
              animate={{ y: [0, -3, 0], opacity: [0.55, 1, 0.55] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.65 }}
            />
            <motion.span
              className="absolute bottom-[1px] h-[9px] w-[1.5px] rounded-full bg-current"
              animate={{ scaleY: [1, 0.7, 1] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.65 }}
              style={{ transformOrigin: 'bottom' }}
            />
          </span>
          <span>N</span>
          <motion.span
            className="mx-[1px] inline-block h-[1.5px] w-[4px] rounded-full bg-current"
            animate={{ x: [0, 1.5, -1, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.8 }}
          />
        </span>
        <span className="font-display text-[10px] font-medium uppercase tracking-[0.18em] leading-none">Create</span>
      </motion.button>
    </div>
  );
}
''')

Path(".github/workflows/one-time-mobile-layout-fix.yml").unlink(missing_ok=True)
Path("scripts/one_time_mobile_layout_fix.py").unlink(missing_ok=True)
