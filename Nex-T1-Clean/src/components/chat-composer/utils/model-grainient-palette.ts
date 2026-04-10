export type ModelGrainientPalette = {
  color1: string;
  color2: string;
  color3: string;
};

export const DEFAULT_MODEL_GRAINIENT_KEY = "nex-t1-free";

export const MODEL_GRAINIENT_COLORS: Record<string, ModelGrainientPalette> = {
  "nex-t1-free": {
    color1: "#34b4f4",
    color2: "#1268f3",
    color3: "#4367f9",
  },
  "nex-t1-pro": {
    color1: "#34b4f4",
    color2: "#1268f3",
    color3: "#4367f9",
  },
  "nex-t1-ultra": {
    color1: "#72a7fd",
    color2: "#092ff1",
    color3: "#0084ff",
  },
  "nex-build": {
    color1: "#88f29d",
    color2: "#4eef68",
    color3: "#92fd7c",
  },
  "nex-degen": {
    color1: "#fbbf18",
    color2: "#c24e00",
    color3: "#ff9500",
  },
};

export function resolveComposerBackgroundModel(modelValue?: string): string {
  if (modelValue && MODEL_GRAINIENT_COLORS[modelValue]) {
    return modelValue;
  }

  return DEFAULT_MODEL_GRAINIENT_KEY;
}

export function resolveComposerBackgroundPalette(
  modelValue?: string,
): ModelGrainientPalette {
  return MODEL_GRAINIENT_COLORS[resolveComposerBackgroundModel(modelValue)];
}
