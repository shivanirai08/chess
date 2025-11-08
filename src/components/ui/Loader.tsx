"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function RouteLoader() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);

    // hide after short delay for smooth transition
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 800);

    return () => clearTimeout(timeout);
  }, [pathname]);

  return (
    <div
      className={`fixed inset-0 transition-opacity duration-500 ease-in-out ${
        loading ? "opacity-100 z-50" : "opacity-0 -z-10"
      }`}
    >
      {/* Background image with strong overlay */}
      <div
        className="absolute inset-0 bg-fixed bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/bg.svg')" }}
      >
        {/* Dark overlay to block the behind page */}
        <div className="absolute inset-0 bg-black/70" />
        {/* Gradient overlay for depth */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/50 to-black/70" />
      </div>

      {/* Centered spinner */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="animate-spin h-12 w-12 rounded-full border-4 border-gray-400 border-t-white" />
      </div>
    </div>
  );
}
