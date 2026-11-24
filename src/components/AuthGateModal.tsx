import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  ShieldCheck,
  Lock,
  X,
  Check,
  Loader2,
  Ticket,
  Truck,
  Sparkles,
  ShoppingBag,
  User as UserIcon,
  Phone,
  AlertTriangle,
  Copy,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  signInWithGoogleAccount,
  getFriendlyAuthError,
  FriendlyAuthError,
  User,
} from '../firebase';

export interface AuthRegistrationExtras {
  mode: 'login' | 'register';
  fullName?: string;
  phone?: string;
  voucherClaimed?: boolean;
}

interface AuthGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendingProductName?: string | null;
  logoBadge?: React.ReactNode;
  onSuccess: (user: User, extras?: AuthRegistrationExtras) => void;
}

const GoogleLogoIcon: React.FC<{ className?: string }> = ({ className = 'h-5 w-5' }) => (
  <svg
    version="1.1"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 48 48"
    className={`shrink-0 ${className}`}
    aria-hidden="true"
  >
    <path
      fill="#EA4335"
      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
    />
    <path
      fill="#4285F4"
      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
    />
    <path
      fill="#FBBC05"
      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
    />
    <path
      fill="#34A853"
      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
    />
    <path fill="none" d="M0 0h48v48H0z" />
  </svg>
);

export const AuthGateModal: React.FC<AuthGateModalProps> = ({
  isOpen,
  onClose,
  pendingProductName,
  logoBadge,
  onSuccess,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [registerName, setRegisterName] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<FriendlyAuthError | null>(null);
  const [copiedDomain, setCopiedDomain] = useState(false);
  const [successState, setSuccessState] = useState<{
    name: string;
    isRegister: boolean;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setAuthError(null);
      setSuccessState(null);
      setCopiedDomain(false);
    }
  }, [isOpen]);

  const handleGoogleAuth = async () => {
    setLoading(true);
    setAuthError(null);
    const isRegisterMode = authMode === 'register';
    const trimmedName = registerName.trim();
    const cleanedPhone = registerPhone.trim();

    try {
      const user = await signInWithGoogleAccount({
        displayNameOverride: isRegisterMode && trimmedName ? trimmedName : undefined,
        claimNewUserVoucher: isRegisterMode,
      });

      const resolvedName =
        (isRegisterMode && trimmedName) ||
        user.displayName ||
        user.email?.split('@')[0] ||
        'Shopper';

      setSuccessState({
        name: resolvedName,
        isRegister: isRegisterMode,
      });

      const normalizedPhone = cleanedPhone
        ? cleanedPhone.startsWith('+')
          ? cleanedPhone
          : `+94 ${cleanedPhone.replace(/^0+/, '')}`
        : undefined;

      window.setTimeout(() => {
        onSuccess(user, {
          mode: authMode,
          fullName: isRegisterMode && trimmedName ? trimmedName : undefined,
          phone: isRegisterMode ? normalizedPhone : undefined,
          voucherClaimed: isRegisterMode,
        });
        onClose();
      }, prefersReducedMotion ? 150 : 750);
    } catch (err: unknown) {
      setAuthError(getFriendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleCopyHostname = async (hostname: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(hostname);
      }
      setCopiedDomain(true);
      window.setTimeout(() => setCopiedDomain(false), 2000);
    } catch {
      setCopiedDomain(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="BuyKit with Pramu Sign In or Register"
          className="fixed inset-0 z-[130] flex items-end justify-center bg-slate-950/65 p-0 backdrop-blur-[3px] sm:items-center sm:p-4"
        >
          <motion.div
            initial={
              prefersReducedMotion
                ? { opacity: 0 }
                : { opacity: 0, y: 40, scale: 0.96 }
            }
            animate={
              prefersReducedMotion
                ? { opacity: 1 }
                : { opacity: 1, y: 0, scale: 1 }
            }
            exit={
              prefersReducedMotion
                ? { opacity: 0 }
                : { opacity: 0, y: 28, scale: 0.96 }
            }
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[430px] overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
          >
            {/* 1. DARAZ / ALIEXPRESS ANIMATED SIGNATURE ORANGE HEADER */}
            <div className="relative overflow-hidden bg-gradient-to-br from-[#F85606] via-[#FF6A00] to-[#E23D00] px-6 pt-6 pb-7 text-white">
              {/* Subtle Floating Geometric Accent Rings (Compositor-Only Motion) */}
              {!prefersReducedMotion && (
                <>
                  <motion.div
                    aria-hidden="true"
                    animate={{
                      y: [0, -10, 0],
                      x: [0, 6, 0],
                      scale: [1, 1.06, 1],
                    }}
                    transition={{
                      duration: 6,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                    className="pointer-events-none absolute -top-10 -right-10 h-36 w-36 rounded-full bg-white/12"
                  />
                  <motion.div
                    aria-hidden="true"
                    animate={{
                      y: [0, 8, 0],
                      x: [0, -6, 0],
                      scale: [1, 1.08, 1],
                    }}
                    transition={{
                      duration: 7.5,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                    className="pointer-events-none absolute -bottom-12 -left-8 h-32 w-32 rounded-full bg-amber-300/20"
                  />
                </>
              )}

              {/* Top Row: Official BuyKit Logo + Wordmark + Close Button */}
              <div className="relative z-10 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <motion.div
                    initial={prefersReducedMotion ? false : { rotate: -8, scale: 0.85 }}
                    animate={{ rotate: 0, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 22 }}
                    className="relative shrink-0 rounded-2xl p-0.5 ring-2 ring-white/45 shadow-md"
                  >
                    {logoBadge ? (
                      logoBadge
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-xs">
                        {pendingProductName ? (
                          <Lock className="h-5 w-5 text-white" />
                        ) : (
                          <ShoppingBag className="h-5 w-5 text-white" />
                        )}
                      </div>
                    )}
                  </motion.div>
                  <div>
                    <div className="font-display text-xl font-extrabold tracking-tight text-white">
                      buy<span className="text-amber-200">kit</span>{' '}
                      <span className="text-xs font-semibold text-orange-100">
                        with Pramu
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] font-medium text-orange-100">
                      Sri Lanka Official Online Mall · LKR Deals
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close sign in dialog"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-black/15 text-white transition-colors hover:bg-black/30"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Daraz / AliExpress Top Perks Line */}
              <div className="relative z-10 mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold text-amber-100">
                <span className="inline-flex items-center gap-1">
                  <Ticket className="h-3.5 w-3.5 text-amber-300" />
                  <span>Rs. 5,000 Starter Gift</span>
                </span>
                <span aria-hidden="true" className="opacity-50">
                  ·
                </span>
                <span className="inline-flex items-center gap-1">
                  <Truck className="h-3.5 w-3.5 text-amber-300" />
                  <span>Islandwide COD</span>
                </span>
                <span aria-hidden="true" className="opacity-50">
                  ·
                </span>
                <span className="inline-flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-amber-300" />
                  <span>Buyer Protection</span>
                </span>
              </div>
            </div>

            {/* 2. MAIN CONTENT BODY */}
            <div className="relative -mt-3 rounded-t-3xl bg-white px-5 pt-5 pb-6 sm:px-6">
              {successState ? (
                /* CELEBRATORY ANIMATED SUCCESS STATE */
                <motion.div
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center py-8 text-center"
                >
                  <motion.div
                    initial={prefersReducedMotion ? false : { scale: 0.5, rotate: -15 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-sm"
                  >
                    <Check className="h-8 w-8 stroke-[3]" />
                  </motion.div>
                  <h3 className="mt-4 font-display text-lg font-extrabold text-slate-950">
                    {successState.isRegister
                      ? `Welcome to BuyKit, ${successState.name}!`
                      : `Welcome back, ${successState.name}!`}
                  </h3>
                  <p className="mt-1 text-xs text-slate-600">
                    {successState.isRegister
                      ? 'Your free account is ready & Rs. 5,000 New User Voucher is unlocked.'
                      : 'Syncing your cloud Cart, Wishlist & BuyKit Express orders...'}
                  </p>
                </motion.div>
              ) : (
                <>
                  {/* DARAZ / ALIEXPRESS ANIMATED SIGN IN / REGISTER SEGMENTED SWITCHER */}
                  <div className="relative grid grid-cols-2 rounded-xl bg-slate-100 p-1">
                    {(
                      [
                        { id: 'login', label: 'Sign In' },
                        { id: 'register', label: 'Register' },
                      ] as const
                    ).map((tab) => {
                      const isActive = authMode === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => {
                            setAuthMode(tab.id);
                            setAuthError(null);
                          }}
                          className={`relative z-10 flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-extrabold transition-colors sm:text-sm ${
                            isActive
                              ? 'text-[#F85606]'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {isActive && (
                            <motion.span
                              layoutId="darazAuthActiveTab"
                              transition={{
                                type: 'spring',
                                stiffness: 440,
                                damping: 32,
                              }}
                              className="absolute inset-0 -z-10 rounded-lg bg-white shadow-xs"
                            />
                          )}
                          <span>{tab.label}</span>
                          {tab.id === 'register' && (
                            <span className="font-mono text-[10px] font-extrabold text-emerald-700">
                              · Rs.5k Gift
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Optional Product Gate Notice */}
                  {pendingProductName && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-3.5 rounded-xl border border-orange-200 bg-[#FFF6F1] px-3.5 py-2.5 text-xs text-slate-800"
                    >
                      <span className="font-bold text-[#F85606]">
                        Almost there —{' '}
                      </span>
                      sign in or register to save{' '}
                      <strong className="text-slate-950">
                        "{pendingProductName}"
                      </strong>{' '}
                      and unlock New User LKR pricing.
                    </motion.div>
                  )}

                  {/* ANIMATED TAB PANEL TRANSITION */}
                  <AnimatePresence mode="wait">
                    {authMode === 'login' ? (
                      <motion.div
                        key="login-panel"
                        initial={
                          prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: -14 }
                        }
                        animate={{ opacity: 1, x: 0 }}
                        exit={
                          prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: 14 }
                        }
                        transition={{ duration: 0.18, ease: 'easeOut' }}
                        className="mt-4 space-y-4"
                      >
                        <div>
                          <h2 className="font-display text-lg font-extrabold text-slate-950">
                            Sign in to your BuyKit account
                          </h2>
                          <p className="mt-1 text-xs leading-relaxed text-slate-600">
                            One-tap verified Google login keeps your Cart, Wishlist, Vouchers, and real-time order tracking synced across all your devices.
                          </p>
                        </div>

                        {/* Staggered Trust Checklist */}
                        <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50/75 p-3.5 text-xs text-slate-700">
                          {[
                            'Persistent Cloud Cart & instant LKR Checkout',
                            'Live BuyKit Express order tracking & PDF Invoices',
                            'Real-time notifications for shipping & Flash Sales',
                          ].map((perk, idx) => (
                            <motion.div
                              key={perk}
                              initial={
                                prefersReducedMotion
                                  ? false
                                  : { opacity: 0, x: -8 }
                              }
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.05, duration: 0.2 }}
                              className="flex items-center gap-2"
                            >
                              <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                              <span>{perk}</span>
                            </motion.div>
                          ))}
                        </div>

                        {/* Primary Daraz / AliExpress Login CTA */}
                        <motion.button
                          type="button"
                          onClick={handleGoogleAuth}
                          disabled={loading}
                          whileHover={prefersReducedMotion ? undefined : { scale: 1.01 }}
                          whileTap={prefersReducedMotion ? undefined : { scale: 0.985 }}
                          className="relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-xl bg-gradient-to-r from-[#F85606] via-[#FF6A00] to-[#F85606] px-4 py-3.5 text-sm font-extrabold text-white shadow-md shadow-orange-500/20 transition-all hover:brightness-105 disabled:opacity-60"
                        >
                          {!prefersReducedMotion && !loading && (
                            <motion.span
                              aria-hidden="true"
                              initial={{ x: '-120%' }}
                              animate={{ x: '220%' }}
                              transition={{
                                duration: 2.6,
                                repeat: Infinity,
                                repeatDelay: 2.2,
                                ease: 'easeInOut',
                              }}
                              className="pointer-events-none absolute inset-y-0 left-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent"
                            />
                          )}
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white shadow-2xs">
                            {loading ? (
                              <Loader2 className="h-4 w-4 animate-spin text-[#F85606]" />
                            ) : (
                              <GoogleLogoIcon className="h-4 w-4" />
                            )}
                          </span>
                          <span>
                            {loading ? 'Signing in with Google...' : 'Continue with Google'}
                          </span>
                        </motion.button>

                        <p className="text-center text-xs text-slate-500">
                          New to BuyKit with Pramu?{' '}
                          <button
                            type="button"
                            onClick={() => {
                              setAuthMode('register');
                              setAuthError(null);
                            }}
                            className="font-bold text-[#F85606] hover:underline"
                          >
                            Register for Rs. 5,000 Gift
                          </button>
                        </p>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="register-panel"
                        initial={
                          prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: 14 }
                        }
                        animate={{ opacity: 1, x: 0 }}
                        exit={
                          prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: -14 }
                        }
                        transition={{ duration: 0.18, ease: 'easeOut' }}
                        className="mt-4 space-y-3.5"
                      >
                        {/* Animated Daraz / AliExpress Welcome Voucher Ticket */}
                        <motion.div
                          initial={
                            prefersReducedMotion ? false : { scale: 0.96, opacity: 0 }
                          }
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: 'spring', stiffness: 420, damping: 26 }}
                          className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-[#F85606]/70 bg-gradient-to-r from-[#FFF5EF] via-[#FFF9F5] to-amber-50/70 p-3"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F85606] text-white shadow-2xs">
                              <Sparkles className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-mono text-xs font-extrabold text-[#F85606] tabular-nums">
                                Rs. 5,000 OFF · NEW USER PASS
                              </p>
                              <p className="text-[11px] text-slate-600">
                                Auto-activated when you register today
                              </p>
                            </div>
                          </div>
                          <span className="shrink-0 font-mono text-[11px] font-extrabold text-emerald-700">
                            FREE
                          </span>
                        </motion.div>

                        {/* Optional Daraz/AliExpress Quick Profile Fields */}
                        <div className="space-y-2.5">
                          <div>
                            <label className="mb-1 block text-[11px] font-bold text-slate-700">
                              Full Name <span className="font-normal text-slate-400">(optional)</span>
                            </label>
                            <div className="relative">
                              <UserIcon className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                              <input
                                type="text"
                                value={registerName}
                                onChange={(e) => setRegisterName(e.target.value)}
                                placeholder="e.g. Kasun Perera"
                                maxLength={80}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pr-3 pl-9 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#F85606] focus:bg-white focus:outline-none"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="mb-1 block text-[11px] font-bold text-slate-700">
                              Sri Lanka Mobile Number{' '}
                              <span className="font-normal text-slate-400">(optional for COD)</span>
                            </label>
                            <div className="flex items-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 focus-within:border-[#F85606] focus-within:bg-white">
                              <span className="flex items-center gap-1 border-r border-slate-200 bg-slate-100/80 px-2.5 py-2.5 font-mono text-xs font-bold text-slate-700">
                                <Phone className="h-3.5 w-3.5 text-[#F85606]" />
                                +94
                              </span>
                              <input
                                type="tel"
                                value={registerPhone}
                                onChange={(e) => setRegisterPhone(e.target.value)}
                                placeholder="77 123 4567"
                                maxLength={20}
                                className="w-full bg-transparent px-3 py-2.5 font-mono text-xs text-slate-900 placeholder:font-sans placeholder:text-slate-400 focus:outline-none"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Register with Google CTA */}
                        <motion.button
                          type="button"
                          onClick={handleGoogleAuth}
                          disabled={loading}
                          whileHover={prefersReducedMotion ? undefined : { scale: 1.01 }}
                          whileTap={prefersReducedMotion ? undefined : { scale: 0.985 }}
                          className="relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-xl bg-gradient-to-r from-[#F85606] via-[#FF6A00] to-[#F85606] px-4 py-3.5 text-sm font-extrabold text-white shadow-md shadow-orange-500/20 transition-all hover:brightness-105 disabled:opacity-60"
                        >
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white shadow-2xs">
                            {loading ? (
                              <Loader2 className="h-4 w-4 animate-spin text-[#F85606]" />
                            ) : (
                              <GoogleLogoIcon className="h-4 w-4" />
                            )}
                          </span>
                          <span>
                            {loading
                              ? 'Creating your account...'
                              : 'Register with Google & Claim Rs. 5,000'}
                          </span>
                        </motion.button>

                        <p className="text-center text-xs text-slate-500">
                          Already have an account?{' '}
                          <button
                            type="button"
                            onClick={() => {
                              setAuthMode('login');
                              setAuthError(null);
                            }}
                            className="font-bold text-[#F85606] hover:underline"
                          >
                            Sign In
                          </button>
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* SMART ERROR DIAGNOSTIC PANEL (Never dumps ugly raw strings) */}
                  <AnimatePresence>
                    {authError && (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="mt-4 rounded-xl border border-red-200 bg-red-50/90 p-3.5 text-xs text-red-900"
                      >
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-red-800">{authError.title}</p>
                            <p className="mt-0.5 leading-relaxed text-red-700">
                              {authError.message}
                            </p>

                            {authError.unauthorizedHostname && (
                              <div className="mt-2.5 space-y-2">
                                <div className="flex items-center gap-1.5">
                                  <code className="flex-1 truncate rounded-md border border-red-200 bg-white px-2 py-1 font-mono text-[11px] text-slate-800">
                                    {authError.unauthorizedHostname}
                                  </code>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleCopyHostname(authError.unauthorizedHostname!)
                                    }
                                    className="inline-flex shrink-0 items-center gap-1 rounded-md border border-red-200 bg-white px-2 py-1 text-[11px] font-bold text-red-700 hover:bg-red-100"
                                  >
                                    {copiedDomain ? (
                                      <>
                                        <Check className="h-3 w-3 text-emerald-600" />
                                        <span className="text-emerald-700">Copied</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="h-3 w-3" />
                                        <span>Copy</span>
                                      </>
                                    )}
                                  </button>
                                </div>

                                <a
                                  href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/settings`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#F85606] px-3 py-2 text-[11px] font-bold text-white transition-colors hover:bg-[#d94800]"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                  <span>Open Firebase Authorized Domains Settings</span>
                                </a>
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={handleGoogleAuth}
                              disabled={loading}
                              className="mt-2 inline-flex items-center gap-1 font-bold text-[#F85606] hover:underline"
                            >
                              <RefreshCw className="h-3 w-3" />
                              <span>Try Again</span>
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Footer Security Line */}
                  <div className="mt-4 border-t border-slate-100 pt-3 text-center text-[11px] text-slate-400">
                    Protected by Google Verified Auth · BuyKit Buyer Protection
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
