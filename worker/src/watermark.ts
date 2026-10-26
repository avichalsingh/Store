/**
 * Watermark config → FFmpeg filters.
 * Text geometry mirrors src/admin/services/previewEncoder.ts drawWatermark.
 * Logo mode replaces text (same as Admin WatermarkPreview when imageUrl is set).
 *
 * Limitations:
 * - continuous-diagonal uses a smooth diagonal oscillation, not the full Admin waypoint circuit.
 * - Logo + text together are not supported — logo replaces text when logoPath is set.
 */

export type WorkerWatermarkStyle =
  | "diagonal"
  | "center"
  | "corner"
  | "custom";

export type WorkerWatermarkSize = "small" | "medium" | "large";

export type WorkerWatermarkMovement =
  | "static"
  | "subtle"
  | "dynamic"
  | "continuous-diagonal";

export type WorkerWatermarkConfig = {
  enabled: boolean;
  style: WorkerWatermarkStyle;
  opacity: number;
  size: WorkerWatermarkSize;
  movement: WorkerWatermarkMovement;
  text?: string;
  /** Allowlisted Storage path only (system/watermark-logo.png|webp). */
  logoPath?: string;
};

export const DEFAULT_WORKER_WATERMARK: WorkerWatermarkConfig = {
  enabled: true,
  style: "diagonal",
  opacity: 45,
  size: "large",
  movement: "subtle",
  text: "RHYTHM",
};

/** Must match Next watermarkLogo.ts — private masters bucket. */
export const WATERMARK_LOGO_BUCKET = "media-masters";

const LOGO_PATH_RE = /^system\/watermark-logo\.(png|webp)$/;

export function isAllowedWatermarkLogoPath(path: string): boolean {
  return LOGO_PATH_RE.test(path.trim());
}

const STYLES = new Set<string>(["diagonal", "center", "corner", "custom"]);
const SIZES = new Set<string>(["small", "medium", "large"]);
const MOVEMENTS = new Set<string>([
  "static",
  "subtle",
  "dynamic",
  "continuous-diagonal",
]);

export function sanitizeWorkerWatermark(
  input: unknown,
): WorkerWatermarkConfig {
  if (!input || typeof input !== "object") {
    return { ...DEFAULT_WORKER_WATERMARK };
  }
  const o = input as Record<string, unknown>;
  const styleRaw = String(o.style ?? "");
  const sizeRaw = String(o.size ?? "");
  const movementRaw = String(o.movement ?? "");
  const opacityNum = Number(o.opacity);
  const textRaw =
    typeof o.text === "string" ? o.text.trim().slice(0, 32) : "";
  const logoRaw =
    typeof o.logoPath === "string"
      ? o.logoPath.trim()
      : typeof o.imageStoragePath === "string"
        ? o.imageStoragePath.trim()
        : "";

  const logoPath =
    logoRaw && isAllowedWatermarkLogoPath(logoRaw) ? logoRaw : undefined;

  return {
    enabled: o.enabled !== false,
    style: STYLES.has(styleRaw)
      ? (styleRaw as WorkerWatermarkStyle)
      : DEFAULT_WORKER_WATERMARK.style,
    opacity: Number.isFinite(opacityNum)
      ? Math.min(100, Math.max(0, Math.round(opacityNum)))
      : DEFAULT_WORKER_WATERMARK.opacity,
    size: SIZES.has(sizeRaw)
      ? (sizeRaw as WorkerWatermarkSize)
      : DEFAULT_WORKER_WATERMARK.size,
    movement: MOVEMENTS.has(movementRaw)
      ? (movementRaw as WorkerWatermarkMovement)
      : DEFAULT_WORKER_WATERMARK.movement,
    text: textRaw || DEFAULT_WORKER_WATERMARK.text,
    logoPath,
  };
}

function escapeDrawtext(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/:/g, "\\:")
    .replace(/'/g, "\\'");
}

/** Match previewEncoder fontPx fractions of frame height. */
function fontsizeExpr(size: WorkerWatermarkSize): string {
  const base =
    size === "small" ? 0.028 : size === "large" ? 0.055 : 0.04;
  return `h*${base}`;
}

/** Logo height as fraction of video height (previewEncoder image scale). */
export function logoHeightFraction(size: WorkerWatermarkSize): number {
  const px =
    size === "small" ? 0.028 : size === "large" ? 0.055 : 0.04;
  const mult = size === "small" ? 1.4 : size === "large" ? 2.2 : 1.8;
  return px * mult;
}

function alphaExpr(opacity: number): string {
  const a = Math.min(100, Math.max(0, opacity)) / 100;
  return a.toFixed(3);
}

function withDriftY(
  baseY: string,
  movement: WorkerWatermarkMovement,
): string {
  if (movement === "subtle") {
    return `(${baseY})+7*sin(2*PI*t/8)`;
  }
  if (movement === "dynamic") {
    return `(${baseY})+14*sin(2*PI*t/3.5)`;
  }
  return baseY;
}

function fontClause(): string {
  const font = process.env.WORKER_WATERMARK_FONT?.trim();
  return font ? `fontfile=${escapeDrawtext(font)}:` : "";
}

function drawtextFilter(parts: {
  text: string;
  fontsize: string;
  alpha: string;
  x: string;
  y: string;
}): string {
  // drawtext `angle` is unavailable on this worker's FFmpeg 6.0 build.
  // Diagonal text uses a rotated RGBA layer instead (see buildDiagonalTextFilterComplex).
  return (
    `drawtext=${fontClause()}text='${escapeDrawtext(parts.text)}':` +
    `fontsize=${parts.fontsize}:fontcolor=white@${parts.alpha}:` +
    `x=${parts.x}:y=${parts.y}`
  );
}

/** Settings WatermarkPreview uses ~−28° ≈ −0.48 rad on the whole mark layer. */
export const DIAGONAL_LAYER_ROTATE_RAD = -0.48;

/**
 * Settings Live Preview geometry for diagonal text
 * (`WatermarkPreview`: `inset-[-40%]` + `grid grid-cols-3` + `gap-8` + size map).
 * Reference panel: max-h-72 (288px) at 9:16.
 */
export const SETTINGS_PREVIEW_CSS_H = 288;
export const SETTINGS_GAP_PX = 32; // Tailwind gap-8 = 2rem
export const SETTINGS_CANVAS_SCALE = 1.8; // inset -40% each side → 180%

const SETTINGS_TEXT_PX: Record<WorkerWatermarkSize, number> = {
  small: 10, // text-[10px]
  medium: 12, // text-xs
  large: 14, // text-sm
};

/**
 * 3×4 CSS-grid mark layout on the 1.8× canvas, expressed as fractions of
 * canvas width/height (matches Settings, not the old 0.42 / 0.22 pitches).
 */
export function diagonalTextGridLayout(size: WorkerWatermarkSize): {
  pitchXFrac: number;
  originXFrac: number;
  pitchYFrac: number;
  originYFrac: number;
  /** drawtext fontsize as fraction of canvas `h` (1.8× video). */
  fontsizeCanvasFrac: number;
} {
  const previewW = (SETTINGS_PREVIEW_CSS_H * 9) / 16;
  const Lw = previewW * SETTINGS_CANVAS_SCALE;
  const Lh = SETTINGS_PREVIEW_CSS_H * SETTINGS_CANVAS_SCALE;
  const gap = SETTINGS_GAP_PX;
  const textPx = SETTINGS_TEXT_PX[size];
  // Auto row height ≈ line box of the Settings mark (font + leading).
  const lineBox = textPx * 1.25;
  const pitchXFrac = (Lw + gap) / 3 / Lw;
  const originXFrac = (Lw - 2 * gap) / 6 / Lw; // first column center
  const pitchYFrac = (lineBox + gap) / Lh;
  const originYFrac = (1 - 3 * pitchYFrac) / 2; // content-center
  // Settings px on visible panel → canvas uses h of the 1.8× layer.
  const fontsizeCanvasFrac =
    textPx / SETTINGS_PREVIEW_CSS_H / SETTINGS_CANVAS_SCALE;
  return {
    pitchXFrac,
    originXFrac,
    pitchYFrac,
    originYFrac,
    fontsizeCanvasFrac,
  };
}

/** Approximate CSS `tracking-[0.2em]` (drawtext has no letter-spacing). */
function withCssTracking(text: string): string {
  return Array.from(text).join("\u2009");
}

/**
 * Diagonal text (non-continuous) needs filter_complex: draw upright sparse grid,
 * rotate the layer, overlay — matching Admin Settings CSS.
 */
export function needsDiagonalTextRotatePath(
  config: WorkerWatermarkConfig,
): boolean {
  return (
    config.enabled &&
    !config.logoPath &&
    config.style === "diagonal" &&
    config.movement !== "continuous-diagonal"
  );
}

/**
 * Sparse 3×4 upright drawtext chain for the transparent canvas
 * (Settings: grid-cols-3 × 12 marks, gap-8, content-center).
 */
function diagonalSparseDrawtextChain(
  text: string,
  size: WorkerWatermarkSize,
  alpha: string,
  movement: WorkerWatermarkMovement,
): string {
  const layout = diagonalTextGridLayout(size);
  const fontsize = `h*${layout.fontsizeCanvasFrac.toFixed(5)}`;
  const spaced = withCssTracking(text);
  const ox = layout.originXFrac.toFixed(4);
  const px = layout.pitchXFrac.toFixed(4);
  const oy = layout.originYFrac.toFixed(4);
  const py = layout.pitchYFrac.toFixed(4);
  const parts: string[] = [];
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 3; col++) {
      const baseX = `w*(${ox}+${col}*${px})-text_w/2`;
      const baseY = withDriftY(
        `h*(${oy}+${row}*${py})-text_h/2`,
        movement,
      );
      parts.push(
        drawtextFilter({
          text: spaced,
          fontsize,
          alpha,
          x: baseX,
          y: baseY,
        }),
      );
    }
  }
  return parts.join(",");
}

/**
 * filter_complex: scale video → oversized transparent canvas (Settings
 * `inset-[-40%]` ≈ 1.8× frame) with sparse upright 3×4 text → rotate −0.48 rad
 * → centered overlay (edges clip like the Admin live preview).
 * Does not use drawtext angle (unsupported on this FFmpeg).
 */
export function buildDiagonalTextFilterComplex(
  config: WorkerWatermarkConfig,
): string {
  const text = (config.text || "RHYTHM").trim() || "RHYTHM";
  const alpha = alphaExpr(config.opacity);
  const drawChain = diagonalSparseDrawtextChain(
    text,
    config.size,
    alpha,
    config.movement,
  );
  const scale =
    "scale='min(540,iw)':'min(960,ih)':force_original_aspect_ratio=decrease," +
    "scale=trunc(iw/2)*2:trunc(ih/2)*2";
  // Match Settings absolute inset-[-40%] → layer ~180% of the visible frame.
  const canvasSize =
    "w=trunc(iw*1.8/2)*2:h=trunc(ih*1.8/2)*2";

  return (
    `[0:v]${scale}[base];` +
    `color=c=black@0.0:d=100,format=rgba[c0];` +
    `[c0][base]scale2ref=${canvasSize}[canvas][base2];` +
    `[canvas]${drawChain},` +
    `rotate=${DIAGONAL_LAYER_ROTATE_RAD}:c=none:ow=rotw(iw):oh=roth(ih)[wm];` +
    `[base2][wm]overlay=(W-w)/2:(H-h)/2:format=auto[vout]`
  );
}

/**
 * Build comma-joined drawtext filters for non-diagonal (and continuous) text
 * paths used with `-vf`. Diagonal static/subtle/dynamic uses
 * {@link buildDiagonalTextFilterComplex} instead.
 */
export function buildTextWatermarkFilters(
  config: WorkerWatermarkConfig,
): string {
  if (!config.enabled) return "";
  if (config.logoPath) return "";
  // Diagonal (non-continuous) is handled via filter_complex + rotate.
  if (needsDiagonalTextRotatePath(config)) return "";

  const text = (config.text || "RHYTHM").trim() || "RHYTHM";
  const fontsize = fontsizeExpr(config.size);
  const alpha = alphaExpr(config.opacity);
  const movement = config.movement;
  const continuous = movement === "continuous-diagonal";
  const filters: string[] = [];

  if (continuous) {
    const x = "w*(0.5+0.38*sin(2*PI*t/14))-text_w/2";
    const y = "h*(0.5-0.38*sin(2*PI*t/14))-text_h/2";
    filters.push(drawtextFilter({ text, fontsize, alpha, x, y }));
    return filters.join(",");
  }

  if (config.style === "center") {
    const baseY = "(h-text_h)/2";
    filters.push(
      drawtextFilter({
        text,
        fontsize,
        alpha,
        x: "(w-text_w)/2",
        y: withDriftY(baseY, movement),
      }),
    );
    return filters.join(",");
  }

  const baseY = "h-text_h-h*0.04";
  filters.push(
    drawtextFilter({
      text,
      fontsize,
      alpha,
      x: "w-text_w-w*0.04",
      y: withDriftY(baseY, movement),
    }),
  );
  return filters.join(",");
}

/** @deprecated use buildTextWatermarkFilters */
export function buildWatermarkFilters(
  config: WorkerWatermarkConfig,
): string {
  return buildTextWatermarkFilters(config);
}

export type LogoOverlaySpec = {
  x: string;
  y: string;
};

/**
 * Overlay positions for logo marks (normalized expressions using W/H of main, w/h of overlay).
 */
export function buildLogoOverlayPositions(
  config: WorkerWatermarkConfig,
): LogoOverlaySpec[] {
  const movement = config.movement;
  const continuous = movement === "continuous-diagonal";

  if (continuous) {
    return [
      {
        x: "W*(0.5+0.38*sin(2*PI*t/14))-w/2",
        y: "H*(0.5-0.38*sin(2*PI*t/14))-h/2",
      },
    ];
  }

  if (config.style === "diagonal") {
    // Match Settings CSS density (~12 marks) rather than full text grid.
    const positions: LogoOverlaySpec[] = [];
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 3; col++) {
        const baseX = `${col}*W*0.42+W*0.15-w/2`;
        const baseY = withDriftY(
          `${row}*H*0.22+H*0.1-h/2`,
          movement,
        );
        positions.push({ x: baseX, y: baseY });
      }
    }
    return positions;
  }

  if (config.style === "center") {
    return [
      {
        x: "(W-w)/2",
        y: withDriftY("(H-h)/2", movement),
      },
    ];
  }

  // corner / custom
  return [
    {
      x: "W-w-W*0.04",
      y: withDriftY("H-h-H*0.04", movement),
    },
  ];
}

/**
 * filter_complex graph: scale video, prepare logo (opacity + size + optional rotate), overlay.
 * Output label is [vout].
 */
export function buildLogoFilterComplex(
  config: WorkerWatermarkConfig,
): string {
  const alpha = alphaExpr(config.opacity);
  const hFrac = logoHeightFraction(config.size).toFixed(4);
  const positions = buildLogoOverlayPositions(config);
  const rotate =
    config.style === "diagonal" && config.movement !== "continuous-diagonal"
      ? `rotate=-0.48:c=none:ow=rotw(iw):oh=roth(ih),`
      : config.style === "diagonal" &&
          config.movement === "continuous-diagonal"
        ? `rotate=-0.48:c=none:ow=rotw(iw):oh=roth(ih),`
        : "";

  const scale =
    "scale='min(540,iw)':'min(960,ih)':force_original_aspect_ratio=decrease," +
    "scale=trunc(iw/2)*2:trunc(ih/2)*2";

  const parts: string[] = [];
  parts.push(`[0:v]${scale}[base]`);
  // scale2ref: logo height = main_h * hFrac, preserve aspect
  parts.push(
    `[1:v]format=rgba,${rotate}colorchannelmixer=aa=${alpha}[lg0]`,
  );
  parts.push(
    `[lg0][base]scale2ref=w=oh*mdar:h=ih*${hFrac}[logo][base2]`,
  );

  const n = positions.length;
  if (n === 1) {
    const p = positions[0];
    parts.push(
      `[base2][logo]overlay=x='${p.x}':y='${p.y}':format=auto[vout]`,
    );
    return parts.join(";");
  }

  parts.push(`[logo]split=${n}${positions.map((_, i) => `[l${i}]`).join("")}`);
  let prev = "base2";
  for (let i = 0; i < n; i++) {
    const p = positions[i];
    const out = i === n - 1 ? "vout" : `t${i}`;
    parts.push(
      `[${prev}][l${i}]overlay=x='${p.x}':y='${p.y}':format=auto[${out}]`,
    );
    prev = out;
  }
  return parts.join(";");
}
