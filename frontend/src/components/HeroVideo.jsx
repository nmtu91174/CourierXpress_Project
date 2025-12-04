// src/components/HeroVideo.jsx
import React from 'react';
import { Container, Button } from 'react-bootstrap';
import '../assets/styles/HeroVideo.CSS'; // Import file CSS vừa tạo

const HeroVideo = () => {
    return (
        <div className="hero-video-section">

            {/* 1. VIDEO BACKGROUND */}
            <video
                className="hero-bg-video"
                autoPlay
                loop
                muted
                playsInline // Thuộc tính quan trọng cho Safari/iOS
            >
                {/* Đường dẫn bắt đầu bằng dấu / nghĩa là tính từ thư mục public */}
                <source src="/videos/CourierXpress.mp4" type="video/mp4" />
                Your browser does not support the video tag.
            </video>

            {/* 2. OVERLAY (Lớp mờ) */}
            <div className="hero-overlay"></div>

            {/* 3. CONTENT (Nội dung chính) */}
            <Container>
                <div className="hero-content">
                    <h1 className="hero-title">
                        Delivery at <span className="text-danger">Light Speed</span>
                    </h1>
                    <p className="hero-subtitle">
                        Reliable logistics solutions for your business. We deliver packages across the globe with precision and care.
                    </p>

                    {/* <div className="d-flex justify-content-center gap-3">
                        <Button variant="danger" size="lg" className="rounded-pill px-5 py-3 fw-bold">
                            Track Shipment
                        </Button>
                        <Button variant="outline-light" size="lg" className="rounded-pill px-5 py-3 fw-bold">
                            Get Quote
                        </Button>
                    </div> */}
                </div>
            </Container>

        </div>
    );
};

export default HeroVideo;