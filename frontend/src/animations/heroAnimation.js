import gsap from "gsap";

export const heroFadeIn = (titleRef, subtitleRef) => {
  gsap.fromTo(titleRef.current,
    { opacity: 0, y: 60 },    // trạng thái ban đầu
    { opacity: 1, y: 0, duration: 1.2, ease: "power4.out" }
  );

  gsap.fromTo(subtitleRef.current,
    { opacity: 0, y: 40 },
    { opacity: 1, y: 0, delay: 0.2, duration: 1.2, ease: "power4.out" }
  );
};
