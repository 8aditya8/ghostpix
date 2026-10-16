import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const formatMap = {
  jpeg: { extension: "jpg", mimeType: "image/jpeg" },
  png: { extension: "png", mimeType: "image/png" },
  webp: { extension: "webp", mimeType: "image/webp" },
};
const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

const mimeTypeByFormat = {
  avif: "image/avif",
  gif: "image/gif",
  heif: "image/heif",
  jpeg: "image/jpeg",
  png: "image/png",
  svg: "image/svg+xml",
  tiff: "image/tiff",
  webp: "image/webp",
};

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / (1024 ** exponent);
  const digits = value >= 100 || exponent === 0 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(digits)} ${units[exponent]}`;
}

function normalizeFormat(format) {
  const normalized = String(format || "").trim().toLowerCase().replace(/^\./, "");
  if (normalized === "jpg") {
    return "jpeg";
  }
  return Object.hasOwn(formatMap, normalized) ? normalized : "";
}

function mimeTypeForFormat(format) {
  return mimeTypeByFormat[format] || "";
}

function buildOutputName(filename, format) {
  const base = (filename || "image").replace(/\.[^.]+$/, "");
  const normalized = normalizeFormat(format);
  const extension = normalized ? formatMap[normalized].extension : "png";
  return `${base}-clean.${extension}`;
}

function inferFormatFromPath(filePath) {
  if (!filePath) {
    return "";
  }
  return normalizeFormat(path.extname(filePath).slice(1));
}

function applyOutputFormat(pipeline, format) {
  if (format === "jpeg") {
    return pipeline
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 95 });
  }

  if (format === "webp") {
    return pipeline.webp({ quality: 95 });
  }

  return pipeline.png();
}

function stripPngChunk(buffer, chunkType) {
  if (!Buffer.isBuffer(buffer) || buffer.length < pngSignature.length || !buffer.subarray(0, pngSignature.length).equals(pngSignature)) {
    return buffer;
  }

  const parts = [buffer.subarray(0, pngSignature.length)];
  let offset = pngSignature.length;
  let removed = false;

  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const chunkEnd = offset + 12 + length;
    if (chunkEnd > buffer.length) {
      return buffer;
    }

    const type = buffer.toString("latin1", offset + 4, offset + 8);
    if (type !== chunkType) {
      parts.push(buffer.subarray(offset, chunkEnd));
    } else {
      removed = true;
    }

    offset = chunkEnd;
    if (type === "IEND") {
      break;
    }
  }

  return removed ? Buffer.concat(parts) : buffer;
}

function createPipeline(input) {
  return sharp(input, { animated: false }).rotate();
}

export async function stripImageBuffer(input, options = {}) {
  const source = Buffer.isBuffer(input) ? input : Buffer.from(input);
  const metadata = await sharp(source, { animated: false }).metadata();
  const outputFormat = normalizeFormat(options.format)
    || inferFormatFromPath(options.outputPath)
    || normalizeFormat(metadata.format)
    || "png";
  const outputName = buildOutputName(options.originalName || "image", outputFormat);
  const outputType = formatMap[outputFormat].mimeType;
  let buffer = await applyOutputFormat(createPipeline(source), outputFormat).toBuffer();
  if (outputFormat === "png") {
    buffer = stripPngChunk(buffer, "pHYs");
  }

  return {
    buffer,
    outputName,
    outputType,
    originalName: options.originalName || "image",
    originalSize: source.length,
    originalType: mimeTypeForFormat(metadata.format),
    width: metadata.width || 0,
    height: metadata.height || 0,
    fileInfo: `${options.originalName || "image"} → ${outputName} · ${formatBytes(buffer.length)}`,
  };
}

export async function stripImageFile(inputPath, options = {}) {
  if (!inputPath) {
    throw new Error("Please provide an image path.");
  }

  const resolvedInputPath = path.resolve(inputPath);
  const originalName = path.basename(resolvedInputPath);
  const source = await fs.readFile(resolvedInputPath);
  const result = await stripImageBuffer(source, {
    ...options,
    originalName,
  });
  const resolvedOutputPath = options.outputPath
    ? path.resolve(options.outputPath)
    : path.join(path.dirname(resolvedInputPath), result.outputName);
  const outputName = path.basename(resolvedOutputPath);

  await fs.writeFile(resolvedOutputPath, result.buffer);

  return {
    ...result,
    outputName,
    fileInfo: `${originalName} → ${outputName} · ${formatBytes(result.buffer.length)}`,
    inputPath: resolvedInputPath,
    outputPath: resolvedOutputPath,
  };
}
