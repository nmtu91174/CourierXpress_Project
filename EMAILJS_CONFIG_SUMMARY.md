# EmailJS Configuration Summary

## 📋 Overview

EmailJS configurations have been separated by business domain to avoid conflicts and maintain clear ownership.

---

## 🔵 Order EmailJS Config (Đức's Account)

**File:** `frontend/src/config/emailjs.order.config.js`

**Used for:**
- Order confirmation emails
- Bill of lading emails
- Order tracking emails

**Configuration:**
```js
SERVICE_ID: "service_z6xn9og"
TEMPLATE_ID: "template_d7keh2g"
PUBLIC_KEY: "5EwRopnOusFLIkA2N"
```

**Files using this config:**
- `frontend/src/JS/OrderNoAccount.js` - Order creation email

**⚠️ DO NOT MODIFY** - This is Đức's production account

---

## 🟢 Auth EmailJS Config (DQN's Account)

**File:** `frontend/src/config/emailjs.auth.config.js`

**Used for:**
- Password reset emails (currently handled by backend)
- Future: Account verification emails

**Configuration:**
```js
SERVICE_ID: "service_7vsbt6e"
TEMPLATE_ID: "template_wj11uie"
PUBLIC_KEY: "0ofoFeetR5AnIfr9Q"
```

**Files using this config:**
- Currently: **Backend only** (`backend/core/EmailService.php`)
- Future: Frontend auth emails if needed

**Note:** Password reset is currently handled by backend EmailService, not frontend EmailJS.

---

## 🔴 Backend EmailService (DQN's Account)

**File:** `backend/core/EmailService.php`

**Used for:**
- Password reset emails (backend sends via EmailJS API)

**Configuration:**
```php
$resetServiceId = "service_7vsbt6e"
$resetTemplateId = "template_wj11uie"
$resetPublicKey = "0ofoFeetR5AnIfr9Q"
```

**Files using this:**
- `backend/api/auth/forgot_password.php` - Calls EmailService::sendPasswordReset()

---

## 📝 Usage Examples

### Frontend - Order Email (Đức's Config)

```js
import { EMAILJS_ORDER_CONFIG } from "@/config/emailjs.order.config";

emailjs.send(
  EMAILJS_ORDER_CONFIG.SERVICE_ID,
  EMAILJS_ORDER_CONFIG.TEMPLATE_ID,
  emailData,
  EMAILJS_ORDER_CONFIG.PUBLIC_KEY
);
```

### Frontend - Auth Email (DQN's Config - Future)

```js
import { EMAILJS_AUTH_CONFIG } from "@/config/emailjs.auth.config";

emailjs.send(
  EMAILJS_AUTH_CONFIG.SERVICE_ID,
  EMAILJS_AUTH_CONFIG.TEMPLATE_ID,
  emailData,
  EMAILJS_AUTH_CONFIG.PUBLIC_KEY
);
```

### Backend - Password Reset

```php
EmailService::sendPasswordReset(
    $userEmail,
    $userName,
    $resetLink
);
```

---

## ✅ Benefits

1. **Separation of Concerns**: Order emails and auth emails use different accounts
2. **No Conflicts**: Changing one config doesn't affect the other
3. **Easy Maintenance**: All configs in one place
4. **Security**: Public keys are centralized and easy to rotate
5. **Clear Ownership**: Each domain has its own EmailJS account

---

## 🔒 Security Notes

- Public keys are stored in config files (not in environment variables)
- For production, consider moving to environment variables
- Backend EmailService uses its own config (separate from frontend)
- Password reset emails are sent from backend (more secure)

---

## 📌 Migration Checklist

- [x] Created `emailjs.order.config.js` (Đức's account)
- [x] Created `emailjs.auth.config.js` (DQN's account)
- [x] Refactored `OrderNoAccount.js` to use config
- [x] Backend EmailService uses separate config
- [x] Password reset handled by backend (no frontend EmailJS)
- [ ] Future: Move configs to environment variables for production

