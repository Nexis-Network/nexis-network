import {
  useCallback,
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

import {
  TIMEFRAME_PRESETS,
  resolvePresetFromProps,
  type TimeframePreset,
} from "@/modules/prices/pyth/chart-config";

import { sortPresets } from "./pyth-chart.constants";

type UsePythChartSelectionArgs = {
  lookbackDays: number;
  resolutionMinutes: number;
};

type UsePythChartSelectionResult = {
  activeRangeDays: number;
  activeResolutionMinutes: number;
  availablePresets: TimeframePreset[];
  selectedPreset: TimeframePreset;
  setAvailablePresets: Dispatch<SetStateAction<TimeframePreset[]>>;
  setSelectedPreset: Dispatch<SetStateAction<TimeframePreset>>;
  syncToPreset: (preset: TimeframePreset) => void;
};

export function usePythChartSelection({
  lookbackDays,
  resolutionMinutes,
}: UsePythChartSelectionArgs): UsePythChartSelectionResult {
  const [activeResolutionMinutes, setActiveResolutionMinutes] = useState(resolutionMinutes);
  const [activeRangeDays, setActiveRangeDays] = useState(lookbackDays);
  const [selectedPreset, setSelectedPreset] = useState<TimeframePreset>(() =>
    resolvePresetFromProps(resolutionMinutes, lookbackDays),
  );
  const [availablePresets, setAvailablePresets] = useState<TimeframePreset[]>(() => [
    ...TIMEFRAME_PRESETS,
  ]);

  useEffect(() => {
    setActiveResolutionMinutes(resolutionMinutes);
    setActiveRangeDays(lookbackDays);
    setSelectedPreset(resolvePresetFromProps(resolutionMinutes, lookbackDays));
    setAvailablePresets([...TIMEFRAME_PRESETS]);
  }, [lookbackDays, resolutionMinutes]);

  const syncToPreset = useCallback((preset: TimeframePreset) => {
    setSelectedPreset(preset);
    setActiveResolutionMinutes(preset.resolutionMinutes);
    setActiveRangeDays(preset.rangeDays);
  }, []);

  return {
    activeRangeDays,
    activeResolutionMinutes,
    availablePresets,
    selectedPreset,
    setAvailablePresets,
    setSelectedPreset,
    syncToPreset,
  };
}

export { sortPresets };
