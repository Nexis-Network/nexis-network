declare module 'papaparse';
declare module 'cheerio';

/**
 * Escape-hatch type for untyped JSON payloads that flow through serialization
 * boundaries (Redis, Supabase JSONB columns, third-party API responses, etc.).
 *
 * Prefer narrower types where the shape is known; use UntypedJson only when
 * the schema is genuinely unknown or when interfacing with loosely-typed APIs.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UntypedJson = any;

interface Window {
  google?: {
    accounts?: {
      oauth2?: {
        initCodeClient(config: {
          client_id: string;
          scope: string;
          ux_mode?: "popup" | "redirect";
          redirect_uri?: string;
          callback: (response: {
            code?: string;
            scope?: string;
            error?: string;
            error_description?: string;
          }) => void;
          error_callback?: (error: { type?: string }) => void;
        }): {
          requestCode: () => void;
        };
      };
    };
  };
}
