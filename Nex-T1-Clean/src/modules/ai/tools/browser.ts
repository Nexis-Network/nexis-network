import { createTool, createToolSchema } from "./create-tool";

/**
 * Tool for the AI to request reading the current page DOM.
 * This tool does NOT execute on the server.
 * It returns a special string that the Client Extension intercepts to execute locally.
 */
export const browserReadDomTool = createTool({
  description: "Read the current web page content (DOM) from the user's browser. Use this when the user asks about the page they are viewing.",
  schema: createToolSchema({}), // No parameters needed
  execute: async () => {
    // Return a special marker that the Client client-side hook will recognize
    return "__CLIENT_EXECUTE_TOOL:browser_read_dom__";
  },
});
