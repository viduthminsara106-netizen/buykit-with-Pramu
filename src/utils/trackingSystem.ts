export interface RealTrackingRecord {
  trackingNumber: string;
  orderId: string;
  orderNumber: string;
  carrierName: string;
  carrierCode: string;
  originFacility: string;
  destinationHub: string;
  summaryTitle: string;
  itemCount: number;
  totalAmount: number;
  paymentMethod: 'cod' | 'card_express';
  status:
    | 'processing'
    | 'preparing'
    | 'dispatched'
    | 'in_transit'
    | 'shipped'
    | 'delivered'
    | 'cancelled';
  createdAtMs: number;
  updatedAtMs: number;
}

export interface TrackingValidationResult {
  isValid: boolean;
  normalizedCode: string;
  carrierName: string;
  countryCode: string;
  dispatchDateFormatted: string | null;
  reason?: string;
}

const TRACKING_REGISTRY_STORAGE_KEY = 'buykit_real_tracking_registry_v1';
export const DEFAULT_CARRIER_NAME = 'BuyKit Express Logistics';
export const DEFAULT_CARRIER_PREFIX = 'BKEX';

/**
 * Computes a standard Mod-10 (Luhn) check digit for a numeric string.
 * This ensures every generated BuyKit Express waybill can be mathematically verified.
 */
export function computeLuhnCheckDigit(numericString: string): string {
  const digits = numericString.replace(/\D/g, '');
  if (!digits) return '0';

  let sum = 0;
  let shouldDouble = true;
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits[i], 10);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return String(checkDigit);
}

function formatDateSegmentYYMMDD(timestampMs: number): string {
  const d = new Date(timestampMs);
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}${mm}${dd}`;
}

function generateCryptoSixDigits(): string {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const arr = new Uint32Array(1);
    window.crypto.getRandomValues(arr);
    const num = 100000 + (arr[0] % 900000);
    return String(num);
  }
  return String(100000 + Math.floor(Math.random() * 900000));
}

function hashStringToSixDigits(seed: string): string {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const positive = Math.abs(hash >>> 0);
  return String(100000 + (positive % 900000));
}

/**
 * Generates a unique, Mod-10 checksum-validated BuyKit Express tracking number.
 * Format: BKEX-LK-YYMMDD-XXXXXX-C (e.g. BKEX-LK-261123-482917-5)
 */
export function generateRealTrackingNumber(createdAtMs: number = Date.now()): string {
  const datePart = formatDateSegmentYYMMDD(createdAtMs);
  const serialPart = generateCryptoSixDigits();
  const checkDigit = computeLuhnCheckDigit(`${datePart}${serialPart}`);
  return `${DEFAULT_CARRIER_PREFIX}-LK-${datePart}-${serialPart}-${checkDigit}`;
}

/**
 * Deterministically derives a valid Mod-10 checksummed tracking number for legacy
 * orders that were placed before tracking numbers were persisted in Firestore.
 */
export function deriveLegacyTrackingNumber(
  orderNumber: string,
  createdAtMs: number = Date.now()
): string {
  const cleanSeed = orderNumber.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || 'BKP000001';
  const datePart = formatDateSegmentYYMMDD(createdAtMs);
  const serialPart = hashStringToSixDigits(cleanSeed);
  const checkDigit = computeLuhnCheckDigit(`${datePart}${serialPart}`);
  return `${DEFAULT_CARRIER_PREFIX}-LK-${datePart}-${serialPart}-${checkDigit}`;
}

/**
 * Validates the format and Mod-10 Luhn check digit of a BuyKit Express tracking number.
 */
export function validateTrackingNumber(rawCode: string): TrackingValidationResult {
  const normalized = rawCode.trim().toUpperCase().replace(/\s+/g, '');
  const match = normalized.match(/^([A-Z]{2,6})-([A-Z]{2})-(\d{6})-(\d{6})-(\d)$/);

  if (!match) {
    return {
      isValid: false,
      normalizedCode: normalized,
      carrierName: DEFAULT_CARRIER_NAME,
      countryCode: 'LK',
      dispatchDateFormatted: null,
      reason: 'Tracking number format should look like BKEX-LK-261123-482917-5.',
    };
  }

  const [, carrierCode, countryCode, datePart, serialPart, providedCheckDigit] = match;
  const expectedCheckDigit = computeLuhnCheckDigit(`${datePart}${serialPart}`);
  if (providedCheckDigit !== expectedCheckDigit) {
    return {
      isValid: false,
      normalizedCode: normalized,
      carrierName: carrierCode === 'BKEX' ? DEFAULT_CARRIER_NAME : `${carrierCode} Courier`,
      countryCode,
      dispatchDateFormatted: null,
      reason: 'Checksum verification failed. Please double-check the tracking number.',
    };
  }

  const year = 2000 + parseInt(datePart.slice(0, 2), 10);
  const monthIdx = parseInt(datePart.slice(2, 4), 10) - 1;
  const day = parseInt(datePart.slice(4, 6), 10);
  const parsedDate = new Date(year, monthIdx, day);
  const dispatchDateFormatted = Number.isNaN(parsedDate.getTime())
    ? null
    : parsedDate.toLocaleDateString('en-LK', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });

  return {
    isValid: true,
    normalizedCode: normalized,
    carrierName: carrierCode === 'BKEX' ? DEFAULT_CARRIER_NAME : `${carrierCode} Express`,
    countryCode,
    dispatchDateFormatted,
  };
}

function readTrackingRegistry(): Record<string, RealTrackingRecord> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(TRACKING_REGISTRY_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, RealTrackingRecord>) : {};
  } catch {
    return {};
  }
}

function writeTrackingRegistry(registry: Record<string, RealTrackingRecord>): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(TRACKING_REGISTRY_STORAGE_KEY, JSON.stringify(registry));
  } catch {
    // Ignore storage quota / private mode issues
  }
}

export function saveRealTrackingRecord(record: RealTrackingRecord): void {
  const registry = readTrackingRegistry();
  const normTracking = record.trackingNumber.trim().toUpperCase();
  registry[normTracking] = record;
  registry[`ORDER::${record.orderNumber.trim().toUpperCase()}`] = record;
  registry[`ID::${record.orderId}`] = record;
  writeTrackingRegistry(registry);
}

export function updateRealTrackingStatus(
  orderId: string,
  orderNumber: string,
  status: RealTrackingRecord['status']
): void {
  const registry = readTrackingRegistry();
  const existing =
    registry[`ID::${orderId}`] || registry[`ORDER::${orderNumber.trim().toUpperCase()}`];
  if (!existing) return;
  const updated: RealTrackingRecord = {
    ...existing,
    status,
    updatedAtMs: Date.now(),
  };
  saveRealTrackingRecord(updated);
}

export function lookupRealTrackingRecord(queryText: string): RealTrackingRecord | null {
  const norm = queryText.trim().toUpperCase().replace(/^#/, '');
  if (!norm) return null;
  const registry = readTrackingRegistry();
  return registry[norm] || registry[`ORDER::${norm}`] || null;
}

/**
 * Resolves the canonical, checksum-valid tracking number for any order object.
 * Prefers persisted trackingNumber -> local tracking registry -> deterministic Mod-10 waybill.
 */
export function resolveOrderTrackingNumber(order: {
  id?: string;
  orderNumber: string;
  trackingNumber?: string;
  createdAtMs?: number;
}): string {
  if (order.trackingNumber && order.trackingNumber.trim().length >= 8) {
    return order.trackingNumber.trim().toUpperCase();
  }

  const registry = readTrackingRegistry();
  const fromRegistry =
    (order.id ? registry[`ID::${order.id}`] : undefined) ||
    registry[`ORDER::${order.orderNumber.trim().toUpperCase()}`];

  if (fromRegistry?.trackingNumber) {
    return fromRegistry.trackingNumber;
  }

  return deriveLegacyTrackingNumber(order.orderNumber, order.createdAtMs);
}
