

/**
 * Resolves an asset path to the appropriate URL.
 * In production, this points to the Cloudflare R2 custom domain.
 * In development, it falls back to the local public directory or a specific dev bucket.
 * 
 * @param path - The path to the asset (e.g., '/images/hero.png')
 * @returns The fully qualified URL
 */
export function getAssetUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  
  // You would typically add NEXT_PUBLIC_ASSETS_URL to your environment variables
  // e.g., https://assets.nex-t1.ai
  const assetDomain = process.env.NEXT_PUBLIC_ASSETS_URL;

  if (process.env.NODE_ENV === 'production' && assetDomain) {
    return `${assetDomain}/${cleanPath}`;
  }

  // Fallback for local development or if no R2 domain is configured
  return `/${cleanPath}`;
}
