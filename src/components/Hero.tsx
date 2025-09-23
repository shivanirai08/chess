"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, useLayoutEffect, useState, useEffect } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Button from "./Button";

gsap.registerPlugin(ScrollTrigger);

export default function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isDesktop, setIsDesktop] = useState(false);

  // Detect screen size
  useEffect(() => {
    function checkScreen() {
      setIsDesktop(window.innerWidth >= 768); // md breakpoint
    }
    checkScreen();
    window.addEventListener("resize", checkScreen);
    return () => window.removeEventListener("resize", checkScreen);
  }, []);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  // Framer Motion image animation (desktop only)
  const scale = useTransform(scrollYProgress, [0, 1], [1.1, 0.5]);
  const y = useTransform(scrollYProgress, [0, 1], [0, -120]);

  // GSAP content animation (desktop only)
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

    ScrollTrigger.refresh();
    return () => ctx.revert();
  }, [isDesktop]);

  return (
    <div
      ref={ref}
      className={`relative ${isDesktop ? "h-[300vh]" : "h-screen"} w-full flex flex-col items-center justify-center ` }
    >
      {/* Hero Image */}
      {isDesktop ? (
        <motion.div
          style={{ scale, y }}
          className="fixed top-0 left-0 w-full h-screen flex items-center justify-center z-0"
        >
          <Image
            src="/hero-img.svg"
            alt="Chess Hero"
            width={500}
            height={500}
            className="object-contain select-none pointer-events-none pl-12"
          />
        </motion.div>
      ) : ( null
      )}

      {/* Spacer (desktop only) */}
      {isDesktop && <div className="h-[200vh]" />}

      {/* Content */}
      <section
        ref={contentRef}
        className="relative z-10 flex flex-col items-center justify-center text-center px-6 py-12"
      >
        <div className="w-full">
          <div className="flex flex-col md:flex-row items-start justify-start md:items-center md:md:justify-center md:mt-16">
            <h1 className="animate-item text-3xl md:text-4xl font-extrabold text-white text-left md:mr-0 mb-4 md:mb-0">
              Start with Pawns
            </h1>
            
            {isDesktop ? (<div className="relative w-[280px] md:w-[280px] h-[100px]" />) : null}

            <h1 className="animate-item text-3xl md:text-4xl font-extrabold text-white text-right md:ml-0 ml-0 order-3 md:order-2">
              End with Power
            </h1>
          </div>

          <p className="animate-item text-lg md:text-2xl text-white/70 mb-8 max-w-3xl mx-auto md:mt-12 mt-4 text-left md:text-center">
            A new era of chess: only pawns and kings. Protect, push, and
            promote your way to checkmate — simple to start, thrilling to
            master.
          </p>

          <div className="flex md:justify-center justify-start gap-4 max-w-md md:mx-auto w-full md:mb-12 mb-6 animate-item">
            <Button variant="primary" onClick={()=>{ window.location.href='/onboarding' }}>
              Play Now
            </Button>
            <Button variant="secondary">
              Explore More
            </Button>
          </div>
          <div className="w-full md:w-[280px] max-h-[300px] my-4 md:mb-0 flex justify-center">
              {isDesktop ? null : (
                <Image
                  src="/hero-img.svg"
                  alt="Chess Hero"
                  width={280}
                  height={100}
                  className="w-full select-none pointer-events-none"
                />
              )}
            </div>
        </div>
      </section>
    </div>
  );
}