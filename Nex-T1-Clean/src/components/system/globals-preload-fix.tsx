'use client'

import { useEffect } from 'react'

/**
 * In development some browsers log a warning when a preloaded global CSS chunk
 * is not promoted to a stylesheet quickly enough. This client-only helper
 * flips the auto-generated globals.css preload link to a stylesheet so the
 * preload is actually consumed and the warning disappears.
 *
 * Also suppresses the "Multiple instances of Three.js" warning that is
 * unavoidable when @splinetool/runtime (which pre-bundles Three.js v0.149)
 * coexists with the project's direct three@0.180 import.
 */
export function PromoteGlobalsPreload() {
  useEffect(() => {
    const promotePreloadLink = (link: HTMLLinkElement) => {
      const href = link.getAttribute('href') || ''

      if (link.getAttribute('as') === 'style') {
        // Target Next.js static CSS chunks — both Webpack (_next/static/css)
        // and Turbopack (_next/static/chunks/...*.css) paths
        if (!href.includes('_next/static/css') && !href.endsWith('.css')) return
        if (link.rel !== 'stylesheet') {
          link.rel = 'stylesheet'
        }
        return
      }

      if (link.getAttribute('as') === 'font') {
        if (!href.includes('.woff2')) return
        // Mark as consumed by setting crossorigin which triggers the browser
        // to consider the preload as used
        if (!link.crossOrigin) link.crossOrigin = 'anonymous'
      }
    }

    const promoteExistingPreloads = () => {
      const links = document.querySelectorAll<HTMLLinkElement>('link[rel="preload"]')
      links.forEach((link) => promotePreloadLink(link))
    }

    promoteExistingPreloads()

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLLinkElement)) return
          if (node.rel !== 'preload') return
          promotePreloadLink(node)
        })
      })
    })

    observer.observe(document.head, {
      childList: true,
      subtree: true,
    })

    // ── Suppress Three.js duplicate-instance warning ───────────────────
    // @splinetool/runtime pre-bundles Three.js v0.149 which cannot be
    // deduplicated from the project's three@0.180. The warning is cosmetic.
    // NOTE: This intentionally uses console.warn (not the logger) because
    // it needs to intercept browser-level console output from Three.js.
    const origWarn = console.warn
    console.warn = (...args: UntypedJson[]) => {
      if (typeof args[0] === 'string' && args[0].includes('Multiple instances of Three.js')) {
        return
      }
      origWarn.apply(console, args)
    }

    return () => {
      observer.disconnect()
      console.warn = origWarn
    }
  }, [])

  return null
}
