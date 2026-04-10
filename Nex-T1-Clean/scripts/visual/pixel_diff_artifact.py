#!/usr/bin/env python3
"""Compute deterministic pixel-diff metrics for artifact panel screenshots."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Tuple

import numpy as np
from PIL import Image


def parse_box(raw: str) -> Tuple[int, int, int, int]:
  parts = [part.strip() for part in raw.split(",")]
  if len(parts) != 4:
    raise ValueError("box must be provided as x,y,w,h")
  x, y, w, h = (int(value) for value in parts)
  if w <= 0 or h <= 0:
    raise ValueError("box width and height must be > 0")
  return x, y, w, h


def crop_region(image: Image.Image, mode: str, box: str | None) -> Image.Image:
  if mode == "none":
    return image

  if mode == "right-half":
    width, height = image.size
    x = width // 2
    return image.crop((x, 0, width, height))

  if mode == "box":
    if not box:
      raise ValueError("--box is required when crop mode is 'box'")
    x, y, w, h = parse_box(box)
    return image.crop((x, y, x + w, y + h))

  raise ValueError(f"unsupported crop mode: {mode}")


def main() -> int:
  parser = argparse.ArgumentParser(description=__doc__)
  parser.add_argument("--reference", default="artifact.png", help="Path to reference image.")
  parser.add_argument("--candidate", required=True, help="Path to candidate image.")
  parser.add_argument(
    "--crop-mode",
    default="right-half",
    choices=["none", "right-half", "box"],
    help="Crop mode applied to both images before diffing.",
  )
  parser.add_argument(
    "--box",
    default=None,
    help="Crop box x,y,w,h used when crop-mode=box.",
  )
  parser.add_argument(
    "--allow-resize",
    action="store_true",
    help="Resize candidate crop to reference crop dimensions before diff.",
  )
  parser.add_argument(
    "--threshold",
    type=float,
    default=None,
    help="Optional max allowed metric value (0..1). Exits non-zero if exceeded.",
  )
  parser.add_argument(
    "--metric",
    default="diff_ratio",
    choices=["diff_ratio", "mae_ratio"],
    help="Metric used with --threshold.",
  )
  parser.add_argument(
    "--diff-out",
    default=None,
    help="Optional path to write an absolute-difference image.",
  )
  args = parser.parse_args()

  reference_image = Image.open(args.reference).convert("RGBA")
  candidate_image = Image.open(args.candidate).convert("RGBA")

  reference_crop = crop_region(reference_image, args.crop_mode, args.box)
  candidate_crop = crop_region(candidate_image, args.crop_mode, args.box)

  if candidate_crop.size != reference_crop.size:
    if not args.allow_resize:
      payload = {
        "status": "size_mismatch",
        "reference_size": reference_crop.size,
        "candidate_size": candidate_crop.size,
      }
      print(json.dumps(payload, sort_keys=True))
      return 2
    candidate_crop = candidate_crop.resize(reference_crop.size, Image.Resampling.BICUBIC)

  reference_np = np.array(reference_crop, dtype=np.int16)
  candidate_np = np.array(candidate_crop, dtype=np.int16)

  absolute_diff = np.abs(reference_np - candidate_np)
  different_mask = np.any(absolute_diff > 0, axis=2)

  total_pixels = int(reference_np.shape[0] * reference_np.shape[1])
  diff_pixels = int(different_mask.sum())
  diff_ratio = diff_pixels / total_pixels if total_pixels else 0.0
  mae_ratio = float(absolute_diff.mean() / 255.0)

  payload = {
    "status": "ok",
    "reference_size": reference_crop.size,
    "candidate_size": candidate_crop.size,
    "total_pixels": total_pixels,
    "diff_pixels": diff_pixels,
    "diff_ratio": round(diff_ratio, 6),
    "mae_ratio": round(mae_ratio, 6),
  }

  if args.diff_out:
    diff_image = Image.fromarray(absolute_diff.astype(np.uint8), mode="RGBA")
    diff_path = Path(args.diff_out)
    diff_path.parent.mkdir(parents=True, exist_ok=True)
    diff_image.save(diff_path)
    payload["diff_image"] = str(diff_path)

  metric_value = diff_ratio if args.metric == "diff_ratio" else mae_ratio
  payload["threshold_metric"] = args.metric
  payload["threshold_value"] = round(metric_value, 6)

  print(json.dumps(payload, sort_keys=True))

  if args.threshold is not None and metric_value > args.threshold:
    return 1
  return 0


if __name__ == "__main__":
  raise SystemExit(main())
