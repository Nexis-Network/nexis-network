export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 py-24 text-center">
      <p className="text-muted-foreground text-sm font-regular uppercase tracking-wide">404</p>
      <h1 className="text-foreground text-3xl font-bold sm:text-5xl">Page not found</h1>
      <p className="max-w-md text-muted-foreground text-base">
        The page you&apos;re looking for doesn&apos;t exist or may have been moved. Check the URL or return to the dashboard.
      </p>
    </div>
  );
}





