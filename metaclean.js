const exportableTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const pngSignature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / (1024 ** exponent);
  const digits = value >= 100 || exponent === 0 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(digits)} ${units[exponent]}`;
}

export function buildOutputName(filename, mimeType) {
  const extensionMap = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  const base = (filename || "image").replace(/\.[^.]+$/, "");
  const extension = extensionMap[mimeType] || "png";
  return `${base}-clean.${extension}`;
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.decoding = "async";

    image.onload = () => {
      resolve({
        image,
        cleanup() {
          URL.revokeObjectURL(url);
        },
      });
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("The selected file could not be decoded as an image."));
    };

    image.src = url;
  });
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("The browser could not export this image."));
        return;
      }
      resolve(blob);
    }, type, quality);
  });
}

function readPngChunkType(bytes, offset) {
  return String.fromCharCode(
    bytes[offset + 4],
    bytes[offset + 5],
    bytes[offset + 6],
    bytes[offset + 7],
  );
}

function stripPngChunk(bytes, chunkType) {
  if (!(bytes instanceof Uint8Array) || bytes.length < pngSignature.length) {
    return bytes;
  }

  for (let index = 0; index < pngSignature.length; index += 1) {
    if (bytes[index] !== pngSignature[index]) {
      return bytes;
    }
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const parts = [bytes.subarray(0, pngSignature.length)];
  let offset = pngSignature.length;
  let removed = false;

  while (offset + 12 <= bytes.length) {
    const length = view.getUint32(offset, false);
    const chunkEnd = offset + 12 + length;
    if (chunkEnd > bytes.length) {
      return bytes;
    }

    const type = readPngChunkType(bytes, offset);
    if (type !== chunkType) {
      parts.push(bytes.subarray(offset, chunkEnd));
    } else {
      removed = true;
    }

    offset = chunkEnd;
    if (type === "IEND") {
      break;
    }
  }

  if (!removed) {
    return bytes;
  }

  const stripped = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let cursor = 0;
  for (const part of parts) {
    stripped.set(part, cursor);
    cursor += part.length;
  }
  return stripped;
}

async function sanitizeOutputBlob(blob, outputType) {
  if (!blob || outputType !== "image/png") {
    return blob;
  }

  const bytes = new Uint8Array(await blob.arrayBuffer());
  const stripped = stripPngChunk(bytes, "pHYs");
  if (stripped === bytes) {
    return blob;
  }
  return new Blob([stripped], { type: outputType });
}

export async function stripImageMetadata(file, options = {}) {
  if (!file || typeof file.arrayBuffer !== "function") {
    throw new Error("Please choose an image file.");
  }

  if (file.type && !file.type.startsWith("image/")) {
    throw new Error("Please choose an image file.");
  }

  const { image, cleanup } = await loadImage(file);

  try {
    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;

    if (!width || !height) {
      throw new Error("The browser could not determine the image size.");
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas rendering is unavailable in this browser.");
    }

    context.drawImage(image, 0, 0, width, height);

    const originalName = typeof file.name === "string" && file.name ? file.name : "image";
    const originalType = file.type || "";
    let outputType = options.format && exportableTypes.has(options.format) 
      ? options.format 
      : (exportableTypes.has(originalType) ? originalType : "image/png");
    let quality = options.quality !== undefined 
      ? options.quality 
      : (outputType === "image/jpeg" || outputType === "image/webp" ? 0.95 : undefined);
    let blob;

    try {
      blob = await canvasToBlob(canvas, outputType, quality);
    } catch (error) {
      if (outputType === "image/png") {
        throw error;
      }
      outputType = "image/png";
      quality = undefined;
      blob = await canvasToBlob(canvas, outputType);
    }

    blob = await sanitizeOutputBlob(blob, outputType);

    const outputName = buildOutputName(originalName, outputType);

    return {
      blob,
      outputName,
      outputType,
      originalName,
      originalSize: file.size,
      originalType,
      width,
      height,
      fileInfo: `${originalName} → ${outputName} · ${formatBytes(blob.size)}`,
    };
  } finally {
    cleanup();
  }
}
