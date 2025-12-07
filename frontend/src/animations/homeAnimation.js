// src/animations/homeAnimation.js
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Đăng ký plugin ScrollTrigger (1 lần duy nhất)
gsap.registerPlugin(ScrollTrigger);

/**
 * Feature Cards Scroll Animation
 * DQN Luxury Version — smooth, neutral, high performance
 *
 * Cách dùng:
 *   import { featureCardsReveal } from "@/animations/homeAnimation";
 *   useEffect(() => { featureCardsReveal(); }, []);
 */
export const featureCardsReveal = (
  cardSelector = ".feature-card",
  triggerSection = ".features-section"
) => {

  // 🧽 Reset style để tránh hiện tượng card không hiện
  gsap.set(cardSelector, {
    opacity: 1,
    y: 0,
    clearProps: "all"
  });

  // 🧊 Stagger reveal
  gsap.fromTo(
    cardSelector,
    {
      opacity: 0,
      y: 60
    },
    {
      opacity: 1,
      y: 0,
      duration: 0.9,
      ease: "power3.out",
      stagger: 0.15,
      scrollTrigger: {
        trigger: triggerSection,
        start: "top 85%",
        toggleActions: "play none none none"
      }
    }
  );
};
