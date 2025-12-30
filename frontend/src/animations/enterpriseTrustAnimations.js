// src/animations/enterpriseTrustAnimations.js
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * Enterprise-grade guards
 */
const prefersReducedMotion =
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let _configured = false;
let _trustCtx = null;
let _whyCtx = null;
let _processCtx = null;
let _servicesCtx = null;

function ensureConfigured() {
  if (_configured) return;

  ScrollTrigger.config({
    ignoreMobileResize: true,
    autoRefreshEvents: "visibilitychange,DOMContentLoaded,load,resize",
  });

  // Smooth, trustworthy defaults
  ScrollTrigger.defaults({
    anticipatePin: 1,
  });

  _configured = true;
}

function formatCount(value, target) {
  // Handle 99.8 style
  if (target % 1 !== 0) return value.toFixed(1);
  return String(Math.round(value));
}

/**
 * Initialize Enterprise Trust Section Animations
 * - Eyebrow/Title/Subtitle reveal
 * - Metrics reveal + counters
 * - Logo wrapper reveal
 * - Process card hover (if exists on page)
 *
 * Returns cleanup() for React unmount (optional).
 */
export function initEnterpriseTrustAnimations() {
  ensureConfigured();

  const section = document.querySelector("#enterprise-trust");
  if (!section) return () => {};

  // Reduced motion: keep content visible, skip motion
  if (prefersReducedMotion) return () => {};

  // Re-init safe (React StrictMode friendly)
  if (_trustCtx) _trustCtx.revert();

  _trustCtx = gsap.context(() => {
    /**
     * 1) Header reveal
     */
    const eyebrow = section.querySelector(".enterprise-eyebrow");
    const title = section.querySelector(".enterprise-title");
    const subtitle = section.querySelector(".enterprise-subtitle");

    const headerEls = [eyebrow, title, subtitle].filter(Boolean);
    if (headerEls.length) {
      gsap.set(headerEls, { willChange: "transform,opacity" });

      gsap.from(headerEls, {
        scrollTrigger: {
          trigger: section,
          start: "top 78%",
          once: true,
        },
        opacity: 0,
        y: 16,
        duration: 0.6,
        ease: "power2.out",
        stagger: 0.12,
        onComplete: () => gsap.set(headerEls, { clearProps: "willChange" }),
      });
    }

    /**
     * 2) Metrics reveal + counters
     */
    const metricsContainer = section.querySelector(".trust-metrics");
    if (metricsContainer) {
      const metricBlocks = metricsContainer.querySelectorAll(".metric");

      gsap.set(metricsContainer, { willChange: "transform,opacity" });

      gsap.from(metricBlocks.length ? metricBlocks : metricsContainer, {
        scrollTrigger: {
          trigger: metricsContainer,
          start: "top 82%",
          once: true,
        },
        opacity: 0,
        y: 18,
        duration: 0.55,
        ease: "power2.out",
        stagger: metricBlocks.length ? 0.14 : 0,
        onComplete: () => gsap.set(metricsContainer, { clearProps: "willChange" }),
      });

      // Counter animation (once per element)
      metricsContainer.querySelectorAll(".metric-value").forEach((el) => {
        const target = parseFloat(el.dataset.count || "");
        if (!Number.isFinite(target)) return;

        ScrollTrigger.create({
          trigger: metricsContainer,
          start: "top 82%",
          once: true,
          onEnter: () => {
            if (el.dataset.countDone === "1") return;
            el.dataset.countDone = "1";

            const obj = { value: 0 };
            gsap.to(obj, {
              value: target,
              duration: 1.2,
              ease: "power1.out",
              overwrite: "auto",
              onUpdate: () => {
                el.textContent = formatCount(obj.value, target);
              },
            });
          },
        });
      });
    }

    /**
     * 3) Logo wrapper reveal
     */
    const logoWrapper = section.querySelector(".enterprise-logo-wrapper");
    if (logoWrapper) {
      gsap.set(logoWrapper, { willChange: "transform,opacity" });

      gsap.from(logoWrapper, {
        scrollTrigger: {
          trigger: logoWrapper,
          start: "top 86%",
          once: true,
        },
        opacity: 0,
        y: 18,
        duration: 0.6,
        ease: "power2.out",
        onComplete: () => gsap.set(logoWrapper, { clearProps: "willChange" }),
      });
    }

    /**
     * 4) Process cards hover (optional section on same page)
     * - Bound once per card to avoid duplicate listeners
     */
    const processCards = document.querySelectorAll(".process-card");
    processCards.forEach((card) => {
      if (card.dataset.hoverBound === "1") return;
      card.dataset.hoverBound = "1";

      const stepNumber = card.querySelector(".process-step-number");
      const iconWrap = card.querySelector(".process-icon");
      const originalShadow = window.getComputedStyle(card).boxShadow;

      const liftTo = gsap.quickTo(card, "y", { duration: 0.25, ease: "power2.out" });

      let iconEl = null;
      if (iconWrap) iconEl = iconWrap.querySelector("svg") || iconWrap;

      const iconScaleTo = iconEl
        ? gsap.quickTo(iconEl, "scale", { duration: 0.25, ease: "power2.out" })
        : null;

      card.addEventListener("pointerenter", () => {
        liftTo(-6);
        card.style.boxShadow = "0 20px 30px rgba(0,0,0,0.12)";

        if (stepNumber) {
          gsap.to(stepNumber, {
            color: "rgba(249, 115, 22, 0.45)",
            duration: 0.25,
            ease: "power2.out",
            overwrite: "auto",
          });
        }
        if (iconEl && iconScaleTo) {
          gsap.to(iconEl, {
            opacity: 1,
            filter: "saturate(1.05)",
            duration: 0.25,
            ease: "power2.out",
            overwrite: "auto",
          });
          iconScaleTo(1.06);
        }
      });

      card.addEventListener("pointerleave", () => {
        liftTo(0);
        card.style.boxShadow = originalShadow;

        if (stepNumber) {
          gsap.to(stepNumber, {
            color: "rgba(249, 115, 22, 0.15)",
            duration: 0.25,
            ease: "power2.out",
            overwrite: "auto",
          });
        }
        if (iconEl && iconScaleTo) {
          gsap.to(iconEl, {
            opacity: 0.65,
            filter: "saturate(0.9)",
            duration: 0.25,
            ease: "power2.out",
            overwrite: "auto",
          });
          iconScaleTo(1);
        }
      });
    });
  }, section);

  return () => {
    if (_trustCtx) {
      _trustCtx.revert();
      _trustCtx = null;
    }
  };
}

/**
 * Initialize Why Choose Us Section Animation
 * - Header reveal
 * - Card stagger reveal
 * - Icon micro-accent
 * - Trust signal reveal
 *
 * Returns cleanup() for React unmount (optional).
 */
export function initWhyChooseAnimation() {
  ensureConfigured();

  const section = document.querySelector(".why-choose-section");
  if (!section) return () => {};
  if (prefersReducedMotion) return () => {};

  if (_whyCtx) _whyCtx.revert();

  _whyCtx = gsap.context(() => {
    const headerTitle = section.querySelector("h2");
    const headerDesc = section.querySelector("p.lead");

    const headerEls = [headerTitle, headerDesc].filter(Boolean);
    if (headerEls.length) {
      gsap.set(headerEls, { willChange: "transform,opacity" });

      gsap.from(headerEls, {
        scrollTrigger: {
          trigger: section,
          start: "top 82%",
          once: true,
        },
        opacity: 0,
        y: 12,
        duration: 0.5,
        stagger: 0.12,
        ease: "power2.out",
        onComplete: () => gsap.set(headerEls, { clearProps: "willChange" }),
      });
    }

    const cards = section.querySelectorAll(".card");
    if (cards.length) {
      // Reset style để tránh hiện tượng card không hiện
      gsap.set(cards, {
        opacity: 1,
        y: 0,
        clearProps: "all",
        willChange: "transform,opacity",
      });

      // Stagger reveal - giống tracking page animation
      gsap.fromTo(
        cards,
        {
          opacity: 0,
          y: 60,
        },
        {
          opacity: 1,
          y: 0,
          duration: 0.9,
          ease: "power3.out",
          stagger: 0.15,
          scrollTrigger: {
            trigger: section,
            start: "top 85%",
            toggleActions: "play none none none",
            once: true,
          },
          onComplete: () => gsap.set(cards, { clearProps: "willChange" }),
        }
      );

      // Icon micro-accent synced with card stagger
      cards.forEach((card, idx) => {
        const icon = card.querySelector(".d-flex svg");
        if (!icon) return;

        gsap.from(icon, {
          scrollTrigger: {
            trigger: section,
            start: "top 78%",
            once: true,
          },
          scale: 0.92,
          opacity: 0,
          duration: 0.28,
          delay: idx * 0.14,
          ease: "power1.out",
        });
      });

      // Hover lift (bound once) - Match Process cards style
      cards.forEach((card) => {
        if (card.dataset.hoverBound === "1") return;
        card.dataset.hoverBound = "1";

        const iconWrap = card.querySelector(".d-flex[style*='width: 60']");
        const cardIcon = iconWrap ? iconWrap.querySelector("svg") : null;
        const originalShadow = window.getComputedStyle(card).boxShadow;

        const liftTo = gsap.quickTo(card, "y", { duration: 0.25, ease: "power2.out" });

        let iconEl = null;
        if (iconWrap) iconEl = iconWrap.querySelector("svg") || iconWrap;

        const iconScaleTo = iconEl
          ? gsap.quickTo(iconEl, "scale", { duration: 0.25, ease: "power2.out" })
          : null;

        card.addEventListener("pointerenter", () => {
          liftTo(-6);
          card.style.boxShadow = "0 20px 30px rgba(0,0,0,0.12)";

          if (iconEl && iconScaleTo) {
            gsap.to(iconEl, {
              opacity: 1,
              filter: "saturate(1.05)",
              duration: 0.25,
              ease: "power2.out",
              overwrite: "auto",
            });
            iconScaleTo(1.06);
          }
        });

        card.addEventListener("pointerleave", () => {
          liftTo(0);
          card.style.boxShadow = originalShadow || "0 8px 12px -4px rgba(0, 0, 0, 0.06)";

          if (iconEl && iconScaleTo) {
            gsap.to(iconEl, {
              opacity: "",
              filter: "",
              duration: 0.25,
              ease: "power2.out",
              overwrite: "auto",
            });
            iconScaleTo(1);
          }
        });
      });
    }

    const trustSignal = section.querySelector(".trust-signal");
    if (trustSignal) {
      gsap.set(trustSignal, { willChange: "transform,opacity" });

      gsap.from(trustSignal, {
        scrollTrigger: {
          trigger: trustSignal,
          start: "top 88%",
          once: true,
        },
        opacity: 0,
        y: 12,
        duration: 0.5,
        ease: "power2.out",
        onComplete: () => gsap.set(trustSignal, { clearProps: "willChange" }),
      });

      const trustItems = trustSignal.querySelectorAll("span");
      if (trustItems.length) {
        gsap.from(trustItems, {
          scrollTrigger: {
            trigger: trustSignal,
            start: "top 88%",
            once: true,
          },
          opacity: 0,
          x: -8,
          duration: 0.35,
          stagger: 0.1,
          ease: "power2.out",
          delay: 0.12,
        });
      }
    }
  }, section);

  return () => {
    if (_whyCtx) {
      _whyCtx.revert();
      _whyCtx = null;
    }
  };
}

/**
 * Initialize Process Section Animation (4-Step Shipping)
 * - Card stagger reveal (giống tracking page animation)
 *
 * Returns cleanup() for React unmount (optional).
 */
export function initProcessAnimation() {
  ensureConfigured();

  const section = document.querySelector(".process-section");
  if (!section) return () => {};
  if (prefersReducedMotion) return () => {};

  // Re-init safe (React StrictMode friendly)
  if (_processCtx) _processCtx.revert();

  _processCtx = gsap.context(() => {
    const processCards = section.querySelectorAll(".process-card");
    if (processCards.length) {
      // Reset style để tránh hiện tượng card không hiện
      gsap.set(processCards, {
        opacity: 1,
        y: 0,
        clearProps: "all",
        willChange: "transform,opacity",
      });

      // Stagger reveal - giống tracking page animation
      gsap.fromTo(
        processCards,
        {
          opacity: 0,
          y: 60,
        },
        {
          opacity: 1,
          y: 0,
          duration: 0.9,
          ease: "power3.out",
          stagger: 0.15,
          scrollTrigger: {
            trigger: section,
            start: "top 85%",
            toggleActions: "play none none none",
            once: true,
          },
          onComplete: () => gsap.set(processCards, { clearProps: "willChange" }),
        }
      );
    }
  }, section);

  return () => {
    if (_processCtx) {
      _processCtx.revert();
      _processCtx = null;
    }
  };
}

/**
 * Initialize Services Section Animation (Our Services)
 * - Card stagger reveal (giống Hero cards animation)
 *
 * Returns cleanup() for React unmount (optional).
 */
export function initServicesAnimation() {
  ensureConfigured();

  const section = document.querySelector("#services");
  if (!section) return () => {};
  if (prefersReducedMotion) return () => {};

  // Re-init safe (React StrictMode friendly)
  if (_servicesCtx) _servicesCtx.revert();

  _servicesCtx = gsap.context(() => {
    const serviceCards = section.querySelectorAll(".service-card");
    if (serviceCards.length) {
      // Set initial state - ẩn cards ban đầu
      gsap.set(serviceCards, {
        opacity: 0,
        y: 18,
        willChange: "transform, opacity",
      });

      // Stagger reveal - giống Hero cards animation
      gsap.to(serviceCards, {
        opacity: 1,
        y: 0,
        duration: 0.44,
        stagger: 0.1,
        ease: "power2.out",
        scrollTrigger: {
          trigger: section,
          start: "top 70%",
          toggleActions: "play none none none",
          once: true,
        },
        onComplete: () => {
          serviceCards.forEach((card) => {
            card.style.willChange = "";
            // Add class để CSS hover hoạt động đúng
            card.classList.add("gsap-complete");
          });
          // Clear transform để CSS hover có thể control
          gsap.set(serviceCards, { clearProps: "transform" });
        },
      });
    }
  }, section);

  return () => {
    if (_servicesCtx) {
      _servicesCtx.revert();
      _servicesCtx = null;
    }
  };
}
