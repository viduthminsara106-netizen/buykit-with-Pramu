export interface PayHerePaymentIntentResponse {
  hasLiveMerchantConfig: boolean;
  sandbox: boolean;
  merchant_id: string;
  return_url: string;
  cancel_url: string;
  notify_url: string;
  order_id: string;
  items: string;
  amount: string;
  currency: string;
  hash: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
}

declare global {
  interface Window {
    payhere?: {
      startPayment: (payment: Record<string, unknown>) => void;
      onCompleted: (orderId: string) => void;
      onDismissed: () => void;
      onError: (error: string) => void;
    };
  }
}

export interface CreatePayHereIntentParams {
  orderId: string;
  amount: number;
  itemsTitle: string;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country?: string;
}

/**
 * Calls our Express backend (`POST /api/payhere/create-payment-intent`)
 * to generate a cryptographically signed MD5 `hash` and PayHere PaymentIntent payload.
 */
export async function createPayHerePaymentIntent(
  params: CreatePayHereIntentParams
): Promise<PayHerePaymentIntentResponse> {
  const nameParts = (params.fullName || 'BuyKit Customer').trim().split(/\s+/);
  const firstName = nameParts[0] || 'BuyKit';
  const lastName = nameParts.slice(1).join(' ') || 'Shopper';

  const response = await fetch('/api/payhere/create-payment-intent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderId: params.orderId,
      amount: params.amount,
      currency: 'LKR',
      itemsTitle: params.itemsTitle,
      firstName,
      lastName,
      email: params.email || 'customer@buykit.lk',
      phone: params.phone || '0771234567',
      address: params.address || 'Colombo',
      city: params.city || 'Colombo',
      country: params.country || 'Sri Lanka',
    }),
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    throw new Error(errBody.error || 'Failed to create PayHere PaymentIntent.');
  }

  return (await response.json()) as PayHerePaymentIntentResponse;
}

/**
 * Launches the official PayHere JS SDK Popup when live/sandbox merchant credentials
 * are configured in `.env`.
 */
export function launchOfficialPayHerePopup(
  intent: PayHerePaymentIntentResponse,
  callbacks: {
    onSuccess: (orderId: string) => void;
    onCancel: () => void;
    onError: (errorMsg: string) => void;
  }
): boolean {
  if (!window.payhere) {
    return false;
  }

  window.payhere.onCompleted = (completedOrderId: string) => {
    callbacks.onSuccess(completedOrderId || intent.order_id);
  };

  window.payhere.onDismissed = () => {
    callbacks.onCancel();
  };

  window.payhere.onError = (error: string) => {
    callbacks.onError(error || 'PayHere payment could not be completed.');
  };

  const { hasLiveMerchantConfig: _ignored, ...payhereSdkPayload } = intent;
  window.payhere.startPayment(payhereSdkPayload);
  return true;
}
