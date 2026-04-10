/**
 * Streamdown Interactive Controls Configuration
 *
 * Configures copy, download, fullscreen buttons for code blocks,
 * tables, and mermaid diagrams. Controls automatically disable
 * when isAnimating={true} during streaming.
 */

export const streamdownControls = {
  /** Show copy button on code blocks */
  code: true,
  /** Show download button on tables */
  table: true,
  /** Mermaid diagram controls */
  mermaid: {
    download: true,
    copy: true,
    fullscreen: true,
    panZoom: true,
  },
} as const;
