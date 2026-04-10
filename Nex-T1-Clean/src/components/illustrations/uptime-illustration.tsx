// Stub component - UptimeIllustration
export function UptimeIllustration() {
  return (
    <div className="flex items-center justify-center p-4">
      <svg className="h-24 w-24 text-muted-foreground/30" viewBox="0 0 100 100" fill="currentColor">
        <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="2" fill="none" />
        <path d="M50 20 L50 50 L70 60" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
        <circle cx="50" cy="50" r="4" />
        <text x="50" y="85" fontSize="12" textAnchor="middle" fill="currentColor">99.9%</text>
      </svg>
    </div>
  );
}
