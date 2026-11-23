import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Download,
  Smartphone,
  CheckCircle2,
  X,
  Share2,
  ShieldCheck,
  Sparkles,
  FileCode2,
} from 'lucide-react';
import {
  usePWAInstall,
  useOnlineStatus,
  checkIsRunningAsInstalledApp,
} from '../utils/usePWAInstall';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-20 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-bold text-white shadow-lg">
      <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
      <span>Offline Mode — Cached BuyKit data is being used.</span>
    </div>
  );
};

interface PWAInstallButtonProps {
  variant?: 'header' | 'floating';
  searchQuery?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'header',
  searchQuery = '',
}) => {
  const {
    isInstallable,
    isInstalled,
    isIOS,
    isAndroid,
    install,
    confirmInstalled,
  } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [installSuccessMsg, setInstallSuccessMsg] = useState(false);

  // State for the animated bottom notification toast
  const [isNotificationVisible, setIsNotificationVisible] = useState(false);
  const [notificationContext, setNotificationContext] = useState<
    'visit' | 'search' | 'scroll' | 'stay'
  >('visit');
  const lastShownTimestampRef = useRef<number>(0);
  const hasTriggeredScrollRef = useRef<boolean>(false);
  const isInstalledRef = useRef<boolean>(isInstalled);

  useEffect(() => {
    isInstalledRef.current = isInstalled;
    if (isInstalled) {
      setIsNotificationVisible(false);
      setShowGuideModal(false);
    }
  }, [isInstalled]);

  // Trigger helper with cooldown so it animates smoothly without spamming,
  // and NEVER shows if the app is already installed or opened in standalone/APK mode.
  const triggerBottomNotification = (
    reason: 'visit' | 'search' | 'scroll' | 'stay',
    cooldownMs = 20000
  ) => {
    if (
      isInstalledRef.current ||
      checkIsRunningAsInstalledApp() ||
      showGuideModal
    ) {
      setIsNotificationVisible(false);
      return;
    }
    const now = Date.now();
    if (now - lastShownTimestampRef.current < cooldownMs) return;
    lastShownTimestampRef.current = now;
    setNotificationContext(reason);
    setIsNotificationVisible(true);
  };

  // 1. Trigger when visiting the site (initial page entry) & staying on the site
  useEffect(() => {
    if (
      variant !== 'floating' ||
      isInstalled ||
      checkIsRunningAsInstalledApp()
    ) {
      return;
    }

    const initialVisitTimer = window.setTimeout(() => {
      triggerBottomNotification('visit', 0);
    }, 1800);

    // Periodic dwell / stay timer while browsing the site
    const stayInterval = window.setInterval(() => {
      triggerBottomNotification('stay', 40000);
    }, 45000);

    return () => {
      window.clearTimeout(initialVisitTimer);
      window.clearInterval(stayInterval);
    };
  }, [variant, isInstalled]);

  // 2. Trigger when scrolling through products on the site
  useEffect(() => {
    if (
      variant !== 'floating' ||
      isInstalled ||
      checkIsRunningAsInstalledApp()
    ) {
      return;
    }

    const handleScroll = () => {
      if (isInstalledRef.current || checkIsRunningAsInstalledApp()) return;
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      if (scrollY > 380 && !hasTriggeredScrollRef.current) {
        hasTriggeredScrollRef.current = true;
        triggerBottomNotification('scroll', 15000);
      } else if (scrollY > 1400) {
        triggerBottomNotification('scroll', 35000);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [variant, isInstalled]);

  // 3. Trigger when searching for products
  useEffect(() => {
    if (
      variant !== 'floating' ||
      isInstalled ||
      checkIsRunningAsInstalledApp()
    ) {
      return;
    }
    if (!searchQuery || searchQuery.trim().length < 2) return;

    const searchTimer = window.setTimeout(() => {
      triggerBottomNotification('search', 12000);
    }, 700);

    return () => window.clearTimeout(searchTimer);
  }, [searchQuery, variant, isInstalled]);

  // Auto-hide notification after 12 seconds so it remains non-intrusive
  useEffect(() => {
    if (!isNotificationVisible) return;
    const hideTimer = window.setTimeout(() => {
      setIsNotificationVisible(false);
    }, 12000);
    return () => window.clearTimeout(hideTimer);
  }, [isNotificationVisible, notificationContext]);

  // Never render anything if already installed or running inside the installed app/APK
  if (isInstalled || checkIsRunningAsInstalledApp()) {
    return null;
  }

  const handlePrimaryClick = async () => {
    setIsNotificationVisible(false);
    if (isInstallable) {
      const accepted = await install();
      if (accepted) {
        setInstallSuccessMsg(true);
        return;
      }
    }
    setShowGuideModal(true);
  };

  const handleDownloadTwaManifest = () => {
    const origin =
      typeof window !== 'undefined' ? window.location.origin : 'https://buykit.lk';
    const host =
      typeof window !== 'undefined' ? window.location.host : 'buykit.lk';
    const twaConfig = {
      packageId: 'lk.buykit.pramu.app',
      host,
      name: 'BuyKit with Pramu',
      launcherName: 'BuyKit',
      display: 'standalone',
      themeColor: '#F85606',
      navigationColor: '#0A0A0C',
      backgroundColor: '#FAF9F6',
      enableNotifications: true,
      startUrl: '/?source=pwa',
      iconUrl: `${origin}/pwa-512x512.png`,
      maskableIconUrl: `${origin}/pwa-maskable-512x512.png`,
      webManifestUrl: `${origin}/manifest.webmanifest`,
      appVersionName: '1.0.0',
      appVersionCode: 1,
    };

    const blob = new Blob([JSON.stringify(twaConfig, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'buykit-android-twa-manifest.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const notificationCopy = {
    visit: {
      badge: 'BuyKit Mobile App',
      title: 'Download the BuyKit App for a smoother experience!',
      subtitle: 'Enjoy faster browsing, instant checkout & exclusive app-only flash deals.',
    },
    search: {
      badge: 'Faster Product Search',
      title: 'Get a smoother shopping experience with the BuyKit App!',
      subtitle: 'Download our app for instant search results and real-time price drop alerts.',
    },
    scroll: {
      badge: 'Smooth 60fps Browsing',
      title: 'Want a smoother, faster experience? Download the App!',
      subtitle: 'Install the lightweight BuyKit Android/iOS App in one tap.',
    },
    stay: {
      badge: 'BuyKit Official App',
      title: 'Switch to the BuyKit App for a smoother experience!',
      subtitle: 'Save mobile data and shop seamlessly anytime, even on low connections.',
    },
  }[notificationContext];

  return (
    <>
      {variant === 'header' && (
        <button
          type="button"
          onClick={handlePrimaryClick}
          title="Download & Install BuyKit App"
          className="inline-flex items-center gap-1.5 rounded-lg border border-orange-300 bg-[#FFF3EB] px-2.5 py-1.5 text-xs font-extrabold text-[#F85606] shadow-2xs transition-colors hover:bg-[#F85606] hover:text-white whitespace-nowrap shrink-0"
        >
          <Download className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden sm:inline">Get App</span>
          <span className="sm:hidden">App</span>
        </button>
      )}

      {/* Animated Bottom Notification Popup (English) */}
      {variant === 'floating' && (
        <AnimatePresence>
          {isNotificationVisible && (
            <motion.div
              initial={{ opacity: 0, y: 90, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 70, scale: 0.95 }}
              transition={{
                type: 'spring',
                stiffness: 380,
                damping: 26,
                mass: 0.8,
              }}
              className="fixed right-3 bottom-20 left-3 z-40 mx-auto max-w-md sm:right-6 sm:bottom-6 sm:left-auto sm:mx-0"
            >
              <div className="relative overflow-hidden rounded-2xl border border-orange-400/40 bg-gradient-to-r from-slate-950 via-slate-900 to-[#24120B] p-3.5 text-white shadow-2xl ring-1 ring-white/10">
                {/* Subtle animated glow bar at top */}
                <motion.div
                  initial={{ x: '-100%' }}
                  animate={{ x: '100%' }}
                  transition={{ repeat: Infinity, duration: 2.8, ease: 'linear' }}
                  className="pointer-events-none absolute top-0 left-0 h-0.5 w-full bg-gradient-to-r from-transparent via-[#FFB800] to-transparent"
                />

                <div className="flex items-start gap-3">
                  {/* Animated App Icon Badge */}
                  <motion.div
                    animate={{ y: [0, -3, 0] }}
                    transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#F85606] to-[#FFB800] text-slate-950 shadow-md"
                  >
                    <Smartphone className="h-6 w-6 stroke-[2.2]" />
                  </motion.div>

                  <div className="min-w-0 flex-1 pr-5">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 rounded-md bg-[#F85606]/90 px-2 py-0.5 font-mono text-[10px] font-extrabold tracking-wide text-white uppercase">
                        <Sparkles className="h-2.5 w-2.5" />
                        {notificationCopy.badge}
                      </span>
                    </div>

                    <h4 className="mt-1 font-display text-xs font-extrabold leading-snug text-white sm:text-sm">
                      {notificationCopy.title}
                    </h4>
                    <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-slate-300">
                      {notificationCopy.subtitle}
                    </p>

                    <div className="mt-2.5 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handlePrimaryClick}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#FFB800] px-3.5 py-1.5 text-xs font-extrabold text-slate-950 shadow-sm transition-transform active:scale-95 hover:bg-[#e5a600]"
                      >
                        <Download className="h-3.5 w-3.5 shrink-0" />
                        <span>Download App</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsNotificationVisible(false)}
                        className="rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                      >
                        Not now
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    aria-label="Close app notification"
                    onClick={() => setIsNotificationVisible(false)}
                    className="absolute top-2.5 right-2.5 rounded-lg p-1 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Install & APK Guide Modal (English) */}
      {showGuideModal && (
        <div
          onClick={() => setShowGuideModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xs"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between bg-gradient-to-r from-slate-950 via-slate-900 to-[#F85606] px-5 py-4 text-white">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
                  <Smartphone className="h-5 w-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="font-display text-base font-extrabold">
                    Download BuyKit Mobile App
                  </h3>
                  <p className="text-xs text-orange-100">
                    Install directly on your phone for a faster, smoother experience
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="rounded-lg bg-white/10 p-1.5 text-white hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[80vh] space-y-4 overflow-y-auto p-5">
              {installSuccessMsg && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-800">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>BuyKit App is installing on your device!</span>
                </div>
              )}

              {/* Option 1: Direct 1-Click Android WebAPK / Chrome Install */}
              <div className="rounded-xl border border-orange-200 bg-[#FFF8F4] p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 rounded-md bg-[#F85606] px-2.5 py-0.5 text-[10px] font-extrabold text-white uppercase">
                    <Sparkles className="h-3 w-3" />
                    <span>Option 1 · Recommended (One-Click Install)</span>
                  </span>
                  <span className="font-mono text-[11px] font-bold text-emerald-700">
                    100% Safe · Signed WebAPK
                  </span>
                </div>

                <h4 className="mt-2 font-display text-sm font-extrabold text-slate-900">
                  Direct Android / Desktop App Install (WebAPK)
                </h4>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  Install BuyKit directly to your Home Screen and App Drawer for a full-screen, ultra-smooth shopping experience:
                </p>

                {isInstallable ? (
                  <button
                    type="button"
                    onClick={async () => {
                      const ok = await install();
                      if (ok) setInstallSuccessMsg(true);
                    }}
                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#F85606] px-4 py-3 text-xs font-extrabold text-white shadow-md hover:bg-[#d94800]"
                  >
                    <Download className="h-4 w-4" />
                    <span>Install BuyKit App Now (One-Click APK)</span>
                  </button>
                ) : (
                  <ol className="mt-2.5 space-y-1.5 rounded-lg border border-orange-200/70 bg-white p-3 text-xs text-slate-700">
                    <li>
                      <strong>1.</strong> Tap the <strong>⋮ (Menu)</strong> icon in the top-right corner of your Chrome browser.
                    </li>
                    <li>
                      <strong>2.</strong> Select <strong>&ldquo;Install app&rdquo;</strong> or <strong>&ldquo;Add to Home screen&rdquo;</strong>.
                    </li>
                    <li>
                      <strong>3.</strong> Tap <strong>Install</strong> to add the BuyKit App to your phone.
                    </li>
                  </ol>
                )}
              </div>

              {/* Option 2: iPhone / iPad Safari Guide */}
              {(isIOS || !isAndroid) && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-2">
                    <Share2 className="h-4 w-4 text-[#F85606]" />
                    <h4 className="font-display text-sm font-bold text-slate-900">
                      Install on iPhone / iPad (iOS Safari)
                    </h4>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                    1. Tap the <strong>Share</strong> button at the bottom of Safari.<br />
                    2. Scroll down and tap <strong>&ldquo;Add to Home Screen&rdquo;</strong>.
                  </p>
                </div>
              )}

              {/* Option 3: Standalone .APK File Generation */}
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-2">
                  <FileCode2 className="h-4 w-4 text-[#F85606]" />
                  <h4 className="font-display text-sm font-bold text-slate-900">
                    Option 2 · Build Standalone <code className="text-[#F85606]">.apk</code> Package
                  </h4>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  To package a standalone shareable Android <strong>.apk</strong> file using PWABuilder or Bubblewrap TWA:
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadTwaManifest}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-slate-100 px-3.5 py-2 text-xs font-bold text-slate-800 hover:bg-slate-200"
                  >
                    <Download className="h-3.5 w-3.5 text-[#F85606]" />
                    <span>Download Android TWA Config (.json)</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                  <ShieldCheck className="h-4 w-4" />
                  <span>Offline Support &amp; Fast Caching Enabled</span>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      confirmInstalled();
                      setShowGuideModal(false);
                    }}
                    className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                  >
                    Already Installed
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowGuideModal(false)}
                    className="rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-bold text-white hover:bg-slate-800"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
