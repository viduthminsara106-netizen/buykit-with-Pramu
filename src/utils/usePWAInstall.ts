import { useEffect, useState, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const INSTALLED_STORAGE_KEY = 'buykit_pwa_installed_v1';

export function checkIsRunningAsInstalledApp(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    // 1. Check persisted install flag in localStorage
    if (window.localStorage.getItem(INSTALLED_STORAGE_KEY) === 'true') {
      return true;
    }

    // 2. Check URL query parameter added by manifest start_url (/?source=pwa)
    const urlParams = new URLSearchParams(window.location.search);
    if (
      urlParams.get('source') === 'pwa' ||
      urlParams.get('mode') === 'standalone' ||
      urlParams.get('utm_source') === 'pwa'
    ) {
      window.localStorage.setItem(INSTALLED_STORAGE_KEY, 'true');
      return true;
    }
  } catch {
    // Ignore storage access errors in restricted contexts
  }

  // 3. Check standard & fallback PWA display modes
  const isStandaloneDisplayMode =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    window.matchMedia('(display-mode: window-controls-overlay)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true;

  // 4. Check Android Trusted Web Activity (TWA) or Android APK WebView wrapper
  const isAndroidTwaOrApk =
    document.referrer.includes('android-app://') ||
    /; wv\)/.test(window.navigator.userAgent) ||
    /BuyKitApp/i.test(window.navigator.userAgent);

  if (isStandaloneDisplayMode || isAndroidTwaOrApk) {
    try {
      window.localStorage.setItem(INSTALLED_STORAGE_KEY, 'true');
    } catch {
      // Ignore storage errors
    }
    return true;
  }

  return false;
}

export function markPWAAsInstalled(): void {
  try {
    window.localStorage.setItem(INSTALLED_STORAGE_KEY, 'true');
  } catch {
    // Ignore storage errors
  }
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(() =>
    checkIsRunningAsInstalledApp()
  );
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  const confirmInstalled = useCallback(() => {
    markPWAAsInstalled();
    setIsInstalled(true);
    setDeferredPrompt(null);
  }, []);

  useEffect(() => {
    if (checkIsRunningAsInstalledApp()) {
      setIsInstalled(true);
    }

    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));
    setIsAndroid(/android/.test(userAgent));

    // Check navigator.getInstalledRelatedApps() when supported on Android Chrome
    const navWithRelated = window.navigator as Navigator & {
      getInstalledRelatedApps?: () => Promise<Array<{ id?: string; platform?: string; url?: string }>>;
    };
    if (typeof navWithRelated.getInstalledRelatedApps === 'function') {
      navWithRelated
        .getInstalledRelatedApps()
        .then((apps) => {
          if (Array.isArray(apps) && apps.length > 0) {
            confirmInstalled();
          }
        })
        .catch(() => {
          // Ignore unsupported errors
        });
    }

    // Watch for display-mode changes dynamically
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        confirmInstalled();
      }
    };
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleDisplayModeChange);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      // Only store prompt if not already running as installed app
      if (!checkIsRunningAsInstalledApp()) {
        setDeferredPrompt(e as BeforeInstallPromptEvent);
      }
    };

    const handleAppInstalled = () => {
      confirmInstalled();
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      if (typeof mediaQuery.removeEventListener === 'function') {
        mediaQuery.removeEventListener('change', handleDisplayModeChange);
      }
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [confirmInstalled]);

  const install = async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      confirmInstalled();
      return true;
    }
    return false;
  };

  return {
    isInstallable: !!deferredPrompt && !isInstalled,
    isInstalled,
    isIOS,
    isAndroid,
    install,
    confirmInstalled,
  };
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
