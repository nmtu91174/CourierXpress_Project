# EmailJS Debug Checklist - Forgot Password

## ✅ Current Configuration

**Service ID:** `service_7vsbt6e`  
**Template ID:** `template_wj11uie`  
**Public Key:** `5EwRopnOusFLIkA2N`

## 🔍 Debug Steps

### 1. Verify Service ID in EmailJS Dashboard

1. Go to: https://dashboard.emailjs.com/admin
2. Navigate to **Email Services**
3. Find your service (Gmail/SMTP/etc.)
4. **Copy the exact Service ID** (should be `service_7vsbt6e`)
5. Verify it's **Active** (not disabled)

### 2. Verify Template ID

1. Go to **Email Templates** in EmailJS Dashboard
2. Find template `template_wj11uie`
3. Verify it has these variables:
   - `{{user_name}}`
   - `{{reset_link}}`
   - `{{company_name}}`
   - `{{time}}`
   - `{{to}}`

### 3. Verify Public Key

1. Go to **Account** → **General** in EmailJS Dashboard
2. Find **Public Key** (should be `5EwRopnOusFLIkA2N`)
3. Copy exact value

### 4. Test in EmailJS Dashboard

1. Go to template `template_wj11uie`
2. Click **Test** button
3. Fill in test values:
   ```
   user_name: Test User
   reset_link: https://example.com/reset?token=test123
   company_name: CourierXpress
   time: January 28, 2025, 10:30 AM
   to: your-test-email@gmail.com
   ```
4. If test email sends successfully → Service/Template is OK
5. If test fails → Check service configuration

## 🚨 Common Issues

### Issue 1: "Service ID not found" (400)

**Causes:**
- Service ID is incorrect
- Service is deleted or disabled
- Service belongs to different EmailJS account

**Fix:**
- Copy exact Service ID from dashboard
- Ensure service is **Active**
- Check you're logged into correct EmailJS account

### Issue 2: "Template ID not found" (400)

**Causes:**
- Template ID is incorrect
- Template is deleted
- Template belongs to different service

**Fix:**
- Copy exact Template ID from dashboard
- Ensure template is linked to correct service
- Check template is **Active**

### Issue 3: "Public Key invalid" (403)

**Causes:**
- Public Key is incorrect
- Public Key is from different account

**Fix:**
- Copy exact Public Key from Account → General
- Ensure you're using the correct account

## ✅ Quick Fix

If you see error 400 "Service ID not found":

1. **Open EmailJS Dashboard**
2. **Copy exact Service ID** from Email Services
3. **Update ForgotPassword.jsx line 111:**
   ```js
   emailjs.send(
       "service_XXXXXXX", // ← Paste exact Service ID here
       "template_wj11uie",
       emailData,
       "5EwRopnOusFLIkA2N"
   )
   ```
4. **Save and reload**
5. **Test again**

## 📝 Verification

After updating, check browser console:
- ✅ Should see: `✅ Password reset email sent successfully: 200 OK`
- ❌ Should NOT see: `❌ Email sending failed: {status: 400, text: "Service ID not found"}`

## 🔗 EmailJS Dashboard Links

- **Services:** https://dashboard.emailjs.com/admin/integration
- **Templates:** https://dashboard.emailjs.com/admin/template
- **Account Settings:** https://dashboard.emailjs.com/admin/general

