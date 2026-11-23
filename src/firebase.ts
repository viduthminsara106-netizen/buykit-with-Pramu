import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  onSnapshot,
  serverTimestamp,
  query,
  where,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate connection on boot as required by firebase-integration-rpc skill
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

// Blueprint Validation Constants (synced verbatim with firebase-blueprint.json & firestore.rules)
export const VALIDATION_LIMITS = {
  ID_REGEX: /^[a-zA-Z0-9_\-]+$/,
  MAX_ID_LEN: 128,
  MAX_DISPLAY_NAME: 80,
  MAX_PHOTO_URL: 500,
  MAX_EMAIL: 160,
  MAX_PHONE: 30,
  MAX_ADDRESS: 300,
  MAX_POSTAL: 20,
  MAX_TITLE: 140,
  MAX_CATEGORY: 60,
  MAX_SUMMARY: 200,
  MAX_HUB_NAME: 120,
  MAX_REVIEW_COMMENT: 1500,
  MAX_REPLY_COMMENT: 1000,
  MAX_QUESTION_TEXT: 1000,
  MAX_MEDIA_DATA_URL: 195000,
};

export function sanitizeId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, VALIDATION_LIMITS.MAX_ID_LEN);
  return cleaned.length > 0 ? cleaned : 'item_default';
}

export const ROOT_ADMIN_EMAIL = 'viduthminsara106@gmail.com';
export const SECONDARY_ROOT_ADMIN_EMAIL = 'pramudithamanuja853@gmail.com';
export const ROOT_ADMIN_EMAILS = [
  ROOT_ADMIN_EMAIL,
  SECONDARY_ROOT_ADMIN_EMAIL,
] as const;

export function isRootAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return ROOT_ADMIN_EMAILS.some((root) => root.toLowerCase() === normalized);
}

export function emailToAdminKey(email: string): string {
  return email
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .slice(0, VALIDATION_LIMITS.MAX_ID_LEN);
}

export type AdminNotificationType =
  | 'cart_add'
  | 'order_placed'
  | 'review_added'
  | 'question_asked'
  | 'sale_started'
  | 'sale_ended'
  | 'promo_updated'
  | 'system';

export interface AdminEmailRecord {
  id: string;
  adminEmailId: string;
  email: string;
  addedByEmail: string;
  role: 'admin';
  createdAtMs: number;
}

export interface AdminNotificationRecord {
  id: string;
  notificationId: string;
  type: AdminNotificationType;
  title: string;
  message: string;
  actorUserId: string;
  actorName: string;
  actorEmail: string;
  relatedId: string;
  read: boolean;
  createdAtMs: number;
  isLocalOnly?: boolean;
}

export interface AdminOrderRecord {
  id: string;
  orderId: string;
  userId: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  summaryTitle: string;
  itemCount: number;
  totalAmount: number;
  paymentMethod: 'cod' | 'card_express';
  paymentLabel: string;
  pickupHubName: string;
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
  isLocalOnly?: boolean;
}

export async function emitAdminNotificationToFirestore(params: {
  type: AdminNotificationType;
  title: string;
  message: string;
  relatedId?: string;
  user?: User | null;
  fallbackActorName?: string;
  fallbackActorEmail?: string;
}): Promise<AdminNotificationRecord> {
  const activeUser = params.user || auth.currentUser;
  const notificationId = sanitizeId(
    `notif_${params.type}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
  );
  const actorUserId = sanitizeId(activeUser?.uid || 'guest_shopper');
  const actorName = (
    activeUser?.displayName ||
    params.fallbackActorName ||
    activeUser?.email?.split('@')[0] ||
    'BuyKit Shopper'
  ).slice(0, VALIDATION_LIMITS.MAX_DISPLAY_NAME);
  const actorEmail = (
    activeUser?.email ||
    params.fallbackActorEmail ||
    'guest@buykit.lk'
  ).slice(0, VALIDATION_LIMITS.MAX_EMAIL);
  const cleanTitle = params.title.trim().slice(0, 140) || 'Storefront Activity';
  const cleanMessage = params.message.trim().slice(0, 500) || 'New activity recorded.';
  const cleanRelatedId = sanitizeId(params.relatedId || 'general');

  const localRecord: AdminNotificationRecord = {
    id: notificationId,
    notificationId,
    type: params.type,
    title: cleanTitle,
    message: cleanMessage,
    actorUserId,
    actorName,
    actorEmail,
    relatedId: cleanRelatedId,
    read: false,
    createdAtMs: Date.now(),
    isLocalOnly: !activeUser || !activeUser.emailVerified,
  };

  if (activeUser && activeUser.emailVerified) {
    try {
      await setDoc(doc(db, 'admin_notifications', notificationId), {
        notificationId,
        type: params.type,
        title: cleanTitle,
        message: cleanMessage,
        actorUserId: activeUser.uid,
        actorName,
        actorEmail,
        relatedId: cleanRelatedId,
        read: false,
        createdAt: serverTimestamp(),
      });
      localRecord.isLocalOnly = false;
    } catch (err) {
      // Never block shopper checkout/cart/review UX if notification write fails
      console.warn('Admin notification Firestore write skipped:', err);
    }
  }

  return localRecord;
}

export async function ensureUserProfileDocument(user: User): Promise<void> {
  const userPath = `users/${user.uid}`;
  const userRef = doc(db, 'users', user.uid);
  try {
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      await setDoc(userRef, {
        userId: user.uid,
        displayName: (user.displayName || user.email?.split('@')[0] || 'BuyKit Shopper').slice(
          0,
          VALIDATION_LIMITS.MAX_DISPLAY_NAME
        ),
        photoUrl: (user.photoURL || '').slice(0, VALIDATION_LIMITS.MAX_PHOTO_URL),
        newUserDealClaimed: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, userPath);
  }
}

export async function signInWithGoogleAccount(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  await ensureUserProfileDocument(result.user);
  return result.user;
}

export async function signOutAccount(): Promise<void> {
  await signOut(auth);
}

export {
  onAuthStateChanged,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  onSnapshot,
  serverTimestamp,
  query,
  where,
};
export type { User };
