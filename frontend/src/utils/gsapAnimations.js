// frontend/src/utils/gsapAnimations.js
import gsap from "gsap";

/**
 * GSAP Animation Utilities with will-change optimization
 * Enterprise-grade smooth animations for CourierXpress
 */

/**
 * Animate KPI cards with fade in and slide up effect
 * Uses will-change for GPU acceleration
 * @param {string} selector - CSS selector for KPI items (default: ".kpi-item")
 */
export const animateKPICards = (selector = ".kpi-item") => {
  const elements = document.querySelectorAll(selector);
  if (elements.length === 0) return null;

  // Set will-change before animation
  gsap.set(selector, {
    willChange: "transform, opacity",
  });

  const timeline = gsap.from(selector, {
    opacity: 0,
    y: 20,
    duration: 0.3,
    ease: "power2.out",
    stagger: 0.05,
    clearProps: "will-change", // Clear after animation
    onComplete: () => {
      // Add class to enable CSS transitions after GSAP animation completes
      elements.forEach(el => el.classList.add("gsap-complete"));
    }
  });

  return timeline;
};

/**
 * Animate quick action buttons
 * Uses will-change for smooth scaling
 * @param {string} selector - CSS selector for quick action items (default: ".quick-action")
 */
export const animateQuickActions = (selector = ".quick-action") => {
  const elements = document.querySelectorAll(selector);
  if (elements.length === 0) return null;

  gsap.set(selector, {
    willChange: "transform, opacity",
  });

  return gsap.from(selector, {
    opacity: 0,
    scale: 0.9,
    duration: 0.45,
    ease: "power2.out",
    stagger: 0.1,
    delay: 0.1,
    clearProps: "will-change",
  });
};

/**
 * Animate chart wrappers
 * @param {string} selector - CSS selector for chart wrappers (default: ".chart-wrapper")
 */
export const animateCharts = (selector = ".chart-wrapper") => {
  const elements = document.querySelectorAll(selector);
  if (elements.length === 0) return null;

  gsap.set(selector, {
    willChange: "opacity",
  });

  return gsap.from(selector, {
    opacity: 0,
    duration: 0.6,
    ease: "power2.out",
    clearProps: "will-change",
  });
};

/**
 * Animate fade sections
 * @param {string} selector - CSS selector for fade sections (default: ".fade-section")
 */
export const animateFadeSections = (selector = ".fade-section") => {
  const elements = document.querySelectorAll(selector);
  if (elements.length === 0) return null;

  gsap.set(selector, {
    willChange: "transform, opacity",
  });

  return gsap.from(selector, {
    opacity: 0,
    y: 15,
    duration: 0.55,
    ease: "power2.out",
    stagger: 0.15,
    clearProps: "will-change",
  });
};

/**
 * Animate modal dialog (slide-in with scale)
 * @param {string} selector - CSS selector for modal dialog (default: ".modal-dialog")
 */
export const animateModal = (selector = ".modal-dialog") => {
  gsap.set(selector, {
    willChange: "transform, opacity",
  });

  return gsap.from(selector, {
    scale: 0.95,
    opacity: 0,
    duration: 0.25,
    ease: "power2.out",
    clearProps: "will-change",
  });
};

/**
 * Animate order detail panel (slide-in from right)
 * @param {string} selector - CSS selector for panel (default: ".order-panel")
 */
export const animateOrderPanel = (selector = ".order-panel") => {
  return gsap.fromTo(
    selector,
    {
      x: 40,
      opacity: 0,
      willChange: "transform, opacity",
    },
    {
      x: 0,
      opacity: 1,
      duration: 0.4,
      ease: "power3.out",
      clearProps: "will-change",
    }
  );
};

/**
 * Initialize all animations for a page
 * @param {Object} options - Animation options
 * @param {string} options.kpiSelector - Selector for KPI cards
 * @param {string} options.quickActionSelector - Selector for quick actions
 * @param {string} options.chartSelector - Selector for charts
 * @param {string} options.fadeSectionSelector - Selector for fade sections
 * @returns {Function} Cleanup function
 */
export const initPageAnimations = (options = {}) => {
  const {
    kpiSelector = ".kpi-item",
    quickActionSelector = ".quick-action",
    chartSelector = ".chart-wrapper",
    fadeSectionSelector = ".fade-section",
  } = options;

  const ctx = gsap.context(() => {
    animateKPICards(kpiSelector);
    animateQuickActions(quickActionSelector);
    animateCharts(chartSelector);
    animateFadeSections(fadeSectionSelector);
  });

  return () => ctx.revert();
};
