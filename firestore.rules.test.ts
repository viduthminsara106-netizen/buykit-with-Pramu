/**
 * Security Rules Dirty Dozen Specification Runner
 * Verifies all 12 adversarial payloads defined in security_spec.md
 * are rejected with PERMISSION_DENIED by firestore.rules.
 */

export interface DirtyDozenScenario {
  id: number;
  name: string;
  targetPath: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  expectedOutcome: 'PERMISSION_DENIED';
  payload?: Record<string, unknown>;
}

export const DIRTY_DOZEN_SCENARIOS: DirtyDozenScenario[] = [
  {
    id: 1,
    name: 'Identity Spoofing on User Create',
    targetPath: '/users/uid_A',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    payload: { userId: 'uid_B', displayName: 'Spoofer', photoUrl: '', newUserDealClaimed: false },
  },
  {
    id: 2,
    name: 'Unverified Email Write',
    targetPath: '/users/uid_A/cart/item_1',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Shadow Field Injection on Cart Create',
    targetPath: '/users/uid_A/cart/item_1',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    payload: { isAdmin: true },
  },
  {
    id: 4,
    name: 'Orphaned Cart Subcollection Write',
    targetPath: '/users/uid_ghost/cart/item_1',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'ID Poisoning Attack',
    targetPath: '/users/uid_A/cart/bad$id!@#',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Value Poisoning on Cart Update',
    targetPath: '/users/uid_A/cart/item_1',
    operation: 'update',
    expectedOutcome: 'PERMISSION_DENIED',
    payload: { quantity: 1000 },
  },
  {
    id: 7,
    name: 'Immortal Field Mutation',
    targetPath: '/users/uid_A/cart/item_1',
    operation: 'update',
    expectedOutcome: 'PERMISSION_DENIED',
    payload: { productId: 'tampered_product' },
  },
  {
    id: 8,
    name: 'Client Timestamp Forgery',
    targetPath: '/users/uid_A',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    payload: { createdAt: '2020-01-01T00:00:00Z' },
  },
  {
    id: 9,
    name: 'PII Cross-User Read',
    targetPath: '/users/uid_A/private/info',
    operation: 'get',
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Terminal State Mutation on Order',
    targetPath: '/users/uid_A/orders/ord_1',
    operation: 'update',
    expectedOutcome: 'PERMISSION_DENIED',
    payload: { status: 'processing' },
  },
  {
    id: 11,
    name: 'Unbounded String DoS',
    targetPath: '/users/uid_A/private/info',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    payload: { shippingAddress: 'A'.repeat(5000) },
  },
  {
    id: 12,
    name: 'Cross-Tenant List Scraping',
    targetPath: '/users/uid_A/cart',
    operation: 'list',
    expectedOutcome: 'PERMISSION_DENIED',
  },
];
