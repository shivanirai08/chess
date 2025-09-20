"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, useLayoutEffect } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  // Framer Motion image animation
  const scale = useTransform(scrollYProgress, [0, 1], [1.4, 0.6]); // end at natural size
  const y = useTransform(scrollYProgress, [0, 1], [0, -120]); // don’t shift up at the end

  useLayoutEffect(() => {
    const container = contentRef.current;
    if (!container) return;

    const ctx = gsap.context(() => {
      // Target child elements inside content section
      const elements = container.querySelectorAll(".animate-item");

      gsap.fromTo(
        elements,
        { y: 50, autoAlpha: 0 },
        {
          y: 0,
          autoAlpha: 1,
          duration: 0.8,
          ease: "power3.out",
          stagger: 0.25, // <-- each animates one after another
          scrollTrigger: {
            trigger: container,
            start: "top 80%", // fire when content is near viewport bottom
            toggleActions: "play none none reverse",
          },
        }
      );
    }, container);

    ScrollTrigger.refresh();
    return () => ctx.revert();
  }, []);

  return (
    <div ref={ref} className="relative h-[300vh]">
      {/* Hero Image (Framer Motion) */}
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

      {/* Spacer */}
      <div className="h-[200vh]" />

      {/* Content (GSAP animates this in sequence) */}
      <section
        ref={contentRef}
        className="relative z-10 h-screen flex flex-col items-center justify-center text-center px-6"
      >
        <div className="w-full">
          <div className="flex flex-col md:flex-row items-center justify-center mt-10">
            <h1 className="animate-item text-2xl md:text-4xl font-extrabold text-white text-left mr-12">
              Start with Pawns
            </h1>
            <div className="relative w-[280px] md:w-[280px] h-[100px]" />
            <h1 className="animate-item text-2xl md:text-4xl font-extrabold text-white text-right">
              End with Power
            </h1>
          </div>

          <p className="animate-item text-lg md:text-2xl text-white/70 mb-8 max-w-3xl mx-auto mt-12">
            A new era of chess: only pawns and kings. Protect, push, and promote
            your way to checkmate — simple to start, thrilling to master.
          </p>

          <div className="flex justify-center gap-4">
            <button className="animate-item rounded-sm bg-lime-400 px-6 py-3 text-black font-semibold shadow-lg hover:bg-lime-300 transition">
              Play Now
            </button>
            <button className="animate-item rounded-sm border border-white/30 px-6 py-3 text-white font-semibold hover:bg-white/10 transition">
              Explore More
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
