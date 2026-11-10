# Security Specification (`security_spec.md`) — BuyKit with Pramu

## 1. Data Invariants

1. **Master Gate & Relational Sync**:
   - Every subcollection document under `/users/{userId}/private/{docId}`, `/users/{userId}/cart/{itemId}`, `/users/{userId}/orders/{orderId}`, and `/users/{userId}/wishlist/{itemId}` can only be created, read (`get`), updated, or deleted if the parent `/users/{userId}` document exists (`exists(/databases/$(database)/documents/users/$(userId))`) and the caller is the verified owner (`request.auth.uid == userId`).
2. **Verified Identity**:
   - All write operations require an authenticated user (`request.auth != null`) with a verified email (`request.auth.token.email_verified == true`), or the bootstrapped admin (`viduthminsara106@gmail.com` with verified email).
3. **PII Split Collection Isolation**:
   - Personally Identifiable Information (`email`, `phone`, `shippingAddress`, `postalCode`) is strictly isolated in `/users/{userId}/private/{docId}` and never exposed in `/users/{userId}`.
4. **Strict Schema & Volumetric Bounds**:
   - Every string field enforces `.size()` bounds matching `firebase-blueprint.json`.
   - Every ID field and path variable (`userId`, `docId`, `itemId`, `orderId`, `productId`, `orderNumber`) matches `^[a-zA-Z0-9_\-]+$` and `.size() <= 128`.
5. **Temporal & Immortal Field Integrity**:
   - On `create`: `incoming().createdAt == request.time && incoming().updatedAt == request.time`.
   - On `update`: `incoming().createdAt == existing().createdAt && incoming().updatedAt == request.time` and `incoming().userId == existing().userId`.
6. **Terminal State Locking**:
   - Orders in `/users/{userId}/orders/{orderId}` with `existing().status in ['delivered', 'cancelled']` are locked against any further client updates unless overridden by `isAdmin()`.
7. **Secure List Queries & Public Marketplace Reviews / Q&A**:
   - Every `allow list` rule on `/users/{userId}/cart`, `/users/{userId}/orders`, and `/users/{userId}/wishlist` enforces `request.auth.uid == userId && resource.data.userId == request.auth.uid` without `get()`/`exists()` calls inside `list`.
   - Public marketplace interaction collections (`/product_reviews/{reviewId}`, `/review_replies/{replyId}`, `/product_questions/{questionId}`, `/question_answers/{answerId}`) enforce `existing().visibility == 'public'` on `get` and `list`, and require `isVerifiedUser()`, `incoming().userId == request.auth.uid`, `userParentExists(request.auth.uid)`, and parent document existence (`exists(...)` for replies and answers) on `create`.

---

## 2. The "Dirty Dozen" Payloads

1. **Payload 1 (Identity Spoofing on User Create)**: Authenticated user `uid_A` attempts to create `/users/uid_A` with `userId: "uid_B"`. -> `PERMISSION_DENIED`.
2. **Payload 2 (Unverified Email Write)**: User with `email_verified: false` attempts to create `/users/uid_A/cart/item_1`. -> `PERMISSION_DENIED`.
3. **Payload 3 (Shadow Field Injection on Cart Create)**: User sends valid `CartItem` payload plus `"isAdmin": true`. -> `PERMISSION_DENIED` (`hasOnly` check fails).
4. **Payload 4 (Orphaned Cart Subcollection Write)**: User `uid_ghost` attempts to create `/users/uid_ghost/cart/item_1` before `/users/uid_ghost` exists. -> `PERMISSION_DENIED` (Master Gate `exists()` check fails).
5. **Payload 5 (ID Poisoning Attack)**: User attempts to create `/users/uid_A/cart/bad$id!@#` with invalid characters. -> `PERMISSION_DENIED` (`isValidId` fails).
6. **Payload 6 (Value Poisoning on Cart Update)**: User updates `quantity` in `/users/uid_A/cart/item_1` to `"99999"` (string) or `-5` or `1000`. -> `PERMISSION_DENIED` (`isValidCartItem` fails).
7. **Payload 7 (Immortal Field Mutation)**: User updates `createdAt` or `productId` on an existing `/users/uid_A/cart/item_1`. -> `PERMISSION_DENIED`.
8. **Payload 8 (Client Timestamp Forgery)**: User sets `createdAt` to a past timestamp instead of `request.time`. -> `PERMISSION_DENIED`.
9. **Payload 9 (PII Cross-User Read)**: User `uid_B` attempts `get` on `/users/uid_A/private/info`. -> `PERMISSION_DENIED`.
10. **Payload 10 (Terminal State Mutation on Order)**: User attempts to update `/users/uid_A/orders/ord_1` when `existing().status == 'delivered'`. -> `PERMISSION_DENIED`.
11. **Payload 11 (Unbounded String DoS)**: User attempts to write a 5,000-character `shippingAddress` to `/users/uid_A/private/info`. -> `PERMISSION_DENIED` (`.size() <= 300` fails).
12. **Payload 12 (Cross-Tenant List Scraping)**: User `uid_B` attempts `list` on `/users/uid_A/cart`. -> `PERMISSION_DENIED` (`request.auth.uid == userId && resource.data.userId == request.auth.uid` fails).
