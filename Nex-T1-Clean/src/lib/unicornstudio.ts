export const UNICORN_SCRIPT_SRC =
  "https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v1.5.3/dist/unicornStudio.umd.js";

export type UnicornStudioGlobal = {
  init?: () => void | Promise<void>;
  renderAll?: () => void;
  destroy?: () => void | Promise<void>;
  isInitialized?: boolean;
};

export const getUnicornStudio = (): UnicornStudioGlobal | undefined => {
  if (typeof window === "undefined") {
    return undefined;
  }

  return (window).UnicornStudio as UnicornStudioGlobal | undefined;
};

let unicornScriptPromise: Promise<void> | null = null;
let unicornInitPromise: Promise<UnicornStudioGlobal | undefined> | null = null;

export const loadUnicornStudioScript = (): Promise<void> => {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  if (getUnicornStudio()?.init) {
    return Promise.resolve();
  }

  if (unicornScriptPromise) {
    return unicornScriptPromise;
  }

  unicornScriptPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[data-unicorn-studio="true"]',
    );
    if (existingScript) {
      if (getUnicornStudio()?.init) {
        resolve();
        return;
      }

      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener(
        "error",
        () => {
          unicornScriptPromise = null;
          reject(new Error("Failed to load Unicorn Studio script"));
        },
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.src = UNICORN_SCRIPT_SRC;
    script.async = true;
    script.dataset.unicornStudio = "true";
    script.onload = () => resolve();
    script.onerror = () => {
      unicornScriptPromise = null;
      reject(new Error("Failed to load Unicorn Studio script"));
    };
    document.head.appendChild(script);
  });

  return unicornScriptPromise;
};

export const ensureUnicornStudioReady = async (): Promise<UnicornStudioGlobal | undefined> => {
  if (typeof window === "undefined") {
    return undefined;
  }

  if (unicornInitPromise) {
    return unicornInitPromise;
  }

  unicornInitPromise = (async () => {
    await loadUnicornStudioScript();
    const unicorn = getUnicornStudio();
    const init = unicorn?.init;
    if (!init) {
      return unicorn;
    }

    if (unicorn.isInitialized) {
      return unicorn;
    }

    const initResult = init();
    if (initResult && typeof (initResult as Promise<void>).then === "function") {
      await initResult;
    }

    if (unicorn) {
      unicorn.isInitialized = true;
    }

    return unicorn;
  })();

  try {
    return await unicornInitPromise;
  } catch (error) {
    unicornInitPromise = null;
    throw error;
  }
};

export const isWebGLAvailable = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl") || canvas.getContext("experimental-webgl"));
  } catch {
    return false;
  }
};
