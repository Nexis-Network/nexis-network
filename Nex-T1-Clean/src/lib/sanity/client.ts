import { createClient, type ClientConfig } from "next-sanity";
import { createImageUrlBuilder } from "@sanity/image-url";

// Sanity configuration from env; leave empty string when missing so we can guard usage.
export const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "";
export const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
export const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2024-01-01";

export const sanityConfigured = Boolean(projectId && dataset);

const baseConfig: ClientConfig = {
    projectId: projectId || "missing-project-id",
    dataset,
    apiVersion,
    useCdn: false, // Set to false for fresh data, true for production cache
};

// Create a client regardless, but consumers should check `sanityConfigured`
// and preferably short-circuit when false to avoid hitting a placeholder host.
export const client = createClient(baseConfig);

const builder = createImageUrlBuilder(client);

export function urlFor(source: UntypedJson) {
    return builder.image(source);
}
