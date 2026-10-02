/**
 * AquaSentinel Robust Data Formatting & NaN Elimination Utilities
 * Strictly validates numeric values, coordinates, percentages, and measurements.
 * Prevents NaN%, Infinity, null, or undefined values from rendering in the UI.
 */

/**
 * Safely format a value as a percentage string (e.g. "45%" or "45.0%").
 * Returns fallback if the value is null, undefined, NaN, or non-finite.
 */
export function safePercent(
  val: number | string | null | undefined,
  decimals: number = 0,
  fallback: string = '0%'
): string {
  if (val === null || val === undefined || val === '') return fallback;
  const num = typeof val === 'number' ? val : parseFloat(val);
  if (!Number.isFinite(num)) return fallback;
  const pct = num <= 1.0 && num >= 0.0 ? num * 100 : num;
  const clamped = Math.max(0, Math.min(100, pct));
  return `${clamped.toFixed(decimals)}%`;
}

/**
 * Safely format a numeric value with specified decimals.
 */
export function safeNumber(
  val: number | string | null | undefined,
  decimals: number = 1,
  fallback: string = '0.0'
): string {
  if (val === null || val === undefined || val === '') return fallback;
  const num = typeof val === 'number' ? val : parseFloat(val);
  if (!Number.isFinite(num)) return fallback;
  return num.toFixed(decimals);
}

/**
 * Safely validate and clamp a normalized bounding box coordinate in [0.0, 1.0].
 */
export function safeCoord(
  val: number | string | null | undefined,
  fallback: number = 0
): number {
  if (val === null || val === undefined || val === '') return fallback;
  const num = typeof val === 'number' ? val : parseFloat(val);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(0.0, Math.min(1.0, num));
}

/**
 * Format physical dimensions considering sonar calibration status.
 * If uncalibrated, returns pixel dimensions. If calibrated, returns metric dimensions.
 */
export function formatDimension(
  meters: number | null | undefined,
  pixels: number | null | undefined,
  isCalibrated: boolean = false
): string {
  if (isCalibrated && meters !== null && meters !== undefined && Number.isFinite(meters) && meters > 0) {
    return `${meters.toFixed(2)} m`;
  }
  if (pixels !== null && pixels !== undefined && Number.isFinite(pixels) && pixels > 0) {
    return `${Math.round(pixels)} px`;
  }
  return 'Uncalibrated';
}

/**
 * Safely format relief height above seabed.
 */
export function formatReliefHeight(
  heightM: number | null | undefined,
  isCalibrated: boolean = false
): string {
  if (isCalibrated && heightM !== null && heightM !== undefined && Number.isFinite(heightM) && heightM > 0) {
    return `${heightM.toFixed(2)} m`;
  }
  return 'N/A (Uncalibrated)';
}
