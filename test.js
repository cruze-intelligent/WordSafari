const fs = require('fs');
const path = require('path');
const http = require('http');
const puppeteer = require('puppeteer-core');

const ROOT = process.cwd();
const PORT = Number(process.env.TEST_PORT || 8787);
const BASE_URL = `http://127.0.0.1:${PORT}`;

function parseArgs() {
  const scenarioArg = process.argv.find((arg) => arg.startsWith('--scenario='));
  return {
    scenario: scenarioArg ? scenarioArg.split('=')[1] : 'smoke'
  };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function contentTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.ico': 'image/x-icon'
  };
  return map[ext] || 'application/octet-stream';
}

function startStaticServer() {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split('?')[0]);
    const cleanPath = urlPath === '/' ? '/index.html' : urlPath;
    const fsPath = path.join(ROOT, cleanPath);

    if (!fsPath.startsWith(ROOT)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    fs.readFile(fsPath, (err, data) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not found');
        return;
      }

      res.writeHead(200, {
        'Content-Type': contentTypeFor(fsPath),
        'Cache-Control': 'no-cache'
      });
      res.end(data);
    });
  });

  return new Promise((resolve) => {
    server.listen(PORT, '127.0.0.1', () => resolve(server));
  });
}

function detectChromePath() {
  const envPath = process.env.CHROME_PATH;
  if (envPath && fs.existsSync(envPath)) {
    return envPath;
  }

  const candidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
  ];

  return candidates.find((candidate) => fs.existsSync(candidate));
}

async function launchBrowser() {
  const executablePath = detectChromePath();
  if (!executablePath) {
    throw new Error('Chrome/Chromium executable not found. Set CHROME_PATH to run tests.');
  }

  return puppeteer.launch({
    executablePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
}

async function preparePage(browser, options = {}) {
  const page = await browser.newPage();
  page.on('console', (msg) => {
    const type = msg.type();
    if (type === 'error' || type === 'warning') {
      console.log(`PAGE ${type.toUpperCase()}:`, msg.text());
    }
  });

  if (typeof options.seedStorage === 'function') {
    await page.evaluateOnNewDocument(options.seedStorage);
  }

  return page;
}

async function waitForServiceWorker(page) {
  await page.waitForFunction(async () => {
    if (!('serviceWorker' in navigator)) return false;
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return false;
    await navigator.serviceWorker.ready;
    return Boolean(reg.active);
  }, { timeout: 15000 });
}

async function runSmokeTest(browser) {
  const page = await preparePage(browser);
  await page.goto(BASE_URL, { waitUntil: 'networkidle0' });

  const isStartActive = await page.$eval('#start-screen', (el) => el.classList.contains('active'));
  assert(isStartActive, 'Start screen should be active on initial load.');

  const welcomeVisible = await page.$eval('#welcome-modal', (el) => el.classList.contains('active'));
  assert(welcomeVisible, 'Welcome modal should open on initial load.');

  await page.click('#btn-welcome-start');
  await page.waitForFunction(() => {
    const modal = document.getElementById('welcome-modal');
    return modal && !modal.classList.contains('active');
  }, { timeout: 3000 });

  await page.click('#btn-play');
  await page.waitForFunction(() => {
    const start = document.getElementById('start-screen');
    const game = document.getElementById('game-screen');
    return start && game && !start.classList.contains('active') && game.classList.contains('active');
  }, { timeout: 4000 });

  await page.close();
  return 'Smoke test passed';
}

async function runPwaTest(browser) {
  const page = await preparePage(browser);
  await page.goto(BASE_URL, { waitUntil: 'networkidle0' });

  const manifestHref = await page.$eval('link[rel="manifest"]', (el) => el.getAttribute('href'));
  assert(manifestHref === 'manifest.json', 'Manifest link should target manifest.json');

  const swSupported = await page.evaluate(() => 'serviceWorker' in navigator);
  assert(swSupported, 'Service workers should be supported in the test browser.');

  await waitForServiceWorker(page);

  const swState = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    return {
      hasRegistration: Boolean(reg),
      hasActiveWorker: Boolean(reg && reg.active),
      scope: reg ? reg.scope : null
    };
  });

  assert(swState.hasRegistration, 'Service worker should register.');
  assert(swState.hasActiveWorker, 'Service worker should become active.');

  await page.close();
  return `PWA test passed (scope: ${swState.scope})`;
}

async function runPwaMobileTest(browser) {
  const iphonePage = await preparePage(browser);
  await iphonePage.setViewport({
    width: 390,
    height: 844,
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 3
  });
  await iphonePage.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1');
  await iphonePage.goto(BASE_URL, { waitUntil: 'networkidle0' });

  const iosInstallText = await iphonePage.$eval('#welcome-install-status', (el) => el.textContent.trim());
  const iosSteps = await iphonePage.$$eval('#welcome-install-steps li', (els) => els.map((el) => el.textContent.trim()));

  assert(iosInstallText.includes('Share') || iosInstallText.includes('Home Screen'), 'iOS install guidance should mention the Share sheet / Add to Home Screen flow.');
  assert(iosSteps.some((step) => step.includes('Add to Home Screen')), 'iOS install guidance should include Add to Home Screen steps.');

  await iphonePage.close();

  const androidPage = await preparePage(browser);
  await androidPage.setViewport({
    width: 412,
    height: 915,
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2.625
  });
  await androidPage.setUserAgent('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36');
  await androidPage.goto(BASE_URL, { waitUntil: 'networkidle0' });

  const androidInstallText = await androidPage.$eval('#welcome-install-status', (el) => el.textContent.trim());

  assert(
    androidInstallText.includes('install')
      || androidInstallText.includes('home screen')
      || androidInstallText.includes('browser menu'),
    'Android install guidance should mention install or Add to Home screen.'
  );

  await androidPage.close();
  return 'Mobile PWA guidance test passed';
}

async function runOfflineTest(browser) {
  const page = await preparePage(browser);
  await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
  await waitForServiceWorker(page);

  await page.setOfflineMode(true);
  await page.reload({ waitUntil: 'domcontentloaded' });

  const offlineSignal = await page.evaluate(() => {
    const text = document.body.innerText || '';
    const hasAppShell = text.includes('Word Safari') || text.includes('Start Adventure');
    const hasOfflinePage = text.includes('You are offline');
    return { hasAppShell, hasOfflinePage };
  });

  assert(offlineSignal.hasAppShell || offlineSignal.hasOfflinePage, 'Offline reload should render app shell or offline fallback.');

  await page.setOfflineMode(false);
  await page.close();
  return 'Offline test passed';
}

async function runMigrationTest(browser) {
  const page = await preparePage(browser, {
    seedStorage: () => {
      localStorage.setItem('wordSafari_progression', JSON.stringify({
        playerLevel: 4,
        currentXP: 72,
        stats: {
          gamesPlayed: 5,
          highScore: 220,
          animalsDiscovered: 2,
          dayStreak: 3,
          totalXP: 310,
          perfectRounds: 1,
          fastestLevel: 42,
          biomesVisited: 2,
          wordsSpelled: 9,
          dailyQuestsCompleted: 2,
          maxCombo: 4,
          levelsInSession: 1,
          vocabularyLearned: 7,
          factsRead: 3,
          discoveredAnimals: ['lion', 'elephant'],
          lastPlayDate: new Date().toDateString()
        }
      }));
      localStorage.setItem('wordSafari_achievements', JSON.stringify([
        { id: 'safari_starter', unlocked: true }
      ]));
      localStorage.setItem('wordSafari_difficulty', 'hard');
    }
  });

  await page.goto(BASE_URL, { waitUntil: 'networkidle0' });

  const migrationState = await page.evaluate(() => {
    const progression = JSON.parse(localStorage.getItem('wordSafari_progression') || '{}');
    const achievements = JSON.parse(localStorage.getItem('wordSafari_achievements') || '{}');
    const activeDifficulty = document.querySelector('.difficulty-btn.active')?.dataset.difficulty;

    return {
      progressionSchemaVersion: progression.schemaVersion,
      playerLevel: progression.playerLevel,
      discoveredAnimalsLength: progression?.stats?.discoveredAnimals?.length,
      hasLearnedAttributesArray: Array.isArray(progression?.stats?.learnedAttributes),
      currentDifficulty: progression.currentDifficulty,
      activeDifficulty,
      achievementSchemaVersion: achievements.schemaVersion,
      achievementsShapeValid: Array.isArray(achievements.achievements)
    };
  });

  assert(migrationState.progressionSchemaVersion === 2, 'Progression schema should migrate to v2.');
  assert(migrationState.playerLevel === 4, 'Migrated progression should preserve player level.');
  assert(migrationState.discoveredAnimalsLength === 2, 'Migrated progression should preserve discovered animals.');
  assert(migrationState.hasLearnedAttributesArray, 'Migrated progression should include learnedAttributes array.');
  assert(migrationState.currentDifficulty === 'hard', 'Difficulty should persist in migrated progression.');
  assert(migrationState.activeDifficulty === 'hard', 'UI difficulty selection should reflect persisted value.');
  assert(migrationState.achievementSchemaVersion === 2, 'Achievement schema should migrate to v2.');
  assert(migrationState.achievementsShapeValid, 'Achievement storage should use object schema with achievements array.');

  await page.close();
  return 'Migration test passed';
}

async function runUiFlowTest(browser) {
  const page = await preparePage(browser, {
    seedStorage: () => {
      localStorage.removeItem('wordSafari_welcome_seen_v3');
    }
  });

  await page.goto(BASE_URL, { waitUntil: 'networkidle0' });

  const welcomeVisible = await page.$eval('#welcome-modal', (el) => el.classList.contains('active'));
  assert(welcomeVisible, 'Welcome modal should open for first-time visits.');

  await page.click('#btn-welcome-start');
  await page.waitForFunction(() => {
    const modal = document.getElementById('welcome-modal');
    return modal && !modal.classList.contains('active');
  }, { timeout: 3000 });

  await page.click('#btn-open-settings');
  await page.waitForFunction(() => {
    const modal = document.getElementById('settings-modal');
    return modal && modal.classList.contains('active');
  }, { timeout: 3000 });

  await page.$eval('#settings-volume', (el) => {
    el.value = '35';
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });

  const volumeLabel = await page.$eval('#settings-volume-value', (el) => el.textContent.trim());
  assert(volumeLabel === '35%', 'Settings volume display should update after slider input.');

  await page.click('#settings-reduced-motion');
  const hasReducedMotionClass = await page.$eval('body', (el) => el.classList.contains('reduced-motion'));
  assert(hasReducedMotionClass, 'Reduced motion toggle should apply reduced-motion class on body.');

  await page.click('#btn-settings-done');
  await page.waitForFunction(() => {
    const modal = document.getElementById('settings-modal');
    return modal && !modal.classList.contains('active');
  }, { timeout: 3000 });

  await page.click('#btn-play');
  await page.waitForFunction(() => {
    const game = document.getElementById('game-screen');
    return game && game.classList.contains('active');
  }, { timeout: 4000 });

  await page.click('#btn-pause');
  await page.waitForFunction(() => {
    const pause = document.getElementById('pause-modal');
    return pause && pause.classList.contains('active');
  }, { timeout: 3000 });

  await page.click('#btn-settings');
  await page.waitForFunction(() => {
    const settings = document.getElementById('settings-modal');
    const pause = document.getElementById('pause-modal');
    return settings && pause && settings.classList.contains('active') && !pause.classList.contains('active');
  }, { timeout: 3000 });

  await page.click('#btn-settings-done');
  await page.waitForFunction(() => {
    const settings = document.getElementById('settings-modal');
    const pause = document.getElementById('pause-modal');
    return settings && pause && !settings.classList.contains('active') && pause.classList.contains('active');
  }, { timeout: 3000 });

  await page.click('#btn-resume');
  await page.waitForFunction(() => {
    const pause = document.getElementById('pause-modal');
    return pause && !pause.classList.contains('active');
  }, { timeout: 3000 });

  await page.close();
  return 'UI flow test passed';
}

async function runAdventureCompletionTest(browser) {
  const page = await preparePage(browser, {
    seedStorage: () => {
      localStorage.removeItem('wordSafari_welcome_seen_v3');
    }
  });

  await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => {
    const modal = document.getElementById('welcome-modal');
    return modal && modal.classList.contains('active');
  }, { timeout: 3000 });
  await page.click('#btn-welcome-start');
  await page.waitForFunction(() => {
    const modal = document.getElementById('welcome-modal');
    return modal && !modal.classList.contains('active');
  }, { timeout: 3000 });
  await page.click('#btn-play');
  await page.waitForFunction(() => {
    const game = document.getElementById('game-screen');
    return game && game.classList.contains('active');
  }, { timeout: 4000 });

  const progressWidth = await page.evaluate(async () => {
    const { gameManager } = await import('./js/game.js');
    gameManager.score = 180;
    gameManager.level = 2;
    gameManager.timeRemaining = 45;
    gameManager.updateHUD();
    return document.getElementById('progress-bar').style.width;
  });

  assert(progressWidth === '80%', `Progress bar should show 80% for level 2 at score 180. Got "${progressWidth}".`);

  const completionState = await page.evaluate(async () => {
    const { gameManager } = await import('./js/game.js');
    gameManager.score = 1200;
    gameManager.level = 12;
    gameManager.biome = 'ocean';
    gameManager.timeRemaining = 18;
    gameManager.startTime = Date.now() - 5000;
    gameManager.isPlaying = true;
    gameManager.updateHUD();
    gameManager.nextRound();

    return {
      endActive: document.getElementById('end-screen').classList.contains('active'),
      title: document.querySelector('#end-screen .screen-title')?.textContent?.trim(),
      message: document.getElementById('end-message')?.textContent?.trim(),
      level: document.getElementById('end-level')?.textContent?.trim()
    };
  });

  assert(completionState.endActive, 'Adventure should end when the final level target is reached.');
  assert(completionState.title === '🏁 Adventure Complete!', `Expected completion title, got "${completionState.title}".`);
  assert(
    completionState.message.includes('Adventure complete') || completionState.message.includes('completed every biome'),
    `Completion message should describe the completed journey. Got "${completionState.message}".`
  );
  assert(completionState.level === '12', `Final level should remain 12 on completion. Got "${completionState.level}".`);

  await page.close();
  return 'Adventure completion test passed';
}

async function runScenario(browser, scenario) {
  const scenarios = {
    smoke: runSmokeTest,
    pwa: runPwaTest,
    'pwa-mobile': runPwaMobileTest,
    offline: runOfflineTest,
    migration: runMigrationTest,
    uiflow: runUiFlowTest,
    adventure: runAdventureCompletionTest
  };

  if (scenario === 'readiness') {
    const ordered = ['smoke', 'pwa', 'offline', 'migration', 'uiflow', 'adventure'];
    const results = [];

    for (const name of ordered) {
      const result = await scenarios[name](browser);
      results.push({ name, result });
    }

    return results;
  }

  const handler = scenarios[scenario];
  if (!handler) {
    throw new Error(`Unknown scenario "${scenario}".`);
  }

  return handler(browser);
}

(async () => {
  const { scenario } = parseArgs();
  const server = await startStaticServer();

  let browser;
  try {
    browser = await launchBrowser();
    const results = await runScenario(browser, scenario);

    if (Array.isArray(results)) {
      console.log('Readiness scenarios complete:');
      results.forEach(({ name, result }) => console.log(`- ${name}: ${result}`));
    } else {
      console.log(results);
    }

    process.exitCode = 0;
  } catch (error) {
    console.error('Test run failed:', error.message);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    server.close();
  }
})();
