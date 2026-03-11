import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import puppeteer from 'puppeteer-core';

const repoRoot = process.cwd();
const dataPath = path.join(repoRoot, 'js', 'data.js');
const outputDir = path.join(repoRoot, 'assets', 'animals');

async function loadAnimals() {
  const source = await fs.readFile(dataPath, 'utf8');
  const transformed = source
    .replace(/export const /g, 'const ')
    .replace(/export function /g, 'function ')
    .replace(/export default[\s\S]*$/, '');

  const context = {
    module: { exports: {} },
    exports: {},
    console,
    Math,
  };

  vm.createContext(context);
  const script = new vm.Script(`${transformed}\nmodule.exports = { ANIMALS };`, {
    filename: 'data.generated.cjs',
  });
  script.runInContext(context);

  return context.module.exports.ANIMALS;
}

function detectChromePath() {
  const envPath = process.env.CHROME_PATH;
  if (envPath && fsSync.existsSync(envPath)) {
    return envPath;
  }

  const candidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
  ];

  return candidates.find((candidate) => fsSync.existsSync(candidate));
}

async function main() {
  const animals = await loadAnimals();
  const executablePath = detectChromePath();

  if (!executablePath) {
    throw new Error('Chrome/Chromium executable not found. Set CHROME_PATH to generate PNG assets.');
  }

  await fs.rm(outputDir, { recursive: true, force: true });
  await fs.mkdir(outputDir, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 512, height: 512, deviceScaleFactor: 1 });

    for (const animal of animals) {
      const markup = `
        <style>
          html, body {
            margin: 0;
            width: 512px;
            height: 512px;
            background: transparent;
          }
          body {
            display: grid;
            place-items: center;
          }
          #art, #art svg {
            width: 512px;
            height: 512px;
          }
          #art {
            display: grid;
            place-items: center;
          }
        </style>
        <div id="art">${animal.svg}</div>
      `;

      await page.setContent(markup, { waitUntil: 'load' });
      const art = await page.$('#art');
      if (!art) {
        throw new Error(`Unable to render art for ${animal.id}.`);
      }

      const pngBuffer = await art.screenshot({ type: 'png', omitBackground: true });
      await fs.writeFile(path.join(outputDir, `${animal.id}.png`), pngBuffer);
    }
  } finally {
    await browser.close();
  }

  console.log(`Generated ${animals.length} animal PNG assets in ${path.relative(repoRoot, outputDir)}.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
