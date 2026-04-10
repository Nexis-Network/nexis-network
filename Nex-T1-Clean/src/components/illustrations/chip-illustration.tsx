// Stub component - ChipIllustration
export function ChipIllustration() {
  return (
    <div className="flex items-center justify-center p-4">
      <svg className="h-24 w-24 text-muted-foreground/30" viewBox="0 0 100 100" fill="currentColor">
        <rect x="25" y="25" width="50" height="50" rx="3" stroke="currentColor" strokeWidth="2" fill="none" />
        <rect x="35" y="35" width="30" height="30" rx="2" />
        {/* Pins */}
        <rect x="35" y="15" width="5" height="10" />
        <rect x="47" y="15" width="5" height="10" />
        <rect x="60" y="15" width="5" height="10" />
        <rect x="35" y="75" width="5" height="10" />
        <rect x="47" y="75" width="5" height="10" />
        <rect x="60" y="75" width="5" height="10" />
        <rect x="15" y="35" width="10" height="5" />
        <rect x="15" y="47" width="10" height="5" />
        <rect x="15" y="60" width="10" height="5" />
        <rect x="75" y="35" width="10" height="5" />
        <rect x="75" y="47" width="10" height="5" />
        <rect x="75" y="60" width="10" height="5" />
      </svg>
    </div>
  );
}
