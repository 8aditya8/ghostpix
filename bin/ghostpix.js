#!/usr/bin/env node

const supportedFormats = new Set(["jpg", "png", "webp"]);

function printUsage() {
  console.log(`Usage: npx ghostpix <source> [target] [--format <jpg|png|webp>] [--output <path>]

Examples:
  npx ghostpix ./image.png
  npx ghostpix ./image.png ./image-clean.png
  npx ghostpix ./image.png --format webp
  npx ghostpix ./image.png --output ./custom/output.png`);
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const options = {};
  let inputPath = "";
  let targetPath = "";

  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];

    if (value === "-h" || value === "--help") {
      options.help = true;
      continue;
    }

    if (value === "-o" || value === "--output") {
      index += 1;
      if (targetPath) {
        throw new Error("Specify the target path either as the second argument or with --output, not both.");
      }
      const outputPath = args[index];
      if (!outputPath || outputPath.startsWith("-")) {
        throw new Error("Please provide a path after --output.");
      }
      options.outputPath = outputPath;
      continue;
    }

    if (value === "-f" || value === "--format") {
      index += 1;
      const format = args[index];
      if (!format || format.startsWith("-")) {
        throw new Error("Please provide a format after --format.");
      }
      if (!supportedFormats.has(format.toLowerCase())) {
        throw new Error("Unsupported format. Use one of: jpg, png, webp.");
      }
      options.format = format;
      continue;
    }

    if (value.startsWith("-")) {
      throw new Error(`Unknown option: ${value}`);
    }

    if (!inputPath) {
      inputPath = value;
      continue;
    }

    if (!targetPath) {
      targetPath = value;
      continue;
    }

    throw new Error(`Unexpected argument: ${value}`);
  }

  if (targetPath) {
    options.outputPath = targetPath;
  }

  return {
    inputPath,
    options,
  };
}

async function main() {
  const { inputPath, options } = parseArgs(process.argv);

  if (options.help || !inputPath) {
    printUsage();
    process.exit(options.help ? 0 : 1);
  }

  const { stripImageFile } = await import("../ghostpix-node.js");
  const result = await stripImageFile(inputPath, options);
  console.log(result.outputPath);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
