// Stub component - HeroIllustration
export function HeroIllustration() {
  return (
    <div className="flex items-center justify-center p-8">
      <svg className="h-48 w-64 text-muted-foreground/30" viewBox="0 0 200 150" fill="currentColor">
        <rect x="20" y="20" width="160" height="110" rx="8" stroke="currentColor" strokeWidth="2" fill="none" />
        <rect x="35" y="40" width="80" height="10" rx="2" />
        <rect x="35" y="60" width="130" height="6" rx="1" opacity="0.5" />
        <rect x="35" y="75" width="110" height="6" rx="1" opacity="0.5" />
        <rect x="35" y="100" width="50" height="15" rx="3" />
      </svg>
    </div>
  );
}
