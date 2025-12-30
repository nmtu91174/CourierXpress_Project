import { gsap } from "gsap";

/**
 * Init infinite horizontal logo carousel
 * @param {HTMLElement} trackEl - element chứa toàn bộ logo (đã duplicate)
 * @param {number} duration - thời gian chạy 1 vòng (giây)
 */
export function initEnterpriseLogoCarousel(trackEl, duration = 30) {
  if (!trackEl) return;

  // reset position (tránh lỗi hot reload)
  gsap.set(trackEl, { x: 0 });

  const totalWidth = trackEl.scrollWidth / 2;

  gsap.to(trackEl, {
    x: -totalWidth,
    duration,
    ease: "linear",
    repeat: -1,
  });
}

