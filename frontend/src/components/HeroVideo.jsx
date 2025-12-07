import React, { useEffect, useRef } from "react";
import { Container } from "react-bootstrap";
import { heroFadeIn } from "../animations/heroAnimation";
import "../assets/styles/HeroVideo.css";

const HeroVideo = () => {
  const titleRef = useRef(null);
  const subtitleRef = useRef(null);

  useEffect(() => {
    heroFadeIn(titleRef, subtitleRef);
  }, []);

  return (
    <div className="hero-video-section">
      <video
        className="hero-bg-video"
        autoPlay
        loop
        muted
        playsInline
      >
        <source src="/videos/CourierXpress.mp4" type="video/mp4" />
      </video>

      <div className="hero-overlay"></div>

      <Container>
        <div className="hero-content">
          <h1 ref={titleRef} className="hero-title">
            Delivery at <span className="text-danger">Light Speed</span>
          </h1>
          <p ref={subtitleRef} className="hero-subtitle">
            Reliable logistics solutions for your business. We deliver packages across the globe with precision and care.
          </p>
        </div>
      </Container>
    </div>
  );
};

export default HeroVideo;
