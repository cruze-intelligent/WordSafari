/**
 * 🎨 Word Safari: Enhanced UI Management
 */

import { gameManager, spellingBeeManager, dailyQuestManager, sentenceBuilderManager } from './game.js';
import { playSound, toggleMute, setVolume, getVolume, setMuted, isMuted } from './audio.js';
import { achievementManager } from './achievements.js';
import { progressionManager } from './progression.js';

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/* ========================================
   UI MANAGER CLASS
   ======================================== */
class UIManager {
    constructor() {
        this.uiSettingsKey = 'wordSafari_ui_settings';
        this.returnToPauseAfterSettings = false;
        this.pwaInstallState = {
            installed: false,
            canInstall: false,
            mode: 'unknown',
            message: 'Install prompt will appear when supported by your browser.',
            steps: []
        };
        this.uiSettings = this.loadUISettings();

        this.currentScreen = 'start';
        this.screens = ['start', 'game', 'spelling', 'daily', 'sentence', 'end'];

        this.applyReducedMotion();
        this.initializeEventListeners();
        this.syncDifficultyButtons();
        this.syncSettingsPanelState();
        this.updateStatsDisplay();
    }

    loadUISettings() {
        const defaults = { reducedMotion: false };
        const raw = localStorage.getItem(this.uiSettingsKey);
        if (!raw) return defaults;

        try {
            const parsed = JSON.parse(raw);
            return { reducedMotion: Boolean(parsed.reducedMotion) };
        } catch (error) {
            console.warn('UI settings were corrupted and reset to defaults.');
            return defaults;
        }
    }

    saveUISettings() {
        localStorage.setItem(this.uiSettingsKey, JSON.stringify(this.uiSettings));
    }

    initializeEventListeners() {
        // Start screen buttons
        document.getElementById('btn-play')?.addEventListener('click', () => {
            playSound('click');
            this.startGame();
        });

        document.getElementById('btn-spelling')?.addEventListener('click', () => {
            playSound('click');
            this.showSpellingBee();
        });

        document.getElementById('btn-daily')?.addEventListener('click', () => {
            playSound('click');
            this.showDailyQuest();
        });

        document.getElementById('btn-sentence')?.addEventListener('click', () => {
            playSound('click');
            this.showSentenceBuilder();
        });

        document.getElementById('btn-achievements')?.addEventListener('click', () => {
            playSound('click');
            this.showAchievements();
        });

        document.getElementById('btn-instructions')?.addEventListener('click', () => {
            playSound('click');
            this.showInstructions();
        });

        document.getElementById('btn-open-settings')?.addEventListener('click', () => {
            playSound('click');
            this.showSettings(false);
        });

        // Difficulty selector
        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                playSound('click');
                document.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const difficulty = btn.dataset.difficulty;
                progressionManager.setDifficulty(difficulty);
            });
        });

        // Sound toggle
        document.getElementById('sound-toggle')?.addEventListener('click', () => {
            playSound('click');
            toggleMute();
            this.syncSettingsPanelState();
        });

        // Achievements modal
        document.getElementById('achievements-close')?.addEventListener('click', () => {
            playSound('click');
            this.hideAchievements();
        });

        // Instructions modal
        document.getElementById('modal-close')?.addEventListener('click', () => {
            playSound('click');
            this.hideInstructions();
        });

        document.getElementById('btn-start-instructions')?.addEventListener('click', () => {
            playSound('click');
            this.hideInstructions();
            this.startGame();
        });

        // Game screen
        document.getElementById('btn-pause')?.addEventListener('click', () => {
            playSound('click');
            this.showPauseMenu();
        });

        // Pause menu
        document.getElementById('btn-resume')?.addEventListener('click', () => {
            playSound('click');
            this.hidePauseMenu();
            gameManager.resumeGame();
        });

        document.getElementById('btn-restart')?.addEventListener('click', () => {
            playSound('click');
            this.hidePauseMenu();
            this.startGame();
        });

        document.getElementById('btn-settings')?.addEventListener('click', () => {
            playSound('click');
            this.hidePauseMenu();
            this.showSettings(true);
        });

        document.getElementById('btn-quit')?.addEventListener('click', () => {
            playSound('click');
            this.hidePauseMenu();
            this.showScreen('start');
            this.updateStatsDisplay();
        });

        // Settings modal
        document.getElementById('settings-close')?.addEventListener('click', () => {
            playSound('click');
            this.hideSettings();
        });

        document.getElementById('btn-settings-done')?.addEventListener('click', () => {
            playSound('click');
            this.hideSettings();
        });

        document.getElementById('settings-volume')?.addEventListener('input', (e) => {
            const value = Number(e.target.value);
            this.updateVolumeValue(value);
            setVolume(value / 100);
        });

        document.getElementById('settings-mute')?.addEventListener('change', (e) => {
            setMuted(Boolean(e.target.checked));
            this.syncSettingsPanelState();
        });

        document.getElementById('settings-reduced-motion')?.addEventListener('change', (e) => {
            this.uiSettings.reducedMotion = Boolean(e.target.checked);
            this.saveUISettings();
            this.applyReducedMotion();
        });

        // Welcome / install modal
        document.getElementById('welcome-close')?.addEventListener('click', () => {
            playSound('click');
            this.hideWelcomePanel();
        });

        document.getElementById('btn-welcome-start')?.addEventListener('click', () => {
            playSound('click');
            this.hideWelcomePanel();
        });

        document.getElementById('btn-welcome-install')?.addEventListener('click', () => {
            playSound('click');
            const statusEl = document.getElementById('welcome-install-status');
            if (statusEl) statusEl.textContent = 'Opening install prompt...';
            window.dispatchEvent(new CustomEvent('pwa-install-request'));
        });

        window.addEventListener('pwa-install-availability', (event) => {
            this.pwaInstallState = {
                ...this.pwaInstallState,
                ...(event.detail || {})
            };
            this.updateWelcomeInstallState();
        });

        window.addEventListener('pwa-install-result', (event) => {
            const outcome = event.detail?.outcome;
            const statusEl = document.getElementById('welcome-install-status');

            if (outcome === 'accepted') {
                localStorage.setItem('wordSafari_pwa_installed', 'yes');
                if (statusEl) statusEl.textContent = 'Installed! You can launch Word Safari from your home screen.';
            } else if (outcome === 'dismissed') {
                if (statusEl) statusEl.textContent = 'Install dismissed. You can always install later from this panel.';
            }

            this.updateWelcomeInstallState();
        });

        // Animal fact card
        document.getElementById('fact-close')?.addEventListener('click', () => {
            playSound('click');
            document.getElementById('fact-modal').classList.remove('active');
        });

        document.getElementById('btn-fact-close')?.addEventListener('click', () => {
            playSound('click');
            document.getElementById('fact-modal').classList.remove('active');
        });

        // Daily Quest result modal
        document.getElementById('daily-result-close')?.addEventListener('click', () => {
            playSound('click');
            this.hideDailyQuestResult();
        });

        document.getElementById('btn-daily-result-ok')?.addEventListener('click', () => {
            playSound('click');
            this.hideDailyQuestResult();
        });

        // Spelling bee
        document.getElementById('btn-play-word')?.addEventListener('click', () => {
            playSound('click');
            spellingBeeManager.playWordAudio();
        });

        document.getElementById('btn-check-spelling')?.addEventListener('click', () => {
            playSound('click');
            spellingBeeManager.checkSpelling();
        });

        document.getElementById('btn-spelling-skip')?.addEventListener('click', () => {
            playSound('click');
            spellingBeeManager.skipWord();
        });

        document.getElementById('btn-back-spelling')?.addEventListener('click', () => {
            playSound('click');
            this.showScreen('start');
            this.updateStatsDisplay();
        });

        document.getElementById('spelling-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                playSound('click');
                spellingBeeManager.checkSpelling();
            }
        });

        // Daily quest
        document.getElementById('btn-back-daily')?.addEventListener('click', () => {
            playSound('click');
            dailyQuestManager.resetQuest();
            this.showScreen('start');
            this.updateStatsDisplay();
        });

        // Sentence Builder
        document.getElementById('btn-check-sentence')?.addEventListener('click', () => {
            playSound('click');
            sentenceBuilderManager.checkSentence();
        });

        document.getElementById('btn-sentence-skip')?.addEventListener('click', () => {
            playSound('click');
            sentenceBuilderManager.skipSentence();
        });

        document.getElementById('btn-back-sentence')?.addEventListener('click', () => {
            playSound('click');
            this.showScreen('start');
            this.updateStatsDisplay();
        });

        // End screen
        document.getElementById('btn-play-again')?.addEventListener('click', () => {
            playSound('click');
            this.startGame();
        });

        document.getElementById('btn-menu')?.addEventListener('click', () => {
            playSound('click');
            this.showScreen('start');
            this.updateStatsDisplay();
        });

        // Modal click outside
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    playSound('click');
                    if (modal.id === 'settings-modal') {
                        this.hideSettings();
                    } else if (modal.id === 'welcome-modal') {
                        this.hideWelcomePanel();
                    } else {
                        modal.classList.remove('active');
                    }
                }
            });
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (document.getElementById('settings-modal')?.classList.contains('active')) {
                    this.hideSettings();
                    return;
                }

                if (document.getElementById('welcome-modal')?.classList.contains('active')) {
                    this.hideWelcomePanel();
                    return;
                }

                if (this.currentScreen === 'game' && gameManager.isPlaying) {
                    this.showPauseMenu();
                } else {
                    document.querySelectorAll('.modal.active').forEach(modal => {
                        modal.classList.remove('active');
                    });
                }
            }
            if (e.key.toLowerCase() === 'm') {
                toggleMute();
                this.syncSettingsPanelState();
            }
        });
    }

    updateStatsDisplay() {
        const stats = progressionManager.getStats();

        document.getElementById('stat-high-score').textContent = stats.highScore;
        document.getElementById('stat-animals').textContent = stats.animalsDiscovered;
        document.getElementById('stat-streak').textContent = stats.dayStreak;
        document.getElementById('stat-level').textContent = stats.playerLevel;
    }

    syncDifficultyButtons() {
        const difficulty = progressionManager.getDifficulty();
        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.difficulty === difficulty);
        });
    }

    updateVolumeValue(value) {
        const valueEl = document.getElementById('settings-volume-value');
        if (valueEl) valueEl.textContent = `${Math.round(value)}%`;
    }

    syncSettingsPanelState() {
        const volume = Math.round(getVolume() * 100);
        const volumeInput = document.getElementById('settings-volume');
        const muteInput = document.getElementById('settings-mute');
        const reduceMotionInput = document.getElementById('settings-reduced-motion');

        if (volumeInput) volumeInput.value = String(volume);
        this.updateVolumeValue(volume);
        if (muteInput) muteInput.checked = isMuted();
        if (reduceMotionInput) reduceMotionInput.checked = Boolean(this.uiSettings.reducedMotion);
    }

    applyReducedMotion() {
        document.body.classList.toggle('reduced-motion', Boolean(this.uiSettings.reducedMotion));
    }

    updateWelcomeInstallState() {
        const installBtn = document.getElementById('btn-welcome-install');
        const statusEl = document.getElementById('welcome-install-status');
        const stepsEl = document.getElementById('welcome-install-steps');
        const installState = this.pwaInstallState || {};
        const alreadyInstalled = Boolean(installState.installed) || localStorage.getItem('wordSafari_pwa_installed') === 'yes';

        const setSteps = (steps) => {
            if (!stepsEl) return;
            const normalizedSteps = Array.isArray(steps) ? steps : [];

            if (!normalizedSteps.length) {
                stepsEl.innerHTML = '';
                stepsEl.classList.add('hidden');
                return;
            }

            stepsEl.innerHTML = normalizedSteps
                .map((step) => `<li>${escapeHtml(step)}</li>`)
                .join('');
            stepsEl.classList.remove('hidden');
        };

        if (alreadyInstalled) {
            if (installBtn) installBtn.classList.add('hidden');
            if (statusEl) statusEl.textContent = 'Word Safari is already installed on this device.';
            setSteps([]);
            return;
        }

        if (installState.canInstall) {
            if (installBtn) installBtn.classList.remove('hidden');
            if (installBtn) installBtn.textContent = '⬇️ Install App';
            if (statusEl) statusEl.textContent = installState.message || 'This device supports install. Tap Install App to continue.';
            setSteps([]);
            return;
        }

        if (installBtn) installBtn.classList.add('hidden');
        if (statusEl) statusEl.textContent = installState.message || 'Install prompt will appear when supported by your browser.';
        setSteps(installState.steps);
    }

    showScreen(name) {
        this.screens.forEach(s => {
            const el = document.getElementById(`${s}-screen`);
            if (el) el.classList.remove('active');
        });

        const target = document.getElementById(`${name}-screen`);
        if (target) {
            target.classList.add('active');
            this.currentScreen = name;
        }

        if (name === 'start') {
            this.updateStatsDisplay();
        }
    }

    startGame() {
        this.showScreen('game');
        gameManager.startGame();
    }

    showPauseMenu() {
        gameManager.pauseGame();
        document.getElementById('pause-modal').classList.add('active');
    }

    hidePauseMenu() {
        document.getElementById('pause-modal').classList.remove('active');
    }

    showSettings(returnToPause = false) {
        this.returnToPauseAfterSettings = returnToPause;
        this.syncSettingsPanelState();
        document.getElementById('settings-modal')?.classList.add('active');
    }

    hideSettings() {
        document.getElementById('settings-modal')?.classList.remove('active');

        if (this.returnToPauseAfterSettings && this.currentScreen === 'game') {
            document.getElementById('pause-modal')?.classList.add('active');
        }

        this.returnToPauseAfterSettings = false;
    }

    showWelcomePanel() {
        this.updateWelcomeInstallState();
        document.getElementById('welcome-modal')?.classList.add('active');
    }

    hideWelcomePanel() {
        document.getElementById('welcome-modal')?.classList.remove('active');
    }

    maybeShowWelcomePanel() {
        this.showWelcomePanel();
    }

    showSpellingBee() {
        this.showScreen('spelling');
        spellingBeeManager.startSpellingBee();
    }

    showDailyQuest() {
        this.showScreen('daily');
        dailyQuestManager.startDailyQuest();
    }

    showDailyQuestResult(correct, total, score) {
        this.showScreen('start');
        this.updateStatsDisplay();

        const modal = document.getElementById('daily-result-modal');
        const scoreEl = document.getElementById('daily-result-score');
        const ratioEl = document.getElementById('daily-result-ratio');

        if (scoreEl) scoreEl.textContent = score;
        if (ratioEl) ratioEl.textContent = `${correct}/${total}`;
        if (modal) modal.classList.add('active');
    }

    hideDailyQuestResult() {
        const modal = document.getElementById('daily-result-modal');
        if (modal) modal.classList.remove('active');
    }

    showSentenceBuilder() {
        this.showScreen('sentence');
        sentenceBuilderManager.start();
    }

    showAchievements() {
        achievementManager.renderGrid();
        document.getElementById('achievements-modal').classList.add('active');
    }

    hideAchievements() {
        document.getElementById('achievements-modal').classList.remove('active');
    }

    showEndScreen(score, level, stars, xpEarned, newAchievements = [], options = {}) {
        const { completed = false } = options;
        this.showScreen('end');

        const titleEl = document.querySelector('#end-screen .screen-title');
        document.getElementById('end-score').textContent = score;
        document.getElementById('end-level').textContent = level;
        document.getElementById('end-stars').textContent = '⭐'.repeat(stars);
        document.getElementById('end-xp').textContent = `+${xpEarned} XP`;
        if (titleEl) titleEl.textContent = completed ? '🏁 Adventure Complete!' : '🎉 Game Over!';

        const msg = this.getEndMessage(stars, { completed });
        document.getElementById('end-message').innerHTML = `<p>${msg}</p>`;

        const unlockedContainer = document.getElementById('unlocked-achievements');
        if (newAchievements.length > 0) {
            unlockedContainer.innerHTML = newAchievements.map(ach => `
                <div class="unlocked-achievement">
                    <div class="unlocked-achievement-icon">${ach.icon}</div>
                    <div class="unlocked-achievement-info">
                        <div class="unlocked-achievement-name">${ach.name}</div>
                        <div class="unlocked-achievement-desc">${ach.description}</div>
                    </div>
                </div>
            `).join('');

            newAchievements.forEach((ach, index) => {
                setTimeout(() => achievementManager.showNotification(ach), index * 1000);
            });
        } else {
            unlockedContainer.innerHTML = '';
        }
    }

    getEndMessage(stars, options = {}) {
        if (options.completed) {
            if (stars === 3) return '🏆 You completed every biome from savanna to ocean with a masterful run!';
            if (stars === 2) return '🌍 Adventure complete! You made it through every biome and reached the ocean finish.';
            return '🗺️ Adventure complete! You reached the end of the safari and finished the full journey.';
        }

        if (stars === 3) return '🎉 Outstanding! You\'re a Safari Master! 🦁';
        if (stars === 2) return '👏 Great job! Keep exploring! 🦒';
        return '🌟 Good effort! Practice makes perfect! 🐘';
    }

    showInstructions() {
        document.getElementById('instructions-modal')?.classList.add('active');
    }

    hideInstructions() {
        document.getElementById('instructions-modal')?.classList.remove('active');
    }

    isMobile() {
        return window.innerWidth <= 768;
    }

    updateLayout() {
        if (this.isMobile()) document.body.classList.add('mobile');
        else document.body.classList.remove('mobile');
    }
}

/* ========================================
   INITIALIZE UI MANAGER
   ======================================== */
const uiManager = new UIManager();
window.uiManager = uiManager;
uiManager.maybeShowWelcomePanel();

window.addEventListener('resize', () => uiManager.updateLayout());
window.addEventListener('load', () => {
    uiManager.updateLayout();
    uiManager.updateStatsDisplay();
    uiManager.syncSettingsPanelState();
    uiManager.updateWelcomeInstallState();
});

// Prevent default behaviors
document.addEventListener('dragstart', e => {
    if (e.target.tagName === 'IMG' || e.target.tagName === 'SVG') e.preventDefault();
});

document.addEventListener('contextmenu', e => {
    if (e.target.closest('.animal-card') || e.target.closest('.game-area')) e.preventDefault();
});

export { uiManager };
