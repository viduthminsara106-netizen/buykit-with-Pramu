import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarClock,
  CheckCircle2,
  KeyRound,
  Loader2,
  Lock,
  ShieldCheck,
  Smartphone,
  Sparkles,
  X,
} from 'lucide-react';
import { formatLKR } from '../data/catalog';

export const KOKO_MIN_ORDER_LKR = 1500;
export const KOKO_MAX_ORDER_LKR = 250000;

const ALLOWED_KOKO_GATEWAY_URLS = new Set<string>([
  'https://qaapi.paykoko.com/api/merchants/orderCreate',
  'https://prodapi.paykoko.com/api/merchants/orderCreate',
]);

export interface KokoInstallmentItem {
  number: 1 | 2 | 3;
  label: string;
  dueDateIso: string;
  amountLkr: number;
}

export interface KokoOrderSession {
  sessionId: string;
  orderId: string;
  reference: string;
  amountLkr: number;
  currency: string;
  installments: KokoInstallmentItem[];
  mode: 'live_redirect' | 'sandbox_modal';
  sandbox: boolean;
  gatewayUrl: string | null;
  signedFormFields: Record<string, string> | null;
  expiresAt: number;
  status: 'pending' | 'otp_sent' | 'paid' | 'failed' | 'expired';
}

interface KokoPaymentPanelProps {
  variant: 'inline' | 'modal';
  amountLkr: number;
  customerPhone: string;
  session?: KokoOrderSession | null;
  isSubmitting?: boolean;
  onLaunchKokoCheckout?: () => void;
  onCloseModal?: () => void;
  onPaymentVerified?: (details: {
    orderId: string;
    trnId: string;
    firstInstallmentLkr: number;
    totalAmountLkr: number;
  }) => void;
}

function formatDueDate(iso: string, index: number): string {
  if (index === 0) return 'Today';
  try {
    return new Date(iso).toLocaleDateString('en-LK', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return index === 1 ? 'In 30 Days' : 'In 60 Days';
  }
}

export const KokoPaymentPanel: React.FC<KokoPaymentPanelProps> = ({
  variant,
  amountLkr,
  customerPhone,
  session,
  isSubmitting = false,
  onLaunchKokoCheckout,
  onCloseModal,
  onPaymentVerified,
}) => {
  const [step, setStep] = useState<'phone' | 'otp' | 'verified'>('phone');
  const [mobileInput, setMobileInput] = useState<string>(() => {
    const digits = (customerPhone || '').replace(/[^0-9+]/g, '');
    return digits || '0771234567';
  });
  const [otpInput, setOtpInput] = useState<string>('');
  const [maskedPhone, setMaskedPhone] = useState<string>('');
  const [sandboxOtpHint, setSandboxOtpHint] = useState<string>('');
  const [loadingAction, setLoadingAction] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [verifiedTrnId, setVerifiedTrnId] = useState<string>('');
  const liveFormRef = useRef<HTMLFormElement | null>(null);
  const hasAutoSubmittedLiveFormRef = useRef<boolean>(false);

  const previewInstallments = useMemo<KokoInstallmentItem[]>(() => {
    if (session?.installments?.length === 3) {
      return session.installments;
    }
    const roundedTotal = Math.round(amountLkr * 100) / 100;
    const base = Math.floor((roundedTotal / 3) * 100) / 100;
    const first = Math.round((roundedTotal - base * 2) * 100) / 100;
    const now = new Date();
    const d30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const d60 = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
    return [
      { number: 1, label: '1st Installment', dueDateIso: now.toISOString(), amountLkr: first },
      { number: 2, label: '2nd Installment', dueDateIso: d30.toISOString(), amountLkr: base },
      { number: 3, label: '3rd Installment', dueDateIso: d60.toISOString(), amountLkr: base },
    ];
  }, [amountLkr, session]);

  const isAmountEligible =
    amountLkr >= KOKO_MIN_ORDER_LKR && amountLkr <= KOKO_MAX_ORDER_LKR;

  // Reset modal flow whenever a fresh Koko session opens
  useEffect(() => {
    if (variant === 'modal' && session) {
      setStep('phone');
      setOtpInput('');
      setSandboxOtpHint('');
      setErrorMsg('');
      setVerifiedTrnId('');
      hasAutoSubmittedLiveFormRef.current = false;
    }
  }, [variant, session?.sessionId]);

  // If real Koko Merchant credentials are configured, auto-submit the server-signed RSA form to Paykoko
  useEffect(() => {
    if (
      variant === 'modal' &&
      session?.mode === 'live_redirect' &&
      session.gatewayUrl &&
      ALLOWED_KOKO_GATEWAY_URLS.has(session.gatewayUrl) &&
      session.signedFormFields &&
      liveFormRef.current &&
      !hasAutoSubmittedLiveFormRef.current
    ) {
      hasAutoSubmittedLiveFormRef.current = true;
      liveFormRef.current.submit();
    }
  }, [variant, session]);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    setErrorMsg('');
    setLoadingAction(true);
    try {
      const resp = await fetch('/api/koko/sandbox/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.sessionId,
          mobileNumber: mobileInput.trim(),
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'Could not send Koko OTP.');
      }
      setMaskedPhone(data.maskedPhone || mobileInput.trim());
      setSandboxOtpHint(data.sandboxOtpPreview || '');
      setStep('otp');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to send Koko OTP.');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    setErrorMsg('');
    setLoadingAction(true);
    try {
      const resp = await fetch('/api/koko/sandbox/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.sessionId,
          otp: otpInput.trim(),
        }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.verified) {
        throw new Error(data.error || 'Invalid OTP. Please try again.');
      }
      setVerifiedTrnId(data.trnId);
      setStep('verified');

      window.setTimeout(() => {
        if (onPaymentVerified) {
          onPaymentVerified({
            orderId: session.orderId,
            trnId: data.trnId,
            firstInstallmentLkr: previewInstallments[0].amountLkr,
            totalAmountLkr: session.amountLkr,
          });
        }
      }, 650);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'OTP verification failed.');
    } finally {
      setLoadingAction(false);
    }
  };

  // =========================================================
  // 1. INLINE CHECKOUT BREAKDOWN PANEL (Inside Checkout Page)
  // =========================================================
  if (variant === 'inline') {
    return (
      <div className="mt-4 overflow-hidden rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50/90 via-white to-violet-50/70 p-4 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-700 font-display text-xs font-black tracking-tight text-white shadow-xs">
              KOKO
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-display text-xs font-extrabold text-slate-950 sm:text-sm">
                  Koko Pay · Split into 3 Interest-Free Installments
                </p>
                <span className="rounded bg-indigo-600 px-1.5 py-0.5 text-[10px] font-extrabold text-white uppercase">
                  0% Interest
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Pay 1/3 today with your debit/credit card on Koko · Auto-scheduled every 30 days
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-white px-2.5 py-1 text-[11px] font-bold text-indigo-700">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>RSA-256 Verified</span>
          </span>
        </div>

        {/* 3 Installment Schedule Grid */}
        <div className="mt-3.5 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          {previewInstallments.map((inst, idx) => (
            <div
              key={inst.number}
              className={`rounded-xl border p-3 ${
                idx === 0
                  ? 'border-indigo-400 bg-white shadow-xs ring-2 ring-indigo-500/15'
                  : 'border-indigo-100 bg-white/80'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] font-bold uppercase">
                <span className={idx === 0 ? 'text-indigo-700' : 'text-slate-500'}>
                  {idx === 0 ? '1st · Due Today' : idx === 1 ? '2nd · Day 30' : '3rd · Day 60'}
                </span>
                <span className="font-mono text-slate-400">{formatDueDate(inst.dueDateIso, idx)}</span>
              </div>
              <p
                className={`mt-1 font-mono text-sm font-extrabold sm:text-base ${
                  idx === 0 ? 'text-indigo-700' : 'text-slate-800'
                }`}
              >
                {formatLKR(inst.amountLkr)}
              </p>
              <p className="mt-0.5 text-[10px] text-slate-500">
                {idx === 0 ? 'Charged on approval' : 'Auto-debited · Rs. 0 fee'}
              </p>
            </div>
          ))}
        </div>

        {!isAmountEligible ? (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs font-semibold text-amber-900">
            Koko 3x Installments is available for orders between{' '}
            <strong className="font-mono">{formatLKR(KOKO_MIN_ORDER_LKR)}</strong> and{' '}
            <strong className="font-mono">{formatLKR(KOKO_MAX_ORDER_LKR)}</strong>. Your current total is{' '}
            <strong className="font-mono">{formatLKR(amountLkr)}</strong>.
          </div>
        ) : (
          <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
              <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
              <span>
                Only <strong className="font-mono text-slate-900">{formatLKR(previewInstallments[0].amountLkr)}</strong> payable today
              </span>
            </div>

            {onLaunchKokoCheckout && (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={onLaunchKokoCheckout}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-extrabold text-white shadow-xs transition-colors hover:bg-indigo-700 disabled:opacity-60"
              >
                {isSubmitting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CalendarClock className="h-3.5 w-3.5" />
                )}
                <span>Pay {formatLKR(previewInstallments[0].amountLkr)} with Koko</span>
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  // =========================================================
  // 2. FULL KOKO CHECKOUT MODAL (Live RSA Redirect OR Sandbox OTP)
  // =========================================================
  if (!session) return null;

  const isLiveGateway =
    session.mode === 'live_redirect' &&
    Boolean(session.gatewayUrl && ALLOWED_KOKO_GATEWAY_URLS.has(session.gatewayUrl)) &&
    Boolean(session.signedFormFields);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="koko-checkout-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xs"
    >
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-3xl border border-indigo-200 bg-white shadow-2xl">
        {/* Top Koko Branded Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-indigo-700 via-violet-700 to-purple-800 px-5 py-4 text-white">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white font-display text-xs font-black text-indigo-700 shadow-xs">
              KOKO
            </div>
            <div>
              <h2
                id="koko-checkout-modal-title"
                className="font-display text-base font-extrabold text-white"
              >
                Koko Pay Checkout
              </h2>
              <p className="font-mono text-[11px] text-indigo-200">
                3 × {formatLKR(previewInstallments[0].amountLkr)} · 0% Interest
              </p>
            </div>
          </div>

          {onCloseModal && step !== 'verified' && (
            <button
              type="button"
              onClick={onCloseModal}
              aria-label="Close Koko Checkout"
              className="rounded-lg bg-white/15 p-1.5 text-white hover:bg-white/25"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="space-y-4 p-5">
          {/* Live Koko Gateway Auto-Submit Form */}
          {isLiveGateway && session.gatewayUrl && session.signedFormFields ? (
            <div className="space-y-4 py-6 text-center">
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-indigo-600" />
              <div>
                <p className="font-display text-base font-extrabold text-slate-950">
                  Redirecting to Official Koko Gateway...
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Your order #{session.orderId} has been signed with RSA-SHA256 on the server.
                </p>
              </div>
              <form
                ref={liveFormRef}
                method="POST"
                action={session.gatewayUrl}
                className="hidden"
              >
                {Object.entries(session.signedFormFields).map(([k, v]) => (
                  <input key={k} type="hidden" name={k} value={v} />
                ))}
              </form>
              <button
                type="button"
                onClick={() => liveFormRef.current?.submit()}
                className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-extrabold text-white hover:bg-indigo-700"
              >
                Continue to Koko Now
              </button>
            </div>
          ) : (
            <>
              {/* Order Summary Strip */}
              <div className="flex items-center justify-between rounded-2xl border border-indigo-100 bg-indigo-50/70 px-4 py-3">
                <div>
                  <span className="block text-[10px] font-bold tracking-wider text-indigo-600 uppercase">
                    Due Today (1st of 3)
                  </span>
                  <span className="font-mono text-xl font-extrabold text-indigo-950">
                    {formatLKR(previewInstallments[0].amountLkr)}
                  </span>
                </div>
                <div className="text-right font-mono text-[11px] text-slate-600">
                  <span className="block font-sans text-[10px] font-bold text-slate-400 uppercase">
                    Order Total
                  </span>
                  <strong className="text-slate-900">{formatLKR(session.amountLkr)}</strong>
                  <span className="block text-[10px] text-slate-400">#{session.orderId}</span>
                </div>
              </div>

              {/* Compact 3-Installment Timeline */}
              <div className="grid grid-cols-3 gap-2 text-center">
                {previewInstallments.map((inst, idx) => (
                  <div
                    key={inst.number}
                    className={`rounded-xl border px-2 py-2 ${
                      idx === 0
                        ? 'border-indigo-400 bg-indigo-50/60'
                        : 'border-slate-200 bg-slate-50/60'
                    }`}
                  >
                    <span className="block text-[10px] font-bold text-slate-500">
                      {formatDueDate(inst.dueDateIso, idx)}
                    </span>
                    <span
                      className={`mt-0.5 block font-mono text-xs font-extrabold ${
                        idx === 0 ? 'text-indigo-700' : 'text-slate-700'
                      }`}
                    >
                      {formatLKR(inst.amountLkr)}
                    </span>
                  </div>
                ))}
              </div>

              {errorMsg && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-700">
                  {errorMsg}
                </div>
              )}

              {/* STEP 1: Enter Koko Mobile Number */}
              {step === 'phone' && (
                <form onSubmit={handleRequestOtp} className="space-y-3.5">
                  <div>
                    <label
                      htmlFor="koko-mobile-input"
                      className="mb-1.5 block text-xs font-bold text-slate-800"
                    >
                      Enter your Koko Registered Mobile Number (Sri Lanka)
                    </label>
                    <div className="flex items-center overflow-hidden rounded-xl border-2 border-indigo-200 bg-white focus-within:border-indigo-600">
                      <span className="flex items-center gap-1 border-r border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-700">
                        <Smartphone className="h-3.5 w-3.5 text-indigo-600" />
                        +94
                      </span>
                      <input
                        id="koko-mobile-input"
                        type="tel"
                        required
                        value={mobileInput}
                        onChange={(e) => setMobileInput(e.target.value)}
                        placeholder="077 123 4567"
                        className="w-full px-3 py-2.5 font-mono text-sm font-bold text-slate-900 focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loadingAction}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-extrabold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-60"
                  >
                    {loadingAction ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Lock className="h-4 w-4" />
                    )}
                    <span>{loadingAction ? 'Sending OTP...' : 'Continue & Send Koko OTP'}</span>
                  </button>

                  <p className="text-center text-[11px] text-slate-500">
                    Sandbox Mode active · Add <code className="font-mono text-indigo-700">KOKO_MERCHANT_ID</code>,{' '}
                    <code className="font-mono text-indigo-700">KOKO_API_KEY</code> &amp;{' '}
                    <code className="font-mono text-indigo-700">KOKO_PRIVATE_KEY</code> in Secrets for live Paykoko redirect.
                  </p>
                </form>
              )}

              {/* STEP 2: Verify 6-Digit OTP */}
              {step === 'otp' && (
                <form onSubmit={handleVerifyOtp} className="space-y-3.5">
                  <div className="rounded-xl border border-indigo-200 bg-indigo-50/80 px-3.5 py-2.5 text-xs text-indigo-900">
                    <p className="font-bold">OTP sent to {maskedPhone}</p>
                    {sandboxOtpHint && (
                      <p className="mt-1 font-mono text-[11px] font-extrabold text-indigo-700">
                        Sandbox Test OTP Code: <span className="rounded bg-white px-2 py-0.5 shadow-2xs">{sandboxOtpHint}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="koko-otp-input"
                      className="mb-1.5 block text-xs font-bold text-slate-800"
                    >
                      Enter 6-Digit Koko Verification Code
                    </label>
                    <div className="flex items-center overflow-hidden rounded-xl border-2 border-indigo-200 bg-white focus-within:border-indigo-600">
                      <span className="pl-3 text-indigo-600">
                        <KeyRound className="h-4 w-4" />
                      </span>
                      <input
                        id="koko-otp-input"
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        required
                        value={otpInput}
                        onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="6-digit OTP"
                        className="w-full px-3 py-2.5 text-center font-mono text-lg font-extrabold tracking-[0.35em] text-slate-950 focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loadingAction || otpInput.length !== 6}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-extrabold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-60"
                  >
                    {loadingAction ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ShieldCheck className="h-4 w-4" />
                    )}
                    <span>
                      {loadingAction
                        ? 'Verifying RSA Signature...'
                        : `Approve & Pay ${formatLKR(previewInstallments[0].amountLkr)} Today`}
                    </span>
                  </button>

                  <div className="flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setStep('phone');
                        setOtpInput('');
                        setErrorMsg('');
                      }}
                      className="font-semibold text-slate-500 hover:text-slate-800"
                    >
                      ← Change Number
                    </button>
                    <button
                      type="button"
                      disabled={loadingAction}
                      onClick={handleRequestOtp}
                      className="font-bold text-indigo-600 hover:underline"
                    >
                      Resend OTP
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 3: Verified */}
              {step === 'verified' && (
                <div className="space-y-3 py-4 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <div>
                    <p className="font-display text-lg font-extrabold text-slate-950">
                      Koko 1st Installment Approved!
                    </p>
                    <p className="mt-1 font-mono text-xs font-bold text-emerald-700">
                      Ref: {verifiedTrnId}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      RSA-SHA256 callback verified · Confirming your BuyKit order now...
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
