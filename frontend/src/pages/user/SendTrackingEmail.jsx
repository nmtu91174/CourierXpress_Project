import { useState } from "react";
import emailjs from "emailjs-com";

function SendTrackingEmail() {
  const [email, setEmail] = useState("");
  const [trackingCode, setTrackingCode] = useState("");
  const [status, setStatus] = useState("");

  const handleSend = (e) => {
    e.preventDefault();

    const templateParams = {
      to_email: email,
      tracking_code: trackingCode,
    };

    emailjs
      .send(
        "SERVICE_ID",
        "TEMPLATE_ID",
        templateParams,
        "PUBLIC_KEY"
      )
      .then(
        () => setStatus("Email đã được gửi thành công!"),
        (error) => setStatus("Gửi thất bại: " + error.text)
      );
  };

  return (
    <div style={{ width: "400px", margin: "20px auto" }}>
      <h3>Gửi mã vận đơn</h3>

      <form onSubmit={handleSend}>
        <input
          type="email"
          placeholder="Nhập email khách..."
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ width: "100%", padding: "8px", marginBottom: "10px" }}
        />

        <input
          type="text"
          placeholder="Nhập mã vận đơn..."
          value={trackingCode}
          onChange={(e) => setTrackingCode(e.target.value)}
          required
          style={{ width: "100%", padding: "8px", marginBottom: "10px" }}
        />

        <button
          type="submit"
          style={{ width: "100%", padding: "10px", cursor: "pointer" }}
        >
          Gửi Email
        </button>
      </form>

      {status && <p style={{ marginTop: "10px" }}>{status}</p>}
    </div>
  );
}

export default SendTrackingEmail;
