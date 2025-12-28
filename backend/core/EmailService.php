<?php
/**
 * EmailService.php
 * Send emails using EmailJS API (same as frontend)
 * Note: Email sending is stateless, but password reset tokens are stateful (stored in DB)
 */

class EmailService
{
    // EmailJS Configuration for Password Reset (Backend only - separate from frontend)
    // Public Key: 0ofoFeetR5AnIfr9Q (DQN's account - for reset password only)
    private static $resetServiceId = "service_7vsbt6e";
    private static $resetTemplateId = "template_wj11uie";
    private static $resetPublicKey = "0ofoFeetR5AnIfr9Q";
    
    /**
     * Send password reset email via EmailJS (Backend)
     * 
     * @param string $toEmail Recipient email
     * @param string $userName User name
     * @param string $resetLink Password reset link
     * @return bool Success status
     */
    public static function sendPasswordReset(string $toEmail, string $userName, string $resetLink): bool
    {
        // Calculate expiration time (15 minutes from now)
        $expirationTime = date("F j, Y, g:i A", strtotime("+15 minutes"));
        
        $templateParams = [
            "to" => $toEmail,
            "user_name" => $userName,
            "reset_link" => $resetLink,
            "company_name" => "CourierXpress",
            "time" => $expirationTime
        ];
        
        return self::sendViaEmailJS(
            self::$resetServiceId,
            self::$resetTemplateId,
            self::$resetPublicKey,
            $templateParams
        );
    }
    
    /**
     * Send email via EmailJS API
     * 
     * @param string $serviceId EmailJS service ID
     * @param string $templateId EmailJS template ID
     * @param string $publicKey EmailJS public key (user_id)
     * @param array $templateParams Template parameters
     * @return bool Success status
     */
    private static function sendViaEmailJS(
        string $serviceId,
        string $templateId,
        string $publicKey,
        array $templateParams
    ): bool {
        $url = "https://api.emailjs.com/api/v1.0/email/send";
        
        $data = [
            "service_id" => $serviceId,
            "template_id" => $templateId,
            "user_id" => $publicKey,
            "template_params" => $templateParams
        ];
        
        // Check if cURL is available
        if (!function_exists('curl_init')) {
            error_log("cURL is not available. Cannot send email via EmailJS.");
            return false;
        }
        
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            "Content-Type: application/json",
            "Accept: application/json"
        ]);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10); // 10 second timeout
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);
        
        if ($curlError) {
            error_log("EmailJS cURL error: {$curlError}");
            return false;
        }
        
        if ($httpCode === 200) {
            error_log("Email sent successfully via EmailJS to: {$templateParams['to']}");
            return true;
        } else {
            error_log("EmailJS sending failed. HTTP Code: {$httpCode}, Response: {$response}");
            return false;
        }
    }
    
    /**
     * Fallback: Send email using PHP mail() function
     * (Useful if EmailJS is not available)
     * 
     * @param string $toEmail Recipient email
     * @param string $subject Email subject
     * @param string $body Email body
     * @return bool Success status
     */
    public static function sendViaPHPMail(string $toEmail, string $subject, string $body): bool
    {
        $headers = "From: CourierXpress <noreply@courierxpress.com>\r\n";
        $headers .= "Reply-To: noreply@courierxpress.com\r\n";
        $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
        
        $success = mail($toEmail, $subject, $body, $headers);
        
        if ($success) {
            error_log("PHP mail() sent successfully to: {$toEmail}");
        } else {
            error_log("PHP mail() failed to send to: {$toEmail}");
        }
        
        return $success;
    }
}

