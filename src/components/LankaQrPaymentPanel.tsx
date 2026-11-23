import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  QrCode,
  Download,
  Copy,
  Check,
  Clock,
  Smartphone,
  CheckCircle2,
  RefreshCw,
  Code2,
  ChevronDown,
  AlertCircle,
  Loader2,
  ScanLine,
  ShieldCheck,
} from 'lucide-react';
import { formatLKR } from '../data/catalog';

export interface LankaQrVerifiedResult {
  paymentId: string;
  sessionId: string;
  orderId: string;
  bankAppName: string;
}

type QrSessionStatus = 'pending' | 'scanned' | 'paid' | 'expired';

interface LankaQrServerSession {
  sessionId: string;
  orderId: string;
  amountLkr: number;
  currency: string;
  merchantId: string;
  merchantName: string;
  merchantCity: string;
  isLiveMerchant: boolean;
  emvPayload: string;
  qrImageDataUrl: string;
  expiresAt: number;
  status: QrSessionStatus;
}

interface LankaQrPollResponse {
  sessionId: string;
  orderId: string;
  amountLkr: number;
  status: QrSessionStatus;
  expiresAt: number;
  scannedAt: number | null;
  paidAt: number | null;
  paymentId: string | null;
  bankAppName: string | null;
}

interface LankaQrPaymentPanelProps {
  variant: 'inline' | 'modal';
  orderId: string;
  amountLkr: number;
  merchantId?: string;
  merchantName?: string;
  customerPhone?: string;
  onOpenFullQrModal?: () => void;
  onAutoConfirmedPaid?: (result: LankaQrVerifiedResult) => Promise<void> | void;
}

interface BankAppGuide {
  id: string;
  name: string;
  scanMenuLabel: string;
}

const SUPPORTED_SL_QR_APPS: BankAppGuide[] = [
  { id: 'boc', name: 'BOC SmartPay', scanMenuLabel: 'Scan & Pay → LANKAQR' },
  { id: 'peoples', name: "People's Pay", scanMenuLabel: 'QR Pay → Scan / Upload QR' },
  { id: 'sampath', name: 'Sampath Vishwa', scanMenuLabel: 'QR Payments → LANKAQR' },
  { id: 'combank', name: 'ComBank Q+', scanMenuLabel: 'Pay with QR → Gallery / Camera' },
  { id: 'hnb', name: 'HNB Solo', scanMenuLabel: 'Scan QR → LANKAQR Merchant' },
  { id: 'frimi', name: 'FriMi', scanMenuLabel: 'Scan & Pay → LANKAQR' },
  { id: 'genie', name: 'Dialog Genie', scanMenuLabel: 'Scan QR → Pay Merchant' },
  { id: 'payhere', name: 'PayHere QR', scanMenuLabel: 'Any LANKAQR App' },
];

function computeEmvCrc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function formatEmvTlv(tag: string, value: string): string {
  const safeVal = value.slice(0, 99);
  const len = String(safeVal.length).padStart(2, '0');
  return `${tag}${len}${safeVal}`;
}

export function buildLankaQrPayload(params: {
  orderId: string;
  amountLkr: number;
  merchantId: string;
  merchantName: string;
}): string {
  const cleanMerchantId =
    params.merchantId.replace(/[^A-Za-z0-9]/g, '').slice(0, 16) || '1228450';
  const cleanMerchantName =
    params.merchantName
      .replace(/[^A-Za-z0-9 ]/g, '')
      .trim()
      .slice(0, 25)
      .toUpperCase() || 'BUYKIT WITH PRAMU';
  const cleanOrderRef =
    params.orderId.replace(/[^A-Za-z0-9-]/g, '').slice(0, 20) || 'BKORDER';
  const amountStr = Number(params.amountLkr).toFixed(2);

  const merchantAccountInfo =
    formatEmvTlv('00', 'lk.lankaclear.lankaqr') +
    formatEmvTlv('01', cleanMerchantId) +
    formatEmvTlv('02', cleanOrderRef);

  const additionalData = formatEmvTlv('01', cleanOrderRef);

  const bodyWithoutCrc =
    formatEmvTlv('00', '01') +
    formatEmvTlv('01', '12') +
    formatEmvTlv('26', merchantAccountInfo) +
    formatEmvTlv('52', '5399') +
    formatEmvTlv('53', '144') +
    formatEmvTlv('54', amountStr) +
    formatEmvTlv('58', 'LK') +
    formatEmvTlv('59', cleanMerchantName) +
    formatEmvTlv('60', 'COLOMBO') +
    formatEmvTlv('62', additionalData) +
    '6304';

  return `${bodyWithoutCrc}${computeEmvCrc16(bodyWithoutCrc)}`;
}

function isSafePngDataUrl(url: string): boolean {
  return typeof url === 'string' && url.startsWith('data:image/png;base64,');
}

export const LankaQrPaymentPanel: React.FC<LankaQrPaymentPanelProps> = ({
  variant,
  orderId,
  amountLkr,
  merchantId = '1228450',
  merchantName = 'BUYKIT WITH PRAMU',
  customerPhone,
  onOpenFullQrModal,
  onAutoConfirmedPaid,
}) => {
  const [serverSession, setServerSession] = useState<LankaQrServerSession | null>(null);
  const [liveStatus, setLiveStatus] = useState<QrSessionStatus>('pending');
  const [paidBankName, setPaidBankName] = useState<string>('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [emvPayload, setEmvPayload] = useState<string>('');
  const [qrGenerating, setQrGenerating] = useState<boolean>(true);
  const [sessionError, setSessionError] = useState<string>('');
  const [copiedRef, setCopiedRef] = useState<boolean>(false);
  const [copiedPayload, setCopiedPayload] = useState<boolean>(false);
  const [showPayloadInspector, setShowPayloadInspector] = useState<boolean>(false);
  const [selectedBankId, setSelectedBankId] = useState<string>('boc');
  const [secondsLeft, setSecondsLeft] = useState<number>(15 * 60);
  const [qrNonce, setQrNonce] = useState<number>(0);

  const hasFiredAutoConfirmRef = useRef<boolean>(false);
  const onAutoConfirmedPaidRef = useRef(onAutoConfirmedPaid);
  onAutoConfirmedPaidRef.current = onAutoConfirmedPaid;

  const effectiveOrderRef = useMemo(
    () => (qrNonce > 0 ? `${orderId}-R${qrNonce}` : orderId),
    [orderId, qrNonce]
  );

  const selectedBank = useMemo(
    () =>
      SUPPORTED_SL_QR_APPS.find((b) => b.id === selectedBankId) ||
      SUPPORTED_SL_QR_APPS[0],
    [selectedBankId]
  );

  // Initialize QR code: lightweight preview for inline card, authoritative server session for modal
  const initializeQrSession = useCallback(async () => {
    setQrGenerating(true);
    setSessionError('');
    setLiveStatus('pending');
    hasFiredAutoConfirmRef.current = false;

    if (variant === 'inline') {
      const previewPayload = buildLankaQrPayload({
        orderId: effectiveOrderRef,
        amountLkr,
        merchantId,
        merchantName,
      });
      setEmvPayload(previewPayload);
      try {
        const previewUrl = await QRCode.toDataURL(previewPayload, {
          errorCorrectionLevel: 'M',
          margin: 2,
          width: 220,
          color: { dark: '#0f172a', light: '#ffffff' },
        });
        if (isSafePngDataUrl(previewUrl)) {
          setQrDataUrl(previewUrl);
        }
      } finally {
        setQrGenerating(false);
      }
      return;
    }

    // Modal mode: MUST create a real server-authoritative QR payment session
    try {
      const resp = await fetch('/api/lankaqr/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: effectiveOrderRef,
          amountLkr,
        }),
      });
      const data = (await resp.json().catch(() => ({}))) as LankaQrServerSession & {
        error?: string;
      };

      if (!resp.ok || !isSafePngDataUrl(data.qrImageDataUrl)) {
        setSessionError(
          data.error || 'Could not initialize live QR payment session. Please retry.'
        );
        setQrGenerating(false);
        return;
      }

      setServerSession(data);
      setQrDataUrl(data.qrImageDataUrl);
      setEmvPayload(data.emvPayload);
      setLiveStatus(data.status || 'pending');
      setSecondsLeft(Math.max(0, Math.floor((data.expiresAt - Date.now()) / 1000)));
    } catch {
      setSessionError(
        'Unable to reach BuyKit payment server. Please check your connection and tap Refresh QR.'
      );
    } finally {
      setQrGenerating(false);
    }
  }, [variant, effectiveOrderRef, amountLkr, merchantId, merchantName]);

  useEffect(() => {
    void initializeQrSession();
  }, [initializeQrSession]);

  // Countdown timer in modal mode
  useEffect(() => {
    if (variant !== 'modal') return;
    const interval = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setLiveStatus((curr) => (curr === 'paid' ? 'paid' : 'expired'));
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [variant, qrNonce]);

  // Real-time Server Polling every 2 seconds — ONLY auto-confirms when server reports 'paid'
  useEffect(() => {
    if (variant !== 'modal' || !serverSession?.sessionId) return;
    if (liveStatus === 'paid' || liveStatus === 'expired') return;

    let stopped = false;

    const pollSessionStatus = async () => {
      if (stopped || hasFiredAutoConfirmRef.current) return;
      try {
        const resp = await fetch(
          `/api/lankaqr/session/${encodeURIComponent(serverSession.sessionId)}`,
          { cache: 'no-store' }
        );
        if (!resp.ok || stopped) return;
        const statusData = (await resp.json()) as LankaQrPollResponse;
        if (stopped) return;

        setLiveStatus(statusData.status);
        if (statusData.bankAppName) {
          setPaidBankName(statusData.bankAppName);
        }

        if (
          statusData.status === 'paid' &&
          statusData.paymentId &&
          !hasFiredAutoConfirmRef.current
        ) {
          hasFiredAutoConfirmRef.current = true;
          const callback = onAutoConfirmedPaidRef.current;
          if (callback) {
            await callback({
              paymentId: statusData.paymentId,
              sessionId: statusData.sessionId,
              orderId: statusData.orderId,
              bankAppName: statusData.bankAppName || 'LANKAQR Bank App',
            });
          }
        }
      } catch {
        // Transient network hiccup; next poll tick will retry
      }
    };

    const pollInterval = window.setInterval(() => {
      void pollSessionStatus();
    }, 2000);

    return () => {
      stopped = true;
      window.clearInterval(pollInterval);
    };
  }, [variant, serverSession?.sessionId, liveStatus]);

  const formattedCountdown = useMemo(() => {
    const mins = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
    const secs = String(secondsLeft % 60).padStart(2, '0');
    return `${mins}:${secs}`;
  }, [secondsLeft]);

  const displayMerchantName = serverSession?.merchantName || merchantName;
  const displayMerchantId = serverSession?.merchantId || merchantId;

  const handleDownloadQrImage = () => {
    if (!isSafePngDataUrl(qrDataUrl)) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `BuyKit-LankaQR-${effectiveOrderRef}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyReference = async () => {
    const textToCopy = `BuyKit LANKAQR Ref: ${effectiveOrderRef} | Amount: LKR ${amountLkr.toFixed(
      2
    )} | Merchant: ${displayMerchantName}`;
    try {
      await navigator.clipboard.writeText(textToCopy);
    } catch {
      // Ignore clipboard failure
    }
    setCopiedRef(true);
    window.setTimeout(() => setCopiedRef(false), 2500);
  };

  const handleCopyEmvPayload = async () => {
    if (!emvPayload) return;
    try {
      await navigator.clipboard.writeText(emvPayload);
    } catch {
      // Ignore clipboard failure
    }
    setCopiedPayload(true);
    window.setTimeout(() => setCopiedPayload(false), 2500);
  };

  // =========================================================
  // VARIANT 1: INLINE PREVIEW CARD INSIDE CHECKOUT SECTION 5
  // =========================================================
  if (variant === 'inline') {
    return (
      <div className="mt-4 rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50/70 via-white to-orange-50/60 p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex shrink-0 flex-col items-center">
            <div className="relative rounded-2xl border-2 border-[#F85606] bg-white p-2.5 shadow-sm">
              {qrGenerating || !qrDataUrl ? (
                <div className="flex h-32 w-32 items-center justify-center rounded-lg bg-slate-50 text-xs text-slate-400">
                  Loading...
                </div>
              ) : (
                <img
                  src={qrDataUrl}
                  alt={`LankaQR preview for ${formatLKR(amountLkr)}`}
                  className="h-32 w-32 rounded-lg object-contain opacity-90"
                />
              )}
              <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 rounded-md bg-slate-950 px-2 py-0.5 font-mono text-[9px] font-extrabold tracking-wider text-amber-300 uppercase whitespace-nowrap">
                AUTO-VERIFY QR
              </span>
            </div>
          </div>

          <div className="min-w-0 flex-1 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-extrabold text-slate-950">
                  Auto-Verified LANKAQR Scan &amp; Pay (LKR)
                </p>
                <p className="text-[11px] text-slate-600">
                  Click <strong>Pay Now</strong> to generate your live payment QR code. Your order confirms <strong>automatically</strong> only after you scan &amp; complete payment on your phone.
                </p>
              </div>
              <span className="rounded-lg bg-emerald-100 px-2.5 py-1 font-mono text-xs font-extrabold text-emerald-800">
                {formatLKR(amountLkr)}
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {SUPPORTED_SL_QR_APPS.map((bank) => (
                <span
                  key={bank.id}
                  className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold text-slate-700"
                >
                  {bank.name}
                </span>
              ))}
            </div>

            {onOpenFullQrModal && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={onOpenFullQrModal}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#F85606] px-4 py-2 text-xs font-extrabold text-white shadow-xs transition-colors hover:bg-[#d94800]"
                >
                  <QrCode className="h-3.5 w-3.5" />
                  <span>Generate Live QR Code to Scan &amp; Pay</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================
  // VARIANT 2: LIVE SERVER-VERIFIED SCANNABLE QR MODAL
  // (No manual bypass button — strictly auto-confirms only after QR scan + payment!)
  // =========================================================
  return (
    <div className="space-y-4">
      {/* Live 3-Stage Real-Time Verification Banner */}
      <div
        className={`rounded-xl border p-3.5 transition-colors ${
          liveStatus === 'paid'
            ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
            : liveStatus === 'scanned'
            ? 'border-blue-300 bg-blue-50 text-blue-900'
            : liveStatus === 'expired'
            ? 'border-red-300 bg-red-50 text-red-900'
            : 'border-amber-300 bg-amber-50 text-amber-950'
        }`}
      >
        <div className="flex items-center gap-2.5">
          {liveStatus === 'paid' ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          ) : liveStatus === 'scanned' ? (
            <Loader2 className="h-5 w-5 shrink-0 animate-spin text-blue-600" />
          ) : liveStatus === 'expired' ? (
            <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
          ) : (
            <ScanLine className="h-5 w-5 shrink-0 animate-pulse text-[#F85606]" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-extrabold">
              {liveStatus === 'paid'
                ? `Payment Verified${paidBankName ? ` via ${paidBankName}` : ''}! Confirming Your Order...`
                : liveStatus === 'scanned'
                ? 'QR Code Scanned! Waiting for Payment Approval on Your Phone...'
                : liveStatus === 'expired'
                ? 'QR Code Expired — Tap "Generate Fresh QR" Below'
                : 'Waiting for QR Scan & Payment...'}
            </p>
            <p className="mt-0.5 text-[11px] opacity-85">
              {liveStatus === 'paid'
                ? 'Your LKR payment has been verified by the server. Opening your order receipt now.'
                : liveStatus === 'scanned'
                ? 'Complete the PIN authorization on your phone. This screen will confirm automatically.'
                : liveStatus === 'expired'
                ? 'For security, each payment QR code is valid for 15 minutes.'
                : 'Scan the QR code below with your phone. This page auto-confirms ONLY after payment is completed.'}
            </p>
          </div>
        </div>

        {/* 3-Step Visual Progress Pills */}
        <div className="mt-3 grid grid-cols-3 gap-1.5 text-center text-[10px] font-bold">
          <div
            className={`rounded-lg px-2 py-1 ${
              liveStatus === 'pending'
                ? 'bg-[#F85606] text-white'
                : liveStatus === 'scanned' || liveStatus === 'paid'
                ? 'bg-emerald-600 text-white'
                : 'bg-white/70 text-slate-500'
            }`}
          >
            1. Scan QR
          </div>
          <div
            className={`rounded-lg px-2 py-1 ${
              liveStatus === 'scanned'
                ? 'bg-blue-600 text-white'
                : liveStatus === 'paid'
                ? 'bg-emerald-600 text-white'
                : 'bg-white/70 text-slate-500'
            }`}
          >
            2. Approve LKR
          </div>
          <div
            className={`rounded-lg px-2 py-1 ${
              liveStatus === 'paid'
                ? 'bg-emerald-600 text-white'
                : 'bg-white/70 text-slate-500'
            }`}
          >
            3. Auto-Confirm
          </div>
        </div>
      </div>

      {sessionError && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{sessionError}</span>
        </div>
      )}

      {/* Main Scannable QR Card */}
      <div className="rounded-2xl border-2 border-orange-200 bg-gradient-to-b from-[#FFF8F4] to-white p-4 text-center">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-2 py-0.5 font-mono font-bold text-amber-300">
            <QrCode className="h-3 w-3" />
            <span>
              {serverSession?.isLiveMerchant ? 'LIVE LANKAQR · LKR' : 'SCAN TO PAY · LANKAQR'}
            </span>
          </span>
          <span
            className={`inline-flex items-center gap-1 font-mono font-bold ${
              secondsLeft <= 120 ? 'text-red-600' : 'text-[#F85606]'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>
              {liveStatus === 'paid'
                ? 'PAID'
                : secondsLeft > 0
                ? `Valid for ${formattedCountdown}`
                : 'Expired'}
            </span>
          </span>
        </div>

        {/* Scannable QR Code Image */}
        <div className="relative mx-auto my-2 inline-block rounded-2xl border-2 border-slate-900 bg-white p-3 shadow-md">
          {qrGenerating || !qrDataUrl ? (
            <div className="flex h-56 w-56 flex-col items-center justify-center gap-2 bg-slate-50 text-xs font-semibold text-slate-500">
              <Loader2 className="h-6 w-6 animate-spin text-[#F85606]" />
              <span>Generating Secure QR...</span>
            </div>
          ) : (
            <img
              src={qrDataUrl}
              alt={`Scan QR to pay ${formatLKR(amountLkr)}`}
              className={`h-56 w-56 object-contain transition-opacity ${
                liveStatus === 'expired' ? 'opacity-20' : 'opacity-100'
              }`}
            />
          )}

          {liveStatus === 'paid' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-emerald-950/85 p-4 text-white">
              <CheckCircle2 className="h-12 w-12 text-emerald-400" />
              <p className="mt-2 text-sm font-extrabold">Payment Confirmed!</p>
            </div>
          )}

          {liveStatus === 'expired' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-white/85 p-4">
              <p className="text-xs font-extrabold text-slate-900">QR Session Expired</p>
              <button
                type="button"
                onClick={() => setQrNonce((n) => n + 1)}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[#F85606] px-3.5 py-2 text-xs font-extrabold text-white shadow-sm hover:bg-[#d94800]"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Generate Fresh QR</span>
              </button>
            </div>
          )}
        </div>

        <p className="mt-1 text-xs font-extrabold text-slate-900">
          {displayMerchantName} · Merchant #{displayMerchantId}
        </p>
        <p className="font-mono text-xl font-extrabold text-[#F85606]">
          {formatLKR(amountLkr)}
        </p>
        <p className="font-mono text-[10px] text-slate-500">
          Ref: {effectiveOrderRef}
          {serverSession ? ` · Session ${serverSession.sessionId}` : ''}
        </p>

        {/* Utility Buttons: Save QR to Gallery + Copy Ref + Refresh */}
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={handleDownloadQrImage}
            disabled={!qrDataUrl}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 hover:border-[#F85606] hover:text-[#F85606] disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download QR (Gallery)</span>
          </button>

          <button
            type="button"
            onClick={handleCopyReference}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 hover:border-[#F85606] hover:text-[#F85606]"
          >
            {copiedRef ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-emerald-700">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copy Ref &amp; Amount</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setQrNonce((n) => n + 1)}
            disabled={qrGenerating || liveStatus === 'paid'}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:border-slate-900 hover:text-slate-950 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${qrGenerating ? 'animate-spin' : ''}`} />
            <span>Refresh QR</span>
          </button>
        </div>

        {/* Collapsible EMVCo Payload Inspector */}
        {emvPayload && (
          <div className="mt-3 border-t border-orange-200/70 pt-2.5 text-left">
            <button
              type="button"
              onClick={() => setShowPayloadInspector((prev) => !prev)}
              className="flex w-full items-center justify-between text-[11px] font-bold text-slate-600 hover:text-slate-900"
            >
              <span className="inline-flex items-center gap-1.5">
                <Code2 className="h-3.5 w-3.5 text-[#F85606]" />
                <span>EMVCo LANKAQR Standard Payload (ISO-4217 LKR · CRC-16)</span>
              </span>
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${
                  showPayloadInspector ? 'rotate-180' : ''
                }`}
              />
            </button>
            {showPayloadInspector && (
              <div className="mt-2 rounded-lg border border-slate-200 bg-slate-900 p-2.5 text-left">
                <p className="break-all font-mono text-[10px] leading-relaxed text-emerald-300">
                  {emvPayload}
                </p>
                <button
                  type="button"
                  onClick={handleCopyEmvPayload}
                  className="mt-2 inline-flex items-center gap-1 rounded bg-white/10 px-2 py-1 text-[10px] font-bold text-white hover:bg-white/20"
                >
                  {copiedPayload ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-300" />
                      <span>EMVCo String Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>Copy EMVCo Payload</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bank App Selector + Tailored Scan Instructions */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-700">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 font-extrabold text-slate-900">
            <Smartphone className="h-4 w-4 text-[#F85606]" />
            <span>How to Scan &amp; Auto-Confirm:</span>
          </div>
          <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800">
            <ShieldCheck className="h-3 w-3" />
            <span>Auto-Confirm Only</span>
          </span>
        </div>

        <div className="mb-2.5 flex flex-wrap gap-1.5">
          {SUPPORTED_SL_QR_APPS.map((bank) => {
            const active = bank.id === selectedBank.id;
            return (
              <button
                key={bank.id}
                type="button"
                onClick={() => setSelectedBankId(bank.id)}
                className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold transition-colors ${
                  active
                    ? 'border-[#F85606] bg-[#F85606] text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-orange-300'
                }`}
              >
                {bank.name}
              </button>
            );
          })}
        </div>

        <ol className="list-decimal space-y-1 pl-4 text-[11px] leading-relaxed text-slate-600">
          <li>
            Point your smartphone camera (or open <strong>{selectedBank.name}</strong> →{' '}
            <strong>{selectedBank.scanMenuLabel}</strong>) at the QR code above.
          </li>
          <li>
            On a single phone, tap <em>Download QR (Gallery)</em> and scan it with Google Lens or your bank app&apos;s Gallery QR scanner.
          </li>
          <li>
            Approve the exact amount <strong>{formatLKR(amountLkr)}</strong> on your phone —{' '}
            <strong>this checkout screen will automatically confirm your order</strong> within 2 seconds.
          </li>
        </ol>

        {customerPhone && (
          <p className="mt-2.5 border-t border-slate-200 pt-2 text-[10px] text-slate-500">
            Live verification active · Order confirmation will be linked to{' '}
            <strong>{customerPhone}</strong>.
          </p>
        )}
      </div>
    </div>
  );
};
