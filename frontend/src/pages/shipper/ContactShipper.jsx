import "../../assets/styles/shipper/ContactShipper.css";
export default function Contact() {
  return (
    <>
      {/* CONTACT HEADER */}
      <section className="contact-header text-white text-center">
        <h1>Contact Us</h1>
        <p>Contact us for quick support</p>
      </section>

      {/* CONTACT CONTENT */}
      <div className="container my-5">
        <div className="row g-5">

          {/* LEFT: CONTACT FORM */}
          <div className="col-md-6">
            <h3 className="fw-bold mb-3">Send Us a Message</h3>

            <form className="contact-form">
              <div className="mb-3">
                <label className="form-label">Your Name</label>
                <input type="text" className="form-control" placeholder="Enter your name..." required />
              </div>

              <div className="mb-3">
                <label className="form-label">Email</label>
                <input type="email" className="form-control" placeholder="Enter your email..." required />
              </div>

              <div className="mb-3">
                <label className="form-label">Message</label>
                <textarea className="form-control" rows="4" placeholder="What would you like to send?"></textarea>
              </div>

              <button type="submit" className="btn btn-primary w-100 mt-2">
                Send Message
              </button>
            </form>
          </div>

          {/* RIGHT: COMPANY INFO */}
          <div className="col-md-6">
            <h3 className="fw-bold mb-3">Contact Information</h3>

            <div className="contact-info mb-4">
              <p><strong>Address:</strong> 123 FastShip Street, Hanoi</p>
              <p><strong>Hotline:</strong> 0987 654 321</p>
              <p><strong>Email:</strong> support@fastship.com</p>
              <p><strong>Working Hours:</strong> 8:00 - 18:00 (Monday - Saturday)</p>
            </div>

            {/* MAP */}
            <div className="map-container">
              <iframe
                title="map"
                src="https://maps.google.com/maps?q=hanoi&t=&z=13&ie=UTF8&iwloc=&output=embed"
                width="100%"
                height="250"
                style={{ border: 0, borderRadius: "12px" }}
                allowFullScreen=""
                loading="lazy"
              ></iframe>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
