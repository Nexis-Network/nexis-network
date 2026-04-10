// Stub component - CurrencyIllustration
export function CurrencyIllustration() {
  return (
    <div className="flex items-center justify-center p-4">
      <svg className="h-24 w-24 text-muted-foreground/30" viewBox="0 0 100 100" fill="currentColor">
        <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="4" fill="none" />
        <text x="50" y="65" fontSize="35" textAnchor="middle" fill="currentColor">$</text>
      </svg>
    </div>
  );
}
