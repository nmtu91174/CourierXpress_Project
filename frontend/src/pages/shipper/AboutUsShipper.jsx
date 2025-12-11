
import "../../assets/styles/shipper/AboutUsShipper.css";
export default function About() {
  return (
    <>

      <section className="banner-full">
        <img src="/images/Banner.jpg" alt="Banner" />
      </section>

      {/* 🔶 WHO WE ARE */}
      <section className="container my-5">
        <div className="row align-items-center">

          <div className="col-md-6">
            <h2 className="fw-bold mb-3">Who We Are</h2>
            <p className="text-muted">
              FastShip Express là đơn vị vận chuyển uy tín với hơn 5 năm kinh nghiệm.
              Chúng tôi mang đến giải pháp giao hàng tiết kiệm, đúng giờ
              cùng khả năng theo dõi hành trình theo thời gian thực.
            </p>
          </div>

          <div className="col-md-6 text-center">
            <div className="square-img">
              <img src="/images/Who We Are.avif" alt="Who We Are" />
            </div>
          </div>

        </div>
      </section>

      {/* 🔶 WHY CHOOSE US */}
      <section className="container my-5">
        <h2 className="fw-bold text-center mb-4">Why Choose Us</h2>

        <div className="row g-4 justify-content-center">

          {/* Fast Delivery */}
          <div className="col-lg-3 col-md-4 col-sm-6 d-flex justify-content-center">
            <div className="feature-box text-center">
              <div className="square-img mb-3">
                <img src="/images/FastDelivery.jpg" alt="Fast Delivery" />
              </div>
              <h4 className="fw-bold">Fast Delivery</h4>
              <p className="text-muted">Giao hàng từ 2–4 giờ trong nội thành.</p>
            </div>
          </div>

          {/* Real-Time Tracking */}
          <div className="col-lg-3 col-md-4 col-sm-6 d-flex justify-content-center">
            <div className="feature-box text-center">
              <div className="square-img mb-3">
                <img src="/images/Real-Time Tracking.jpg" alt="Tracking" />
              </div>
              <h4 className="fw-bold">Real-Time Tracking</h4>
              <p className="text-muted">Theo dõi đơn hàng từng phút.</p>
            </div>
          </div>

          {/* Secure Handling */}
          <div className="col-lg-3 col-md-4 col-sm-6 d-flex justify-content-center">
            <div className="feature-box text-center">
              <div className="square-img mb-3">
                <img src="/images/Secure Handling.jpg" alt="Secure" />
              </div>
              <h4 className="fw-bold">Secure Handling</h4>
              <p className="text-muted">An toàn tuyệt đối.</p>
            </div>
          </div>

        </div>
      </section>

      {/* 🔶 ACHIEVEMENTS */}
      <section className="bg-light py-5">
        <div className="container text-center">
          <h2 className="fw-bold mb-4">Our Achievements</h2>

          <div className="row gy-3 justify-content-center">
            
            <div className="col-md-3">
              <p className="stat-number">10,000+</p>
              <p>Đơn hàng mỗi ngày</p>
            </div>

            <div className="col-md-3">
              <p className="stat-number">98%</p>
              <p>Khách hàng hài lòng</p>
            </div>

            <div className="col-md-3">
              <p className="stat-number">1,200+</p>
              <p>Đối tác doanh nghiệp</p>
            </div>

            <div className="col-md-3">
              <p className="stat-number">63</p>
              <p>Tỉnh thành phục vụ</p>
            </div>

          </div>
        </div>
      </section>

    </>
  );
}
