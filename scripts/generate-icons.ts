import { chromium } from "@playwright/test";
import path from "path";

async function generateIcons() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const svgContent = `
    <svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
      <rect width="512" height="512" rx="112" fill="#059669" />
      <rect x="24" y="24" width="464" height="464" rx="88" fill="none" stroke="#ffffff" stroke-width="24" />
      <text x="256" y="310" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="210" fill="#ffffff" text-anchor="middle" letter-spacing="-6">MCL</text>
    </svg>
  `;

  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { margin: 0; padding: 0; background: transparent; display: flex; align-items: center; justify-content: center; height: 100vh; }
        </style>
      </head>
      <body>
        ${svgContent}
      </body>
    </html>
  `);

  const svgElement = await page.$("svg");
  if (svgElement) {
    const publicIconsDir = path.join(process.cwd(), "public", "icons");
    const publicDir = path.join(process.cwd(), "public");

    // Generate 512x512
    await page.setViewportSize({ width: 512, height: 512 });
    await svgElement.screenshot({ path: path.join(publicIconsDir, "icon-512.png"), omitBackground: true });
    await svgElement.screenshot({ path: path.join(publicIconsDir, "mcl-logo.png"), omitBackground: true });

    // Generate 192x192
    await page.setViewportSize({ width: 192, height: 192 });
    await svgElement.screenshot({ path: path.join(publicIconsDir, "icon-192.png"), omitBackground: true });
    await svgElement.screenshot({ path: path.join(publicIconsDir, "apple-touch-icon.png"), omitBackground: true });
    await svgElement.screenshot({ path: path.join(publicDir, "favicon.ico"), omitBackground: true });

    console.log("High contrast icons generated successfully!");
  }

  await browser.close();
}

generateIcons().catch(console.error);
