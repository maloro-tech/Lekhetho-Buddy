export function Mark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" aria-hidden="true" className="shrink-0">
      <rect width="36" height="36" rx="12" fill="#F5F36A" />
      <path
        d="M9 23c2.4-7 6.2-10.5 9-10.5S24.6 16 27 23"
        fill="none"
        stroke="#171717"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="18" cy="14.5" r="1.5" fill="#171717" />
    </svg>
  );
}

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <Mark size={compact ? 32 : 36} />
      <span className="truncate text-[16px] font-semibold tracking-[-0.03em] text-ink">
        Lekhetho{compact ? "" : " Buddy"}
      </span>
    </span>
  );
}
