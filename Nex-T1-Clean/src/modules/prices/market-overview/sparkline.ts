export function buildZoomedOutSparkline(values: number[], targetPoints = 24): number[] {
  if (!Array.isArray(values) || values.length === 0) {
    return [];
  }

  if (values.length <= targetPoints) {
    return [...values];
  }

  const bucketSize = Math.ceil(values.length / targetPoints);
  const aggregated: number[] = [];

  for (let index = 0; index < values.length; index += bucketSize) {
    const bucket = values.slice(index, index + bucketSize);
    if (bucket.length === 0) continue;

    const first = bucket[0];
    const last = bucket[bucket.length - 1];

    aggregated.push(first);

    if (bucket.length > 2) {
      const min = Math.min(...bucket);
      const max = Math.max(...bucket);

      if (min !== first && min !== last) {
        aggregated.push(min);
      }

      if (max !== first && max !== last) {
        aggregated.push(max);
      }
    }

    if (bucket.length > 1) {
      aggregated.push(last);
    }
  }

  const ensureLastValue = (series: number[]) => {
    const lastOriginal = values[values.length - 1];
    if (series[series.length - 1] !== lastOriginal) {
      series.push(lastOriginal);
    }
    return series;
  };

  if (aggregated.length <= targetPoints) {
    return ensureLastValue(aggregated);
  }

  const step = Math.ceil(aggregated.length / targetPoints);
  const sampled: number[] = [];
  for (let index = 0; index < aggregated.length; index += step) {
    sampled.push(aggregated[index]);
  }

  return ensureLastValue(sampled);
}
