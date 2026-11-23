import React, { useEffect, useState } from 'react';
import {
  QrCode,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Lock,
  Loader2,
  Building2,
} from 'lucide-react';
import { formatLKR } from '../data/catalog';

interface MobileQrScanPayPageProps {
  sessionId: string;
  sig: string;
}

interface ScannedSessionDetails {
  sessionId: string;
  orderId: string;
  amountLkr: number;
  currency: string;
  merchantId: string;
  merchantName: string;
  merchantCity: string;
  status: 'pending' | 'scanned' | 'paid' | 'expired';
  expiresAt: number;
  paymentId: string | null;
}

const SL_BANKS = [
  'BOC SmartPay',
  "People's Pay",
  'Sampath Vishwa',
  'ComBank Q+',
  'HNB Solo',
  'FriMi',
  'Dialog Genie',
];

export const MobileQrScanPayPage: React.FC<MobileQrScanPayPageProps> = ({
  sessionId,
  sig,
}) => {
  const [session, setSession] = useState<ScannedSessionDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [selectedBank, setSelectedBank] = useState<string>(SL_BANKS[0]);
  const [bankPin, setBankPin] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [completedReceipt, setCompletedReceipt] = useState<{
    paymentId: string;
    bankAppName: string;
    amountLkr: number;
    orderId: string;
  } | null>(null);

  // Immediately verify QR scan token with server and mark session as 'scanned'
  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setErrorMsg('');
      try {
        const resp = await fetch('/api/lankaqr/mark-scanned', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, sig }),
        });
        const data = (await resp.json().catch(() => ({}))) as ScannedSessionDetails & {
          error?: string;
        };
        if (!active) return;
        if (!resp.ok) {
          setErrorMsg(data.error || 'Invalid or expired QR payment code.');
          return;
        }
        setSession(data);
        if (data.status === 'paid' && data.paymentId) {
          setCompletedReceipt({
            paymentId: data.paymentId,
            bankAppName: 'LANKAQR Bank App',
            amountLkr: data.amountLkr,
            orderId: data.orderId,
          });
        }
      } catch {
        if (active) {
          setErrorMsg('Unable to reach BuyKit payment server. Please check your internet connection.');
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [sessionId, sig]);

  const handleAuthorizePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;

    const cleanPin = bankPin.trim();
    if (!/^\d{4,6}$/.test(cleanPin)) {
      setErrorMsg('Please enter your 4 to 6 digit mobile banking PIN to authorize payment.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    try {
      const resp = await fetch('/api/lankaqr/authorize-scan-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          sig,
          bankAppName: selectedBank,
          bankPin: cleanPin,
        }),
      });
      const data = (await resp.json().catch(() => ({}))) as {
        verified?: boolean;
        paymentId?: string;
        bankAppName?: string;
        amountLkr?: number;
        orderId?: string;
        error?: string;
      };

      if (!resp.ok || !data.verified || !data.paymentId) {
        setErrorMsg(data.error || 'Payment authorization failed. Please try again.');
        return;
      }

      setCompletedReceipt({
        paymentId: data.paymentId,
        bankAppName: data.bankAppName || selectedBank,
        amountLkr: data.amountLkr || session.amountLkr,
        orderId: data.orderId || session.orderId,
      });
    } catch {
      setErrorMsg('Network error while authorizing payment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-6 text-slate-900">
      <div className="mx-auto max-w-md overflow-hidden rounded-3xl border border-slate-800 bg-white shadow-2xl">
        {/* Top LANKAQR Mobile Header */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-[#F85606] px-5 py-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15">
                <QrCode className="h-5 w-5 text-amber-300" />
              </div>
              <div>
                <span className="block font-mono text-[10px] font-bold tracking-widest text-amber-300 uppercase">
                  LANKAQR · Mobile Scan &amp; Pay
                </span>
                <h1 className="font-display text-base font-extrabold">
                  Sri Lanka Instant LKR Transfer
                </h1>
              </div>
            </div>
            <span className="rounded-lg bg-emerald-500/25 px-2.5 py-1 font-mono text-[10px] font-bold text-emerald-200">
              VERIFIED QR
            </span>
          </div>
        </div>

        <div className="p-5">
          {loading ? (
            <div className="py-12 text-center">
              <Loader2 className="mx-auto h-9 w-9 animate-spin text-[#F85606]" />
              <p className="mt-3 text-sm font-bold text-slate-800">
                Verifying Scanned LANKAQR Code...
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Connecting securely to BuyKit checkout session
              </p>
            </div>
          ) : completedReceipt ? (
            <div className="space-y-4 py-4 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="h-9 w-9" />
              </div>
              <div>
                <h2 className="font-display text-xl font-extrabold text-slate-950">
                  LANKAQR Payment Sent!
                </h2>
                <p className="mt-1 text-xs text-slate-600">
                  Your checkout screen has been notified and will automatically confirm your order.
                </p>
              </div>

              <div className="space-y-2 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-left font-mono text-xs">
                <div className="flex justify-between">
                  <span className="font-sans text-slate-600">Paid Amount:</span>
                  <span className="text-base font-extrabold text-emerald-700">
                    {formatLKR(completedReceipt.amountLkr)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-sans text-slate-600">Merchant:</span>
                  <span className="font-sans font-bold text-slate-900">
                    {session?.merchantName || 'BUYKIT WITH PRAMU'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-sans text-slate-600">Bank App:</span>
                  <span className="font-sans font-bold text-slate-900">
                    {completedReceipt.bankAppName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-sans text-slate-600">Order ID:</span>
                  <span className="font-bold text-slate-900">{completedReceipt.orderId}</span>
                </div>
                <div className="flex justify-between border-t border-emerald-200 pt-2">
                  <span className="font-sans text-slate-600">Payment Ref:</span>
                  <span className="font-bold text-emerald-800">{completedReceipt.paymentId}</span>
                </div>
              </div>

              <p className="text-[11px] font-medium text-slate-500">
                You may safely close this tab or return to your BuyKit checkout screen.
              </p>
            </div>
          ) : !session ? (
            <div className="space-y-4 py-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600">
                <AlertCircle className="h-7 w-7" />
              </div>
              <h2 className="font-display text-lg font-extrabold text-slate-900">
                QR Code Expired or Invalid
              </h2>
              <p className="text-xs text-slate-600">{errorMsg}</p>
            </div>
          ) : (
            <form onSubmit={handleAuthorizePayment} className="space-y-4">
              {/* Merchant & Exact Amount Summary */}
              <div className="rounded-2xl border-2 border-orange-200 bg-[#FFF8F4] p-4 text-center">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[11px] font-bold text-slate-700 shadow-2xs">
                  <Building2 className="h-3.5 w-3.5 text-[#F85606]" />
                  <span>{session.merchantName}</span>
                </div>
                <p className="mt-2 font-mono text-3xl font-extrabold text-[#F85606]">
                  {formatLKR(session.amountLkr)}
                </p>
                <p className="mt-1 font-mono text-[11px] text-slate-500">
                  Order #{session.orderId} · Merchant #{session.merchantId} ({session.merchantCity})
                </p>
              </div>

              {/* Select Sri Lankan Bank App */}
              <div>
                <label className="mb-2 flex items-center gap-1.5 text-xs font-extrabold text-slate-800">
                  <Smartphone className="h-4 w-4 text-[#F85606]" />
                  <span>Pay From Your Sri Lankan Bank App:</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {SL_BANKS.map((bank) => {
                    const active = selectedBank === bank;
                    return (
                      <button
                        key={bank}
                        type="button"
                        onClick={() => setSelectedBank(bank)}
                        className={`rounded-xl border px-3 py-2 text-left text-xs font-bold transition-all ${
                          active
                            ? 'border-[#F85606] bg-[#FFF5F0] text-[#F85606] ring-2 ring-[#F85606]/20'
                            : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white'
                        }`}
                      >
                        {bank}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Mobile Banking PIN Input */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <Lock className="h-3.5 w-3.5 text-[#F85606]" />
                  <span>{selectedBank} 4–6 Digit MPIN / Passcode</span>
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={bankPin}
                  onChange={(e) => setBankPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter 4–6 digit PIN"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-center font-mono text-base font-extrabold tracking-[0.4em] text-slate-900 focus:border-[#F85606] focus:outline-none"
                  required
                />
                <p className="mt-1.5 text-[11px] text-slate-500">
                  Once approved, BuyKit checkout automatically confirms your order in real time.
                </p>
              </div>

              {errorMsg && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || bankPin.length < 4}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3.5 text-sm font-extrabold text-white shadow-md transition-colors hover:bg-emerald-700 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Authorizing LKR Transfer...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    <span>Approve &amp; Pay {formatLKR(session.amountLkr)}</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
