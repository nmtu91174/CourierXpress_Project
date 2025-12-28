/**
 * EmailJS Configuration for Authentication Emails (DQN's Account)
 * 
 * This config is used for:
 * - Password reset emails
 * - Account verification emails (if needed)
 * 
 * Service: Authentication Email Service
 * Account: DQN's EmailJS account
 * 
 * ⚠️ Note: Password reset is currently handled by backend (EmailService.php)
 * This config is kept for future frontend auth email needs
 */

export const EMAILJS_AUTH_CONFIG = {
  SERVICE_ID: "service_7vsbt6e",
  TEMPLATE_ID: "template_wj11uie",
  PUBLIC_KEY: "0ofoFeetR5AnIfr9Q"
};

// Export default for convenience
export default EMAILJS_AUTH_CONFIG;

