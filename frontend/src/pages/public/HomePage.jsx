import { useState } from 'react';
import '../../assets/styles/HomePage.css'
import {
  Package,
  TrendingUp,
  Shield,
  Clock,
  Search,
  Truck,
  Smartphone,
  MapPin,
  Headphones,
  Globe,
  Building2,
  Users,
  Award,
  PackageSearch,
  Calendar,
  CheckCircle2,
  ArrowRight,
  Facebook,
  Twitter,
  Instagram,
  Youtube,
  Mail,
  Phone,
} from 'lucide-react';

function App() {
  const [trackingId, setTrackingId] = useState('');

  // Sửa lỗi cú pháp Typescript (id: string) -> (id)
  const handleTrackingSearch = (id) => {
    if (id.trim()) {
      alert(`Tracking: ${id}`);
    } else {
      alert('Vui lòng nhập mã vận đơn để tra cứu.');
    }
  };

  // Sửa lỗi cú pháp Typescript (e: React.FormEvent) -> (e)
  const handleSubmit = (e) => {
    e.preventDefault();
    handleTrackingSearch(trackingId);
  };

  const currentYear = new Date().getFullYear();

  return (
    <div className="home-page min-h-screen">
      {/* KHỐI STYLE CHO HIỆU ỨNG ANIMATION (GIỮ LẠI TRONG JSX) */}
      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-20px);
          }
        }
        @keyframes pulse {
          0%, 100% {
            opacity: 0.3;
          }
          50% {
            opacity: 0.5;
          }
        }

        .animate-fade-in {
          animation: fade-in 1s ease-out;
        }

        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .animate-pulse {
          animation: pulse 4s ease-in-out infinite;
        }
      `}</style>
      {/* END KHỐI STYLE */}

      {/* 1. HERO SECTION */}
      <section className="hero-section1">
        <div className="hero-overlay"></div>

        <div className="container hero-content">
          <div className="hero-grid">
            <div className="animate-fade-in">
              <div className="hero-tag">
                <TrendingUp className="icon-tiny" />
                <span className="text-sm font-medium">Dẫn đầu ngành logistics Việt Nam</span>
              </div>

              <h1 className="hero-title">
                Giao hàng
                <span className="hero-title-highlight">Nhanh, An toàn</span>
                <span className="hero-title-gradient">Đúng Hẹn</span>
              </h1>

              <p className="hero-subtitle">
                CourierXpress - Giải pháp logistics toàn diện với công nghệ hiện đại,
                mang đến trải nghiệm giao nhận hàng hóa vượt trội cho khách hàng.
              </p>

              <div className="hero-actions">
                <button className="btn btn-large btn-primary">
                  Gửi hàng ngay
                </button>
                <button className="btn btn-large btn-secondary">
                  Xem bảng giá
                </button>
              </div>

              <div className="stats-grid">
                <div className="stat-item">
                  <div className="stat-value">500K+</div>
                  <div className="stat-label">Đơn hàng/tháng</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">63/63</div>
                  <div className="stat-label">Tỉnh thành</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">98%</div>
                  <div className="stat-label">Hài lòng</div>
                </div>
              </div>
            </div>

            <div className="hero-image-placeholder animate-float">
              <div className="hero-info-box">
                <div className="info-grid">
                  <div className="info-card info-card-orange">
                    <Package className="icon-medium icon-white mb-4" />
                    <div className="info-title">Giao hàng</div>
                    <div className="info-subtitle">Siêu tốc</div>
                  </div>

                  <div className="info-card info-card-blue">
                    <Shield className="icon-medium icon-white mb-4" />
                    <div className="info-title">Bảo hiểm</div>
                    <div className="info-subtitle">100%</div>
                  </div>

                  <div className="info-card info-card-blue-dark">
                    <Clock className="icon-medium icon-white mb-4" />
                    <div className="info-title">Tracking</div>
                    <div className="info-subtitle">Real-time</div>
                  </div>

                  <div className="info-card info-card-orange-dark">
                    <TrendingUp className="icon-medium icon-white mb-4" />
                    <div className="info-title">Tăng trưởng</div>
                    <div className="info-subtitle">150%/năm</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="hero-bottom-fade"></div>
      </section>

      {/* 3. FEATURES SECTION */}
      <section className="features-section">
        <div className="container">
          <div className="section-header">
            <div className="section-tag section-tag-blue">
              Tính năng nổi bật
            </div>
            <h2 className="section-title">
              Tại sao chọn CourierXpress?
            </h2>
            <p className="section-subtitle">
              Chúng tôi mang đến giải pháp logistics toàn diện với công nghệ hiện đại
              và dịch vụ chuyên nghiệp
            </p>
          </div>

          <div className="features-grid">
            {[
              { icon: Truck, title: 'Giao hàng siêu tốc', description: 'Cam kết giao hàng nhanh chóng với mạng lưới logistics rộng khắp cả nước.', color: 'feature-icon-orange' },
              { icon: Shield, title: 'An toàn tuyệt đối', description: 'Bảo hiểm hàng hóa 100% và quy trình xử lý chuyên nghiệp, cẩn trọng.', color: 'feature-icon-blue' },
              { icon: Clock, title: 'Tracking 24/7', description: 'Theo dõi đơn hàng thời gian thực, cập nhật liên tục mọi lúc mọi nơi.', color: 'feature-icon-green' },
              { icon: Smartphone, title: 'Ứng dụng thông minh', description: 'Quản lý đơn hàng dễ dàng qua app mobile với giao diện thân thiện.', color: 'feature-icon-blue-dark' },
              { icon: MapPin, title: 'Phủ sóng toàn quốc', description: 'Mạng lưới 63/63 tỉnh thành, giao đến tận tay khách hàng mọi địa điểm.', color: 'feature-icon-red' },
              { icon: Headphones, title: 'Hỗ trợ tận tâm', description: 'Đội ngũ CSKH chuyên nghiệp, sẵn sàng hỗ trợ 24/7 qua mọi kênh.', color: 'feature-icon-blue-light' },
            ].map((feature, index) => (
              <div
                key={index}
                className="feature-card"
              >
                <div className={`feature-icon ${feature.color}`}>
                  <feature.icon className="icon-medium icon-white" />
                </div>

                <h3 className="feature-title">
                  {feature.title}
                </h3>

                <p className="feature-description">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. SERVICES SECTION */}
      <section className="services-section">
        <div className="container">
          <div className="section-header">
            <div className="section-tag section-tag-orange">
              Dịch vụ của chúng tôi
            </div>
            <h2 className="section-title">
              Giải pháp logistics đa dạng
            </h2>
            <p className="section-subtitle">
              Lựa chọn dịch vụ phù hợp với nhu cầu của bạn
            </p>
          </div>

          <div className="services-grid">
            {[
              { icon: Package, title: 'Giao hàng tiêu chuẩn', description: 'Dịch vụ giao hàng nội thành và liên tỉnh với giá cả hợp lý, thời gian giao hàng 2-3 ngày.', features: ['Phù hợp mọi loại hàng hóa', 'Giá cả cạnh tranh', 'Tracking realtime'], price: 'Từ 15.000đ', color: 'blue', image: '🚚' },
              { icon: Truck, title: 'Giao hàng nhanh', description: 'Dịch vụ express với cam kết giao hàng trong vòng 24h trong cùng thành phố, 48h liên tỉnh.', features: ['Ưu tiên xử lý', 'Giao hàng trong ngày', 'Bồi thường 100%'], price: 'Từ 25.000đ', color: 'orange', image: '⚡' },
              { icon: Globe, title: 'Giao hàng quốc tế', description: 'Kết nối toàn cầu với dịch vụ chuyển phát nhanh quốc tế đến hơn 200 quốc gia.', features: ['Thông quan nhanh', 'Tracking toàn cầu', 'Tư vấn miễn phí'], price: 'Liên hệ', color: 'green', image: '🌏' },
              { icon: Building2, title: 'Giải pháp doanh nghiệp', description: 'Dịch vụ logistics toàn diện cho doanh nghiệp với giá ưu đãi và hỗ trợ chuyên biệt.', features: ['Giá đặc biệt', 'Quản lý tập trung', 'API tích hợp'], price: 'Báo giá riêng', color: 'blue', image: '🏢' },
            ].map((service, index) => (
              <div
                key={index}
                className="service-card"
              >
                <div className="flex items-start gap-6">
                  <div className="service-emoji">{service.image}</div>

                  <div className="flex-1">
                    <div className="service-details">
                      <div className={`service-icon-wrapper service-icon-wrapper-${service.color}`}>
                        <service.icon className="icon-small icon-white" />
                      </div>
                      <div>
                        <h3 className="service-title">
                          {service.title}
                        </h3>
                        <p className="service-price">
                          {service.price}
                        </p>
                      </div>
                    </div>

                    <p className="service-description">
                      {service.description}
                    </p>

                    <ul className="service-features-list">
                      {/* Sửa lỗi cú pháp Typescript (feature: string, idx: number) -> (feature, idx) */}
                      {service.features.map((feature, idx) => (
                        <li key={idx} className="service-feature-item">
                          <div className="feature-dot"></div>
                          {feature}
                        </li>
                      ))}
                    </ul>

                    <a href="#" className="service-link-more">
                      Tìm hiểu thêm
                      <span>→</span>
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. STATS SECTION */}
      <section className="stats-section">
        <div className="stats-overlay"></div>

        <div className="container stats-content">
          <div className="section-header section-header-white">
            <div className="section-tag section-tag-orange-dark">
              Con số ấn tượng
            </div>
            <h2 className="section-title">
              CourierXpress trong con số
            </h2>
            <p className="section-subtitle">
              Những thành tựu đáng tự hào trong hành trình phát triển của chúng tôi
            </p>
          </div>

          <div className="stats-cards-grid">
            {[
              { icon: Package, value: '500K+', label: 'Đơn hàng mỗi tháng', description: 'Xử lý và vận chuyển', color: 'stat-card-icon-orange' },
              { icon: Users, value: '100K+', label: 'Khách hàng tin tưởng', description: 'Cá nhân và doanh nghiệp', color: 'stat-card-icon-blue' },
              { icon: MapPin, value: '63/63', label: 'Tỉnh thành phủ sóng', description: 'Khắp Việt Nam', color: 'stat-card-icon-green' },
              { icon: Award, value: '98%', label: 'Độ hài lòng', description: 'Từ khách hàng', color: 'stat-card-icon-red' },
            ].map((stat, index) => (
              <div
                key={index}
                className="stat-card"
              >
                <div className="stat-card-inner">
                  <div className={`stat-card-icon ${stat.color}`}>
                    <stat.icon className="icon-medium icon-white" />
                  </div>

                  <div className="stat-card-value">
                    {stat.value}
                  </div>

                  <div className="stat-card-label">
                    {stat.label}
                  </div>

                  <div className="stat-card-description">
                    {stat.description}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="partners-info">
            <p className="partners-text">
              Đồng hành cùng hơn 5,000 doanh nghiệp lớn nhỏ trên toàn quốc
            </p>
            <div className="partners-logos">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="partner-logo-placeholder"
                >
                  Logo
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 6. PROCESS SECTION */}
      <section className="process-section">
        <div className="container">
          <div className="section-header">
            <div className="section-tag section-tag-green">
              Quy trình đơn giản
            </div>
            <h2 className="section-title">
              Gửi hàng chỉ với 4 bước
            </h2>
            <p className="section-subtitle">
              Quy trình giao nhận đơn giản, nhanh chóng và minh bạch
            </p>
          </div>

          <div className="process-flow">
            <div className="process-line"></div>

            <div className="process-grid">
              {[
                { icon: PackageSearch, title: 'Đặt đơn hàng', description: 'Đăng ký thông tin gửi hàng qua website, app hoặc hotline. Nhập đầy đủ thông tin người gửi và người nhận.', step: '01' },
                { icon: Calendar, title: 'Xác nhận & lấy hàng', description: 'Nhân viên xác nhận đơn hàng và đến lấy hàng tại địa chỉ của bạn trong vòng 2-4 giờ.', step: '02' },
                { icon: Truck, title: 'Vận chuyển', description: 'Hàng hóa được vận chuyển qua mạng lưới logistics hiện đại. Theo dõi realtime qua mã tracking.', step: '03' },
                { icon: CheckCircle2, title: 'Giao hàng thành công', description: 'Shipper giao hàng đến tay người nhận. Thu hộ COD (nếu có) và chuyển tiền về cho bạn.', step: '04' },
              ].map((step, index) => (
                <div
                  key={index}
                  className="process-step-wrapper"
                >
                  <div className="process-step-card">
                    <div className="step-number">
                      {step.step}
                    </div>

                    <div className="step-content">
                      <div className="step-icon-wrapper">
                        <step.icon className="icon-medium icon-white" />
                      </div>

                      <h3 className="step-title">
                        {step.title}
                      </h3>

                      <p className="step-description">
                        {step.description}
                      </p>
                    </div>
                  </div>

                  {index < 3 && (
                    <div className="process-connector">
                      <div className="connector-circle">
                        <ArrowRight className="icon-tiny icon-white" strokeWidth={3} />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="process-cta">
            <button className="btn btn-primary btn-large">
              Bắt đầu gửi hàng ngay
            </button>
          </div>
        </div>
      </section>

      {/* 7. CTA APP SECTION */}
      <section className="app-cta-section">
        <div className="app-cta-overlay"></div>

        <div className="container app-cta-content">
          <div className="app-cta-grid">
            <div>
              <div className="app-cta-tag">
                Ưu đãi đặc biệt
              </div>

              <h2 className="app-cta-title">
                Trải nghiệm ngay
                <span className="app-cta-title-block">ứng dụng CourierXpress</span>
              </h2>

              <p className="app-cta-subtitle">
                Tải app ngay hôm nay để nhận voucher giảm giá 50% cho đơn hàng đầu tiên.
                Quản lý đơn hàng dễ dàng, theo dõi realtime, thanh toán nhanh chóng.
              </p>

              <div className="app-cta-buttons">
                <button className="btn btn-app-store">
                  <Smartphone className="icon-small" />
                  <span>Tải trên App Store</span>
                  <ArrowRight className="icon-tiny" />
                </button>

                <button className="btn btn-google-play">
                  <Smartphone className="icon-small" />
                  <span>Tải trên Google Play</span>
                  <ArrowRight className="icon-tiny" />
                </button>
              </div>

              <div className="app-cta-features">
                <div className="app-feature-item">
                  <CheckCircle2 className="icon-tiny" />
                  <span>Miễn phí tải về</span>
                </div>
                <div className="app-feature-item">
                  <CheckCircle2 className="icon-tiny" />
                  <span>Giao diện thân thiện</span>
                </div>
                <div className="app-feature-item">
                  <CheckCircle2 className="icon-tiny" />
                  <span>Bảo mật cao</span>
                </div>
              </div>
            </div>

            <div className="app-mockup">
              <div className="app-mockup-box">
                <div className="app-mockup-display">
                  <div className="text-center">
                    <div className="app-mockup-emoji">📱</div>
                    <div className="app-mockup-title">CourierXpress</div>
                    <div className="app-mockup-subtitle">Mobile App</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="app-stats-footer">
            <div>
              <div className="app-stat-value">4.8★</div>
              <div className="app-stat-label">Đánh giá trung bình</div>
            </div>
            <div>
              <div className="app-stat-value">50K+</div>
              <div className="app-stat-label">Lượt tải về</div>
            </div>
            <div>
              <div className="app-stat-value">10K+</div>
              <div className="app-stat-label">Đánh giá 5 sao</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default App;