/** Marca de PlatLab: un matraz esquemático dibujado, sin emojis ni iconos genéricos. */
export function Wordmark({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 font-semibold tracking-[-0.02em] text-ink ${className ?? ''}`}>
      <svg viewBox="0 0 24 24" className="size-6" aria-hidden>
        <rect x="1" y="1" width="22" height="22" rx="6" fill="var(--color-action)" />
        <path
          d="M10 6.5h4M10.75 6.5v4.1L7.4 16.4a1.4 1.4 0 0 0 1.2 2.1h6.8a1.4 1.4 0 0 0 1.2-2.1l-3.35-5.8V6.5"
          fill="none"
          stroke="white"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M9 14.6h6" stroke="white" strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
      </svg>
      <span className={compact ? 'hidden sm:inline' : undefined}>PlatLab</span>
    </span>
  );
}
