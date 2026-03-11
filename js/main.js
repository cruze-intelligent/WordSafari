import './data.js';
import './audio.js';
import './achievements.js';
import './progression.js';
import './game.js';
import './ui.js';

const APP_VERSION = '3.1.0';
const SW_UPDATE_EVENT = 'sw-update-available';
const PWA_INSTALL_AVAILABILITY_EVENT = 'pwa-install-availability';
const PWA_INSTALL_REQUEST_EVENT = 'pwa-install-request';
const PWA_INSTALL_RESULT_EVENT = 'pwa-install-result';

let deferredInstallPrompt = null;

function dispatchInstallAvailability() {
    window.dispatchEvent(new CustomEvent(PWA_INSTALL_AVAILABILITY_EVENT, {
        detail: { canInstall: Boolean(deferredInstallPrompt) }
    }));
}

function getUpdateBannerElements() {
    const banner = document.getElementById('sw-update-banner');
    const refreshBtn = document.getElementById('btn-sw-refresh');
    const dismissBtn = document.getElementById('btn-sw-dismiss');
    return { banner, refreshBtn, dismissBtn };
}

function showUpdateBanner(registration) {
    const { banner, refreshBtn, dismissBtn } = getUpdateBannerElements();
    if (!banner || !refreshBtn || !dismissBtn) return;

    banner.classList.remove('hidden');
    banner.dataset.visible = 'true';
    window.dispatchEvent(new CustomEvent(SW_UPDATE_EVENT, { detail: { version: APP_VERSION } }));

    refreshBtn.onclick = () => {
        if (registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
    };

    dismissBtn.onclick = () => {
        banner.classList.add('hidden');
        banner.dataset.visible = 'false';
    };
}

function watchServiceWorker(registration) {
    if (registration.waiting) {
        showUpdateBanner(registration);
    }

    registration.addEventListener('updatefound', () => {
        const installingWorker = registration.installing;
        if (!installingWorker) return;

        installingWorker.addEventListener('statechange', () => {
            if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                showUpdateBanner(registration);
            }
        });
    });
}

function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;

    window.addEventListener('load', async () => {
        try {
            const registration = await navigator.serviceWorker.register('./sw.js');
            watchServiceWorker(registration);

            navigator.serviceWorker.addEventListener('controllerchange', () => {
                window.location.reload();
            });
        } catch (error) {
            console.error('Service Worker registration failed:', error);
        }
    });
}

function registerInstallLifecycle() {
    window.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault();
        deferredInstallPrompt = event;
        dispatchInstallAvailability();
    });

    window.addEventListener('appinstalled', () => {
        deferredInstallPrompt = null;
        localStorage.setItem('wordSafari_pwa_installed', 'yes');
        dispatchInstallAvailability();
    });

    window.addEventListener(PWA_INSTALL_REQUEST_EVENT, async () => {
        if (!deferredInstallPrompt) {
            dispatchInstallAvailability();
            return;
        }

        try {
            deferredInstallPrompt.prompt();
            const choice = await deferredInstallPrompt.userChoice;
            window.dispatchEvent(new CustomEvent(PWA_INSTALL_RESULT_EVENT, {
                detail: { outcome: choice.outcome }
            }));
        } catch (error) {
            console.error('PWA install prompt failed:', error);
        } finally {
            deferredInstallPrompt = null;
            dispatchInstallAvailability();
        }
    });

    window.addEventListener('load', () => {
        dispatchInstallAvailability();
    });
}

registerServiceWorker();
registerInstallLifecycle();
