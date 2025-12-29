# Invoice Module - Database Mapping Documentation

## 📋 Overview

This document explains how the Invoice module maps data from the database schema to the UI components.

---

## 🗄️ Database Structure

### Core Tables

- `invoices` - Invoice records
- `orders` - Order records
- `order_fees` - Fee items for each order
- `fees` - Fee definitions (base fees, weight fees, etc.)
- `payments` - Payment records
- `payment_methods` - Payment method definitions
- `users` - Customer/agent/shipper information

---

## 📊 Data Mapping Rules

### 1. Invoice Data (`invoices` table)

**Fields used:**
- `id` → Invoice ID
- `invoice_number` → Display as invoice number
- `total_amount` → Invoice total (already includes VAT)
- `status` → Invoice status (paid/unpaid/cancelled)
- `payment_method_id` → Links to payment_methods
- `created_at` → Invoice creation date
- `order_id` → Foreign key to orders table

**API Response Structure:**
```json
{
  "invoice": {
    "id": 1,
    "invoice_number": "INV000001",
    "total_amount": 55000.00,
    "status": "paid",
    "payment_method_id": 1,
    "payment_method_name": "Tiền mặt",
    "created_at": "2025-01-15 10:30:00"
  }
}
```

---

### 2. Order Data (`orders` table)

**Fields used:**
- `id` → Order ID
- `order_code` → Order code (e.g., ORD0001)
- `sender_name`, `sender_phone`, `sender_address` → Customer info
- `receiver_name`, `receiver_phone`, `receiver_address` → Delivery info
- `total_shipping_fee` → Base shipping fee (legacy, prefer order_fees)
- `cod_amount` → COD amount (DISPLAY ONLY, not included in invoice total)
- `penalty_fee` → Penalty for weight mismatch (included in invoice)
- `weight` → Package weight
- `service_type` → Links to service_types
- `status` → Order status

**Important Notes:**
- ❌ `cod_amount` is **NOT** included in invoice total calculation
- ✅ `penalty_fee` **IS** included in invoice total
- ✅ Use `order.fees` array (from order_fees table) for cost breakdown

---

### 3. Order Fees (`order_fees` + `fees` tables)

**How it works:**
1. `order_fees` stores fee items for each order
2. Join `order_fees.fee_id` → `fees.id` to get fee details
3. Each fee has: `amount`, `fee_name`, `fee_code`, `fee_type`

**Fee Types:**
- `base` → Base shipping fee
- `weight` → Weight-based fee
- `extra` → Additional service fee
- `cod` → COD amount (excluded from invoice total)
- `insurance` → Insurance fee

**API Response Structure:**
```json
{
  "order": {
    "fees": [
      {
        "id": 1,
        "fee_id": 1,
        "fee_name": "Phí cơ bản",
        "fee_code": "base_fee",
        "fee_type": "base",
        "amount": 15000.00
      },
      {
        "id": 2,
        "fee_id": 2,
        "fee_name": "Phí theo trọng lượng",
        "fee_code": "weight_fee",
        "fee_type": "weight",
        "amount": 5000.00
      },
      {
        "id": 3,
        "fee_id": 4,
        "fee_name": "Giá trị Thu Hộ (COD)",
        "fee_code": "cod_amount_value",
        "fee_type": "cod",
        "amount": 80000.00
      }
    ]
  }
}
```

**Cost Breakdown Logic:**
```javascript
// ✅ CORRECT: Use order.fees array
const costItems = order.fees
  .filter(fee => fee.fee_code !== "cod_amount_value") // Exclude COD
  .map(fee => ({
    name: fee.fee_name,
    description: getFeeDescription(fee.fee_code),
    amount: fee.amount
  }));

// Add penalty fee if exists
if (order.penalty_fee > 0) {
  costItems.push({
    name: "Penalty Fee",
    amount: order.penalty_fee
  });
}

// ❌ WRONG: Don't use order.total_shipping_fee directly
// ❌ WRONG: Don't include cod_amount in invoice total
```

---

### 4. Invoice Total Calculation

**Formula:**
```
Subtotal = SUM(order_fees.amount WHERE fee_code != "cod_amount_value") + penalty_fee
VAT = Subtotal × 0.1 (10%)
Invoice Total = Subtotal + VAT
```

**In Code:**
```javascript
// Calculate subtotal (excluding COD)
const subtotal = order.fees
  .filter(f => f.fee_code !== "cod_amount_value")
  .reduce((sum, f) => sum + f.amount, 0) + (order.penalty_fee || 0);

// Calculate VAT (10%)
const vatRate = 0.1;
const vatAmount = subtotal * vatRate;

// Total (prefer from invoice.total_amount if available)
const total = invoice.total_amount || (subtotal + vatAmount);
```

---

## 🔄 Component Data Flow

### CostBreakdown Component

**Input:**
- `invoiceData` - Invoice object from API
- `orderData` - Order object with `fees` array

**Logic:**
1. Map `orderData.fees` to cost items
2. Filter out COD amount (`fee_code === "cod_amount_value"`)
3. Add penalty fee if exists
4. Calculate subtotal (sum of all fees except COD + penalty)
5. Calculate VAT (10% of subtotal)
6. Use `invoiceData.total_amount` if available, otherwise calculate

**Output:**
- Cost breakdown table
- Subtotal row
- VAT row
- Total row
- COD display box (separate, informational only)

---

### TaxTable Component

**Input:**
- `subtotal` - Subtotal amount (excluding VAT)
- `vatRate` - VAT rate (default 0.1 = 10%)

**Output:**
- Tax information table
- Subtotal, VAT rate, VAT amount, Total

---

## ⚠️ Important Rules

### ✅ DO:

1. **Use `order.fees` array** for cost breakdown
2. **Exclude COD amount** from invoice total calculation
3. **Include penalty_fee** in invoice total
4. **Use `invoice.total_amount`** if available (from DB)
5. **Display COD separately** as informational only

### ❌ DON'T:

1. ❌ Include `cod_amount` in invoice total
2. ❌ Use `order.total_shipping_fee` directly (use order.fees instead)
3. ❌ Calculate invoice total from scratch if `invoice.total_amount` exists
4. ❌ Mix COD amount with other fees in cost breakdown

---

## 📝 API Endpoints

### GET `/api/admin/get_invoices.php`

Returns paginated invoice list.

**Query Parameters:**
- `page` - Page number
- `limit` - Items per page
- `status` - Filter by status (paid/unpaid/cancelled)
- `search` - Search by invoice number or order code

**Response:**
```json
{
  "status": "success",
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "totalPages": 10
    }
  }
}
```

### GET `/api/admin/get_invoice.php`

Returns invoice detail with order and fees.

**Query Parameters:**
- `invoice_id` - Invoice ID (required if order_id not provided)
- `order_id` - Order ID (required if invoice_id not provided)

**Response:**
```json
{
  "status": "success",
  "data": {
    "invoice": {
      "id": 1,
      "invoice_number": "INV000001",
      "total_amount": 55000.00,
      "status": "paid",
      ...
    },
    "order": {
      "id": 1,
      "order_code": "ORD0001",
      "fees": [...],
      "cod_amount": 80000.00,
      "penalty_fee": 0,
      ...
    }
  }
}
```

---

## 🎯 Summary

The Invoice module correctly maps database data by:

1. Using `order.fees` array for cost breakdown
2. Excluding COD amount from calculations
3. Using `invoice.total_amount` as source of truth
4. Displaying COD separately as informational only
5. Including penalty fees in invoice total

This ensures accurate invoice calculations that match the database schema and business logic.

