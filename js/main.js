import './data.js';
import './audio.js';
import './achievements.js';
import './progression.js';
import './game.js';
import './ui.js';

const APP_VERSION = '3.2.0';
const SW_UPDATE_EVENT = 'sw-update-available';
const PWA_INSTALL_AVAILABILITY_EVENT = 'pwa-install-availability';
const PWA_INSTALL_REQUEST_EVENT = 'pwa-install-request';
const PWA_INSTALL_RESULT_EVENT = 'pwa-install-result';

let deferredInstallPrompt = null;
let isRefreshingForUpdate = false;

function isStandaloneMode() {
    return window.matchMedia('(display-mode: standalone)').matches
        || window.matchMedia('(display-mode: fullscreen)').matches
        || window.navigator.standalone === true;
}

function getPwaEnvironment() {
    const ua = navigator.userAgent || '';
    return {
        isStandalone: isStandaloneMode(),
        isIos: /\b(iPad|iPhone|iPod)\b/i.test(ua),
        isAndroid: /\bAndroid\b/i.test(ua),
        isInAppBrowser: /(FBAN|FBAV|Instagram|Line\/|MicroMessenger|wv\)|; wv\)|Snapchat|TikTok|Twitter)/i.test(ua),
        isSecure: window.isSecureContext || window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost',
        supportsServiceWorker: 'serviceWorker' in navigator
    };
}

function buildInstallState() {
    const environment = getPwaEnvironment();
    const installed = environment.isStandalone || localStorage.getItem('wordSafari_pwa_installed') === 'yes';

    if (installed) {
        return {
            ...environment,
            installed: true,
            canInstall: false,
            mode: 'installed',
            message: 'Word Safari is already installed on this device.',
            steps: []
        };
    }

    if (!environment.supportsServiceWorker || !environment.isSecure) {
        return {
            ...environment,
            installed: false,
            canInstall: false,
            mode: 'unsupported',
            message: 'PWA install needs HTTPS and a browser with service worker support.',
            steps: []
        };
    }

    if (environment.isInAppBrowser) {
        return {
            ...environment,
            installed: false,
            canInstall: false,
            mode: 'external-browser',
            message: 'Open Word Safari in Safari, Chrome, or Samsung Internet to install it properly.',
            steps: [
                'Open the browser menu in this app.',
                'Choose Open in Safari or Open in Browser.',
                'Install Word Safari from the main browser.'
            ]
        };
    }

    if (environment.isIos) {
        return {
            ...environment,
            installed: false,
            canInstall: false,
            mode: 'manual-ios',
            message: 'Safari on iPhone and iPad uses Share > Add to Home Screen instead of the automatic install prompt.',
            steps: [
                'Tap the Share button in Safari.',
                'Scroll down and tap Add to Home Screen.',
                'Tap Add to finish installing Word Safari.'
            ]
        };
    }

    if (deferredInstallPrompt) {
        return {
            ...environment,
            installed: false,
            canInstall: true,
            mode: 'prompt',
            message: 'This browser is ready to install Word Safari.',
            steps: []
        };
    }

    if (environment.isAndroid) {
        return {
            ...environment,
            installed: false,
            canInstall: false,
            mode: 'manual-android',
            message: 'If no prompt appears, install Word Safari from your browser menu.',
            steps: [
                'Open the browser menu.',
                'Tap Install app or Add to Home screen.',
                'Confirm Install or Add.'
            ]
        };
    }

    return {
        ...environment,
        installed: false,
        canInstall: false,
        mode: 'manual-browser',
        message: 'Use your browser menu to install or save Word Safari.',
        steps: [
            'Open the browser menu.',
            'Choose Install app or Add to Home Screen.'
        ]
    };
}

function dispatchInstallAvailability() {
    window.dispatchEvent(new CustomEvent(PWA_INSTALL_AVAILABILITY_EVENT, {
        detail: buildInstallState()
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

    const register = async () => {
        try {
            const registration = await navigator.serviceWorker.register('./sw.js', {
                scope: './',
                updateViaCache: 'none'
            });
            watchServiceWorker(registration);

            navigator.serviceWorker.addEventListener('controllerchange', () => {
                if (isRefreshingForUpdate) return;
                isRefreshingForUpdate = true;
                window.location.reload();
            });
        } catch (error) {
            console.error('Service Worker registration failed:', error);
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', register, { once: true });
        return;
    }

    register();
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

    const displayModeMedia = window.matchMedia('(display-mode: standalone)');
    const handleVisibilityChange = () => {
        if (!document.hidden) {
            dispatchInstallAvailability();
        }
    };

    if (displayModeMedia.addEventListener) {
        displayModeMedia.addEventListener('change', dispatchInstallAvailability);
    } else if (displayModeMedia.addListener) {
        displayModeMedia.addListener(dispatchInstallAvailability);
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('DOMContentLoaded', dispatchInstallAvailability, { once: true });
    window.addEventListener('pageshow', dispatchInstallAvailability);
}

registerServiceWorker();
registerInstallLifecycle();
