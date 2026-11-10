import React, { useState } from 'react';
import { ShieldCheck, Lock, X, Check, Loader2 } from 'lucide-react';
import { signInWithGoogleAccount, User } from '../firebase';

interface AuthGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendingProductName?: string | null;
  onSuccess: (user: User) => void;
}

export const AuthGateModal: React.FC<AuthGateModalProps> = ({
  isOpen,
  onClose,
  pendingProductName,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleAuth = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const user = await signInWithGoogleAccount();
      onSuccess(user);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-800"
          aria-label="Close sign in dialog"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#FFF1EB] text-[#F85606]">
          {pendingProductName ? <Lock className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
        </div>

        <h2 className="font-display text-xl font-bold text-slate-900">
          {pendingProductName
            ? 'Account Required to Add to Cart'
            : 'Welcome to BuyKit with Pramu'}
        </h2>

        {pendingProductName ? (
          <div className="mt-2 rounded-xl border border-orange-200 bg-[#FFF5F0] p-3 text-xs leading-relaxed text-slate-900">
            <p className="font-semibold text-[#F85606]">
              Only registered shoppers with an account can add products to the cart.
            </p>
            <p className="mt-1 text-slate-700">
              To add <strong>"{pendingProductName}"</strong> to your shopping cart and unlock New User Deal LKR pricing, please sign in or create your free account with Google below.
            </p>
          </div>
        ) : (
          <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
            Sign in or create your free account in one click with Google to unlock New User Exclusive Deals (up to 65% off in LKR), save items to your cart, and track orders across Sri Lanka.
          </p>
        )}

        <div className="mt-5 space-y-2.5 border-y border-slate-100 py-4 text-xs text-slate-700">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>Add products to your persistent cloud Cart & Checkout in LKR</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>Unlock New User Welcome Voucher & SuperDeals Flash Sale prices</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>100% Buyer Protection & Islandwide Cash on Delivery (COD)</span>
          </div>
        </div>

        {errorMsg && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
            {errorMsg}
          </div>
        )}

        <div className="mt-5">
          <button
            type="button"
            onClick={handleGoogleAuth}
            disabled={loading}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-xs transition-all hover:bg-slate-50 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin text-slate-600" />
            ) : (
              <svg
                version="1.1"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 48 48"
                className="h-5 w-5 shrink-0"
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
            )}
            <span>Continue with Google (Login / Create Account)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
