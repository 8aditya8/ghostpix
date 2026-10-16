import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

async function makeTweetImage(isClean, outputPath) {
  const cardWidth = 960;
  const cardHeight = 780;
  const imgWidth = 880;
  const imgHeight = 490;

  // Resize the cyberpunk photo
  const resizedPhoto = await sharp("./assets/cyberpunk.jpg")
    .resize(imgWidth, imgHeight, { fit: "cover" })
    .png()
    .toBuffer();

  // Create rounded mask for photo
  const roundedCorners = Buffer.from(
    `<svg><rect x="0" y="0" width="${imgWidth}" height="${imgHeight}" rx="14" ry="14"/></svg>`
  );

  const maskedPhoto = await sharp(resizedPhoto)
    .composite([{ input: roundedCorners, blend: "dest-in" }])
    .png()
    .toBuffer();

  // Badge at the bottom
  const badgeSvg = isClean
    ? `<g transform="translate(42, 706)">
         <rect x="0" y="0" width="360" height="34" rx="17" fill="#064e3b" stroke="#059669" stroke-width="1.5"/>
         <text x="18" y="22" fill="#34d399" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto" font-size="14" font-weight="700">🛡️ Sanitized with MetaClean (No AI Flag)</text>
       </g>`
    : `<g transform="translate(42, 708)">
         <path d="M10 2L12.2 7.8L18 10L12.2 12.2L10 18L7.8 12.2L2 10L7.8 7.8L10 2Z" fill="#9ca3af"/>
         <text x="26" y="14" fill="#9ca3af" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto" font-size="15" font-weight="600">Made with AI</text>
       </g>`;

  // Base SVG card background & text
  const cardSvg = Buffer.from(`
    <svg width="${cardWidth}" height="${cardHeight}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${cardWidth}" height="${cardHeight}" rx="24" fill="#090a0f" stroke="#222638" stroke-width="2"/>
      
      <!-- Avatar -->
      <circle cx="68" cy="74" r="26" fill="url(#grad)"/>
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#3b82f6"/>
          <stop offset="100%" stop-color="#8b5cf6"/>
        </linearGradient>
      </defs>
      <text x="60" y="82" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto" font-size="20" font-weight="bold">A</text>

      <!-- Username & Handle -->
      <text x="110" y="68" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto" font-size="17" font-weight="bold">Aditya</text>
      <!-- Verified Badge -->
      <circle cx="178" cy="62" r="8" fill="#1d9bf0"/>
      <path d="M174 62 L177 65 L182 59" stroke="#ffffff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="110" y="88" fill="#71767b" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto" font-size="14">@8aditya8</text>

      <!-- Tweet text -->
      <text x="42" y="145" fill="#f3f4f6" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto" font-size="18" font-weight="500">
        Testing the new 2026 AI cyberpunk generation model at night in the rain 🤖☕
      </text>

      <!-- Badge row -->
      ${badgeSvg}
    </svg>
  `);

  await sharp(cardSvg)
    .composite([
      {
        input: maskedPhoto,
        top: 180,
        left: 40,
      },
    ])
    .png()
    .toFile(outputPath);

  console.log("Created:", outputPath);
}

async function makeScreenshot(outputPath) {
  const width = 1100;
  const height = 680;

  // Resize photo for preview
  const previewPhoto = await sharp("./assets/cyberpunk.jpg")
    .resize(380, 240, { fit: "cover" })
    .png()
    .toBuffer();

  const roundedCorners = Buffer.from(
    `<svg><rect x="0" y="0" width="380" height="240" rx="12" ry="12"/></svg>`
  );

  const maskedPhoto = await sharp(previewPhoto)
    .composite([{ input: roundedCorners, blend: "dest-in" }])
    .png()
    .toBuffer();

  const uiSvg = Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <!-- Background -->
      <rect width="${width}" height="${height}" rx="20" fill="#0b0d14" stroke="#1f2333" stroke-width="2"/>

      <!-- Window Header Bar -->
      <rect width="${width}" height="56" rx="20" fill="#121520"/>
      <rect y="36" width="${width}" height="20" fill="#121520"/>
      <circle cx="32" cy="28" r="6" fill="#ef4444"/>
      <circle cx="52" cy="28" r="6" fill="#f59e0b"/>
      <circle cx="72" cy="28" r="6" fill="#10b981"/>
      <text x="${width / 2}" y="34" fill="#94a3b8" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto" font-size="14" font-weight="600" text-anchor="middle">
        MetaClean — AI Provenance &amp; Metadata Stripper
      </text>
      <rect x="${width - 150}" y="16" width="120" height="26" rx="13" fill="#10b981" fill-opacity="0.15" stroke="#10b981" stroke-opacity="0.3"/>
      <text x="${width - 90}" y="33" fill="#10b981" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto" font-size="11" font-weight="700" text-anchor="middle">
        ● 100% Client-Side
      </text>

      <!-- Main Container Card -->
      <rect x="40" y="80" width="${width - 80}" height="560" rx="16" fill="#121520" stroke="#1f2333" stroke-width="1.5"/>

      <!-- Audit Banner -->
      <rect x="64" y="104" width="${width - 128}" height="76" rx="12" fill="#ef4444" fill-opacity="0.08" stroke="#ef4444" stroke-opacity="0.25"/>
      <text x="88" y="134" fill="#ef4444" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto" font-size="16" font-weight="bold">
        🚨 AI Provenance &amp; C2PA Manifests Detected
      </text>
      <text x="88" y="160" fill="#94a3b8" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto" font-size="13">
        Social platforms (X / Instagram) will label this image as "Made with AI". MetaClean purged all C2PA claims.
      </text>

      <!-- Left Column: Photo Preview Frame -->
      <rect x="64" y="205" width="410" height="320" rx="14" fill="#090a0f" stroke="#1f2333"/>
      <text x="80" y="235" fill="#f8fafc" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto" font-size="13" font-weight="700">Sanitized Visual Canvas</text>
      <text x="80" y="505" fill="#64748b" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto" font-size="12">1376 × 768 px · Raw RGBA Pixels</text>

      <!-- Right Column: Stats & Operations -->
      <!-- Diff Grid -->
      <g transform="translate(500, 205)">
        <rect x="0" y="0" width="240" height="90" rx="10" fill="#090a0f" stroke="#1f2333"/>
        <text x="16" y="28" fill="#64748b" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto" font-size="11" font-weight="bold" letter-spacing="1">ORIGINAL FILE</text>
        <text x="16" y="62" fill="#f8fafc" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto" font-size="20" font-weight="bold">2.41 MB</text>

        <rect x="260" y="0" width="250" height="90" rx="10" fill="#090a0f" stroke="#10b981" stroke-opacity="0.3"/>
        <text x="276" y="28" fill="#10b981" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto" font-size="11" font-weight="bold" letter-spacing="1">CLEANED FILE</text>
        <text x="276" y="62" fill="#10b981" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto" font-size="20" font-weight="bold">1.18 MB (-51%)</text>
      </g>

      <!-- Tags Purged Badge Card -->
      <g transform="translate(500, 315)">
        <rect x="0" y="0" width="510" height="85" rx="10" fill="#090a0f" stroke="#1f2333"/>
        <text x="16" y="28" fill="#64748b" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto" font-size="11" font-weight="bold" letter-spacing="1">STRIPPED METADATA TAGS</text>
        <text x="16" y="58" fill="#f8fafc" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto" font-size="14" font-weight="bold">
          23 Tags Eliminated: <tspan fill="#f59e0b">C2PA Manifest · OpenAI API · GPS Coordinates · EXIF</tspan>
        </text>
      </g>

      <!-- Action Buttons -->
      <g transform="translate(500, 435)">
        <rect x="0" y="0" width="240" height="48" rx="10" fill="#3b82f6"/>
        <text x="120" y="29" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto" font-size="14" font-weight="bold" text-anchor="middle">
          ⬇️ Download Clean Image
        </text>

        <rect x="255" y="0" width="220" height="48" rx="10" fill="#1e2334" stroke="#2b324a"/>
        <text x="365" y="29" fill="#f8fafc" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto" font-size="14" font-weight="bold" text-anchor="middle">
          📋 Copy to Clipboard
        </text>
      </g>

      <!-- Bottom Tip -->
      <text x="500" y="520" fill="#64748b" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto" font-size="12">
        Tip: Press Ctrl + V anywhere on the app to instantly sanitize from clipboard.
      </text>
    </svg>
  `);

  await sharp(uiSvg)
    .composite([
      {
        input: maskedPhoto,
        top: 250,
        left: 78,
      },
    ])
    .png()
    .toFile(outputPath);

  console.log("Created screenshot:", outputPath);
}

async function main() {
  await makeTweetImage(false, "./assets/example.png");
  await makeTweetImage(true, "./assets/after.png");
  await makeScreenshot("./assets/screenshot.png");
  console.log("All assets generated successfully!");
}

main().catch(console.error);
