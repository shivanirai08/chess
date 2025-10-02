'use client';

import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Link from 'next/link';
import Button from '@/components/Button';

// Register GSAP plugins
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

const Nav = () => {
  const navRef = useRef<HTMLElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  useEffect(() => {
    if (!navRef.current) return;

    if (isMobile) {
      // For mobile: nav is always visible
      gsap.set(navRef.current, { y: 0, opacity: 1 });
      return;
    }

    // For desktop: animate nav on scroll
    gsap.set(navRef.current, { y: -100, opacity: 0 });

    const scrollTrigger = ScrollTrigger.create({
      trigger: 'body',
      start: '50% top',
      end: 'bottom bottom',
      onEnter: () => {
        gsap.to(navRef.current, {
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: 'power2.out',
        });
      },
      onLeaveBack: () => {
        gsap.to(navRef.current, {
          y: -100,
          opacity: 0,
          duration: 0.5,
          ease: 'power2.in',
        });
      },
    });

    return () => {
      scrollTrigger.kill();
    };
  }, [isMobile]);

  return (
    <nav
      ref={navRef}
      className="fixed top-0 left-0 w-full z-50 backdrop-blur-xs"
      style={{ transform: 'translateY(-100px)', opacity: 0 }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <h1 className="text-2xl font-bold text-white">Only Pawns</h1>
          </div>

          <div className="flex items-center gap-6">
            {/* Navigation Links */}
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-8">
                <a href="#home" className="text-white hover:text-gray-300 px-3 py-2 text-sm font-medium">Home</a>
                <a href="#about" className="text-white hover:text-gray-300 px-3 py-2 text-sm font-medium">About Us</a>
                <a href="#features" className="text-white hover:text-gray-300 px-3 py-2 text-sm font-medium">Features</a>
                <a href="#contact" className="text-white hover:text-gray-300 px-3 py-2 text-sm font-medium">Contact Us</a>
              </div>
            </div>

            {/* Get Started Button */}
            <div className="hidden md:block">
              <Link
                href="/signup"
                className="animate-item rounded-sm bg-lime-400 px-4 py-2 text-black font-semibold text-sm shadow-lg hover:bg-lime-300 transition"
              >
                Get Started
              </Link>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={toggleMobileMenu}
                className="text-white hover:text-gray-300 focus:outline-none focus:text-gray-300"
              >
                {isMobileMenuOpen ? (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-black/80 backdrop-blur-md">
            <a href="#home" onClick={closeMobileMenu} className="text-white block px-3 py-2 text-base font-medium">Home</a>
            <a href="#about" onClick={closeMobileMenu} className="text-white block px-3 py-2 text-base font-medium">About Us</a>
            <a href="#features" onClick={closeMobileMenu} className="text-white block px-3 py-2 text-base font-medium">Features</a>
            <a href="#contact" onClick={closeMobileMenu} className="text-white block px-3 py-2 text-base font-medium">Contact Us</a>
            <Button onClick={closeMobileMenu} variant="primary" type="button">
              Get Started
            </Button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Nav;
