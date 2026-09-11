import type { WatermarkMovement } from "@/admin/types";

export type WatermarkPoint = { x: number; y: number };

/**
 * Continuous diagonal loop (normalized 0–1), with margins so marks stay on-canvas.
 * Path: bottom-left → top-right → top-left → bottom-right → bottom-left
 */
export const CONTINUOUS_DIAGONAL_WAYPOINTS: WatermarkPoint[] = [
  { x: 0.12, y: 0.88 },
  { x: 0.88, y: 0.12 },
  { x: 0.12, y: 0.12 },
  { x: 0.88, y: 0.88 },
  { x: 0.12, y: 0.88 },
];

/** Seconds for one full continuous-diagonal circuit */
export const CONTINUOUS_DIAGONAL_PERIOD_SEC = 14;

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Smooth position along a closed polyline of waypoints.
 * `elapsedSec` advances forever; result loops without teleporting
 * (last waypoint equals first).
 */
export function interpolateWaypointPath(
  elapsedSec: number,
  waypoints: WatermarkPoint[],
  periodSec: number,
): WatermarkPoint {
  const pts = waypoints.length >= 2 ? waypoints : CONTINUOUS_DIAGONAL_WAYPOINTS;
  const segmentCount = pts.length - 1;
  const period = Math.max(0.5, periodSec);
  const phase = ((elapsedSec % period) + period) % period;
  const t = phase / period;
  const scaled = t * segmentCount;
  const i = Math.min(segmentCount - 1, Math.floor(scaled));
  const local = easeInOutCubic(scaled - i);
  const a = pts[i];
  const b = pts[i + 1];
  return {
    x: a.x + (b.x - a.x) * local,
    y: a.y + (b.y - a.y) * local,
  };
}

export function getContinuousDiagonalPosition(
  elapsedSec: number,
): WatermarkPoint {
  return interpolateWaypointPath(
    elapsedSec,
    CONTINUOUS_DIAGONAL_WAYPOINTS,
    CONTINUOUS_DIAGONAL_PERIOD_SEC,
  );
}

/** Vertical drift (px) for subtle / dynamic modes — shared encoder + live preview. */
export function getWatermarkDriftY(
  movement: WatermarkMovement,
  elapsedSec: number,
): number {
  if (movement === "continuous-diagonal" || movement === "static") return 0;
  const amp = movement === "dynamic" ? 14 : 7;
  const period = movement === "dynamic" ? 3.5 : 8;
  return Math.sin((elapsedSec / period) * Math.PI * 2) * amp;
}

export function watermarkMovementLabel(movement: WatermarkMovement): string {
  switch (movement) {
    case "static":
      return "Static";
    case "subtle":
      return "Subtle Movement";
    case "dynamic":
      return "Dynamic";
    case "continuous-diagonal":
      return "Continuous Diagonal Movement";
    default:
      return movement;
  }
}
