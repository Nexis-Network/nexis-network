"use client";

import { startTransition, useCallback, useEffect, useMemo, useState } from "react";
import { useReducedMotion } from "motion/react";

import {
  resolveComposerBackgroundModel,
  resolveComposerBackgroundPalette,
  type ModelGrainientPalette,
} from "../utils/model-grainient-palette";

type ComposerBackgroundTransitionState = {
  activeModelValue: string;
  previousModelValue: string | null;
  transitionKey: number;
};

export const COMPOSER_BACKGROUND_WIPE_DURATION_SECONDS = 0.32;

export function useComposerBackgroundTransition(modelValue?: string) {
  const prefersReducedMotion = useReducedMotion();
  const resolvedModelValue = useMemo(
    () => resolveComposerBackgroundModel(modelValue),
    [modelValue],
  );
  const [state, setState] = useState<ComposerBackgroundTransitionState>(() => ({
    activeModelValue: resolvedModelValue,
    previousModelValue: null,
    transitionKey: 0,
  }));

  useEffect(() => {
    if (resolvedModelValue === state.activeModelValue) {
      return;
    }

    startTransition(() => {
      setState((currentState) => {
        if (resolvedModelValue === currentState.activeModelValue) {
          return currentState;
        }

        return {
          activeModelValue: resolvedModelValue,
          previousModelValue: prefersReducedMotion
            ? null
            : currentState.activeModelValue,
          transitionKey: currentState.transitionKey + 1,
        };
      });
    });
  }, [prefersReducedMotion, resolvedModelValue, state.activeModelValue]);

  const clearTransition = useCallback(() => {
    setState((currentState) => {
      if (!currentState.previousModelValue) {
        return currentState;
      }

      return {
        ...currentState,
        previousModelValue: null,
      };
    });
  }, []);

  const activePalette = useMemo<ModelGrainientPalette>(
    () => resolveComposerBackgroundPalette(state.activeModelValue),
    [state.activeModelValue],
  );
  const previousPalette = useMemo<ModelGrainientPalette | null>(
    () =>
      state.previousModelValue
        ? resolveComposerBackgroundPalette(state.previousModelValue)
        : null,
    [state.previousModelValue],
  );

  return {
    activePalette,
    previousPalette,
    isTransitioning: Boolean(previousPalette) && !prefersReducedMotion,
    transitionKey: state.transitionKey,
    clearTransition,
  };
}
