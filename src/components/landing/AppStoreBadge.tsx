const APP_STORE_URL = 'https://apps.apple.com/us/app/kin-txt/id6785441989';

/**
 * Small fixed corner link to the App Store listing. Uses mix-blend-difference,
 * the same trick as the hero title, so it self-inverts against whatever
 * section is scrolled behind it without needing per-section color props.
 */
export function AppStoreBadge() {
  return (
    <a
      href={APP_STORE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed z-[70] flex items-center gap-1.5 border border-white/25 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-white mix-blend-difference transition-colors hover:border-white/60"
      style={{
        top: 'calc(1rem + env(safe-area-inset-top, 0px))',
        right: 'calc(1rem + env(safe-area-inset-right, 0px))',
      }}
    >
      <svg viewBox="0 0 384 512" className="h-3 w-3 fill-current" aria-hidden="true">
        <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141 4 184.8 4 273.2c0 25.9 4.7 52.7 14.1 80.3 12.6 36.7 58.1 126.7 105.7 125.2 24.8-.6 42.3-17.6 74.6-17.6 31.4 0 47.6 17.6 75.4 17.6 48-.7 89.2-82.7 101.2-119.5-64.4-30.3-56.3-88.8-56.3-90.5zM256.4 88.9c26.7-31.8 24.3-60.8 23.5-71.2-23.6 1.4-51 16.4-66.6 34.8-17.2 19.8-27.3 44.3-25.3 71 25.7 2 49.4-11 68.4-34.6z"/>
      </svg>
      App Store
    </a>
  );
}
