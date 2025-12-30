// heroTimeline.js
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * Init Hero timeline (scoped)
 * @param {HTMLElement} root Hero root element
 */
export function initHeroTimeline(root = document) {
  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Query scoped
  const q = (sel) => (root?.querySelector ? root.querySelector(sel) : null);
  const qa = (sel) => (root?.querySelectorAll ? root.querySelectorAll(sel) : []);

  const heroElements = qa(
    ".hero-eyebrow, .hero-kicker, .hero-title-line, .hero-title-highlight, .hero-underline, .hero-description, .hero-actions > *, .hero-card"
  );

  if (!heroElements.length) return null;

  // Reduced motion: set final state immediately
  if (prefersReduced) {
    gsap.set(heroElements, { clearProps: "all" });
    gsap.set(qa(".hero-card"), { clearProps: "transform" });
    return null;
  }

  heroElements.forEach((el) => {
    el.style.willChange = "transform, opacity";
  });

  const heroTl = gsap.timeline({
    defaults: { ease: "power2.out", duration: 0.3 },
  });

  heroTl.from(q(".hero-eyebrow"), { opacity: 0, y: 12, duration: 0.2 });

  heroTl.from(
    qa(".hero-kicker, .hero-title-line, .hero-title-highlight"),
    { opacity: 0, y: 16, stagger: 0.06, duration: 0.42 },
    "-=0.12"
  );

  const underlinePath = q(".hero-underline path");
  if (underlinePath && underlinePath.getTotalLength) {
    const pathLength = underlinePath.getTotalLength();
    underlinePath.style.strokeDasharray = pathLength;
    underlinePath.style.strokeDashoffset = pathLength;

    heroTl.to(underlinePath, {
      strokeDashoffset: 0,
      duration: 0.42,
      ease: "power1.out",
    });
  } else {
    heroTl.from(q(".hero-underline"), {
      scaleX: 0,
      transformOrigin: "left center",
      duration: 0.32,
    });
  }

  heroTl.from(
    q(".hero-description"),
    { opacity: 0, y: 12, duration: 0.32 },
    "-=0.14"
  );

  heroTl.from(
    qa(".hero-actions > *"),
    { opacity: 0, y: 10, stagger: 0.07, duration: 0.42 },
    "-=0.14"
  );

  heroTl.fromTo(
    qa(".hero-card"),
    { opacity: 0, y: 18 },
    {
      opacity: 1,
      y: 0,
      duration: 0.44,
      stagger: 0.1,
      ease: "power2.out",
      clearProps: "transform",
    },
    "-=0.16"
  );

  // Floating (sau khi appear)
  heroTl.call(() => {
    gsap.to(qa(".hero-card"), {
      y: 6,
      duration: 7,
      ease: "sine.inOut",
      repeat: -1,
      yoyo: true,
      overwrite: false,
    });
  });

  // Cleanup willChange
  heroTl.eventCallback("onComplete", () => {
    heroElements.forEach((el) => {
      el.style.willChange = "";
    });
  });

  return heroTl;
}
