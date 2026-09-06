# NEXOVIRA — Security Specification & Access Control Model

## 1. Executive Summary & Security Objectives
This document establishes the formal Access Control Model (ABAC) and Data Integrity Invariants for **NEXOVIRA Marketplace Product Ownership & Permissions**.

The primary objective is to enforce hard server-side boundaries such that:
1. **Public Marketplace Visibility**: All customers and visitors can browse, search, filter, and inspect published products across all approved sellers.
2. **Seller Isolation**: Seller A can NEVER create, edit, delete, replace, hide, or manipulate Seller B's products.
3. **Backend Ownership Immutability**: Product creation automatically enforces `sellerId == request.auth.uid`. A seller cannot reassign product ownership to another seller or bypass ownership checks.
4. **Administrative Governance**: Platform Admins retain full supervisory authority to moderate, update, delete, or reassign product ownership when authorized.

---

## 2. Data Invariants

- **Invariant 1 (Seller Assignment)**: On product creation by a Seller, `sellerId` MUST equal `request.auth.uid`.
- **Invariant 2 (Cross-Seller Modification Lock)**: A Seller can update or delete a product document IF AND ONLY IF `resource.data.sellerId == request.auth.uid`.
- **Invariant 3 (Ownership Immutability)**: During product updates by a Seller, the `sellerId` field cannot be modified (`request.resource.data.sellerId == resource.data.sellerId`). Only Admins may change `sellerId`.
- **Invariant 4 (Customer Non-Modification)**: Users with role `customer` or unauthenticated guests have ZERO write permissions (`create`, `update`, `delete`) on the `/products` collection.
- **Invariant 5 (Field Boundaries)**: Product titles, descriptions, prices, stocks, and category IDs must satisfy strict length, type, and positive value bounds.

---

## 3. The "Dirty Dozen" Malicious Payload Attack Matrix

The following 12 attack vectors represent malicious or unauthorized operations that MUST return `PERMISSION_DENIED` (or HTTP 403) under all circumstances:

| # | Attack Vector Description | Actor | Target Product | Intended Malicious Action | Expected Result |
|---|---|---|---|---|---|
| 1 | **Spoofed Creation** | Seller A (`uid_seller_a`) | New Product | Creates product with `sellerId: "uid_seller_b"` to pollute Seller B's store | `PERMISSION_DENIED` |
| 2 | **Cross-Seller Title Vandalism** | Seller A (`uid_seller_a`) | Product B (`sellerId: "uid_seller_b"`) | Modifies title of Seller B's top-selling product | `PERMISSION_DENIED` |
| 3 | **Price Manipulation Attack** | Seller A (`uid_seller_a`) | Product B (`sellerId: "uid_seller_b"`) | Reduces Seller B's product price to $0.01 to ruin competitor margins | `PERMISSION_DENIED` |
| 4 | **Stock Depletion Exploitation** | Seller A (`uid_seller_a`) | Product B (`sellerId: "uid_seller_b"`) | Sets Seller B's stock to 0 to make them appear out-of-stock | `PERMISSION_DENIED` |
| 5 | **Ownership Transfer Exploit** | Seller A (`uid_seller_a`) | Product A (`sellerId: "uid_seller_a"`) | Changes `sellerId` to `"uid_seller_b"` during update | `PERMISSION_DENIED` |
| 6 | **Competitor Product Deletion** | Seller A (`uid_seller_a`) | Product B (`sellerId: "uid_seller_b"`) | Deletes Seller B's listing | `PERMISSION_DENIED` |
| 7 | **Customer Privilege Escalation** | Customer (`uid_customer_1`) | New Product | Tries to create a product without having `seller` or `admin` role | `PERMISSION_DENIED` |
| 8 | **Customer Price Tampering** | Customer (`uid_customer_1`) | Product A (`sellerId: "uid_seller_a"`) | Updates product price right before checkout | `PERMISSION_DENIED` |
| 9 | **Customer Inventory Vandalism** | Customer (`uid_customer_1`) | Product A (`sellerId: "uid_seller_a"`) | Deletes product listing | `PERMISSION_DENIED` |
| 10 | **Unauthenticated Product Creation** | Guest (No Auth) | New Product | Attempts `setDoc` on `/products/new-prod` without auth token | `PERMISSION_DENIED` |
| 11 | **Unauthenticated Product Update** | Guest (No Auth) | Product A (`sellerId: "uid_seller_a"`) | Attempts modifying product description without login | `PERMISSION_DENIED` |
| 12 | **Unauthenticated Product Deletion** | Guest (No Auth) | Product A (`sellerId: "uid_seller_a"`) | Attempts `deleteDoc` on `/products/prod-123` | `PERMISSION_DENIED` |

---

## 4. Test Matrix & Rule Verification

```typescript
// Sample unit test assertion concepts for firebase rules
describe('Firestore Security Rules: Product Ownership Isolation', () => {
  // Test 1: Public Read
  it('allows unauthenticated guest to read any published product', async () => {
    // Expect: ALLOW
  });

  // Test 2: Seller Own Product Create
  it('allows Seller A to create product with sellerId = Seller A uid', async () => {
    // Expect: ALLOW
  });

  // Test 3: Seller A Spoofed Create
  it('DENIES Seller A creating product with sellerId = Seller B uid', async () => {
    // Expect: PERMISSION_DENIED
  });

  // Test 4: Seller A Update Own Product
  it('allows Seller A to update their own product', async () => {
    // Expect: ALLOW
  });

  // Test 5: Seller A Update Seller B Product
  it('DENIES Seller A updating Seller B product', async () => {
    // Expect: PERMISSION_DENIED
  });

  // Test 6: Seller A Delete Seller B Product
  it('DENIES Seller A deleting Seller B product', async () => {
    // Expect: PERMISSION_DENIED
  });

  // Test 7: Admin Full Access
  it('allows Admin to update or delete any product regardless of sellerId', async () => {
    // Expect: ALLOW
  });
});
```
