"use client";

import { motion, useMotionValue, useTransform } from "framer-motion";
import { useRef, useLayoutEffect, useState, useEffect } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Button from "../ui/Button";

gsap.registerPlugin(ScrollTrigger);

export default function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [hydrated, setHydrated] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [ready, setReady] = useState(false);
  const [showScroll, setShowScroll] = useState(true);

  // hydration guard (fixes mobile flash on desktop)
  useEffect(() => {
    setHydrated(true);
  }, []);

  // detect screen size
  useEffect(() => {
    function checkScreen() {
      setIsDesktop(window.innerWidth >= 768); // md breakpoint
    }
    checkScreen();
    window.addEventListener("resize", checkScreen);
    return () => window.removeEventListener("resize", checkScreen);
  }, []);

  // manual scroll progress
  const progress = useMotionValue(0);
  const scale = useTransform(progress, [0, 1], [1.1, 0.5]);
  const y = useTransform(progress, [0, 1], [0, -120]);

  // update progress
  useEffect(() => {
    if (!isDesktop) return;
    const el = ref.current;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const denom = rect.height - vh;
      const p = denom ? Math.max(0, Math.min(1, -rect.top / denom)) : 0;
      progress.set(p);
    };

    update();
    setReady(true);

    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [isDesktop, progress]);

  // hide scroll indicator after small scroll
  useEffect(() => {
    const handleScroll = () => {
      setShowScroll(window.scrollY < 500);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // gsap content animation (desktop only)
  useLayoutEffect(() => {
    if (!isDesktop) return;
    const container = contentRef.current;
    if (!container) return;

    const ctx = gsap.context(() => {
      const elements = container.querySelectorAll(".animate-item");
      gsap.fromTo(
        elements,
        { y: 50, autoAlpha: 0 },
        {
          y: 0,
          autoAlpha: 1,
          duration: 0.8,
          ease: "power3.out",
          stagger: 0.25,
          scrollTrigger: {
            trigger: container,
            start: "top 80%",
            toggleActions: "play none none reverse",
          },
        }
      );
    }, container);

    return () => ctx.revert();
  }, [isDesktop]);

  // prevent initial flash before hydration
  if (!hydrated) return null;

  return (
    <div
      ref={ref}
      className={`${
        isDesktop ? "h-[300vh]" : "h-screen"
      } relative w-full flex flex-col items-center justify-center`}
    >
      {/* fallback static until motion ready */}
      {isDesktop && !ready && (
        <div className="fixed top-0 left-0 w-full h-screen flex items-center justify-center z-0 pointer-events-none select-none">
          <div
            style={{
              width: 500,
              height: 500,
              transform: "scale(1.1)",
              transformOrigin: "top center",
            }}
            className="pl-12"
          >
            <Image
              src="/hero-img.svg"
              alt="Chess Hero"
              width={500}
              height={500}
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          </div>
        </div>
      )}

      {/* hero motion image */}
      {isDesktop && ready && (
        <motion.div
          style={{ scale, y }}
          className="fixed top-0 left-0 w-full h-screen flex items-center justify-center z-0"
        >
          <Image
            src="/hero-img.svg"
            alt="Chess Hero"
            width={500}
            height={500}
            priority
            className="h-200 object-contain select-none pointer-events-none pl-12"
          />
        </motion.div>
      )}

      {/* spacer (desktop only) */}
      {isDesktop && <div className="h-[200vh]" />}

      {/* scroll indicator */}
      {isDesktop && showScroll && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{
            repeat: Infinity,
            repeatType: "reverse",
            duration: 1.2,
            ease: "easeInOut",
          }}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center text-white/70"
        >
          <span className="text-sm mb-2">Scroll</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </motion.div>
      )}

      {/* content */}
      <section
        ref={contentRef}
        className="relative z-10 flex flex-col items-center justify-center text-center px-6 py-12"
      >
        <div className="w-full">
          <div className="flex flex-col md:flex-row items-start justify-start md:items-center md:justify-center md:mt-16">
            <h1 className="animate-item font-gveher font-bold text-3xl md:text-5xl font-extrabold text-white text-left md:text-right mb-4 md:mb-0">
              Start with Pawns
            </h1>

            {isDesktop && <div className="relative w-[280px] h-[100px]" />}

            <h1 className="animate-item font-gveher font-bold text-3xl md:text-5xl font-extrabold text-white text-left order-3 md:order-2">
              End with Power
            </h1>
          </div>

          <p className="animate-item font-gveher font-normal text-lg md:text-xl lg:text-2xl text-white/70 mb-8 max-w-3xl mx-auto md:mt-12 mt-4 text-left md:text-center">
            A new era of chess: only pawns and kings. Protect, push, and
            promote your way to checkmate, simple to start, thrilling to
            master.
          </p>

          <div className="flex md:justify-center justify-start gap-4 max-w-sm md:mx-auto w-full md:mb-12 mb-6 animate-item">
            <Button
              variant="primary"
              onClick={() => {
                window.location.href = "/onboarding";
              }}
            >
              Play Now
            </Button>
            <Button variant="secondary" 
            onClick={() => {window.location.href = "/signup"}}>Explore More</Button>
          </div>

          {/* mobile hero img */}
          {!isDesktop && (
            <div className="w-full h-auto md:w-[280px] max-h-[300px] my-4 md:mb-0 flex justify-start">
              <Image
                src="/hero-img.svg"
                alt="Chess Hero"
                width={280}
                height={300}
                priority
                className="h-full select-none pointer-events-none"
              />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
