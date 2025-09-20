"use client"

import Hero from "@/components/Hero"
import Nav from "@/components/Nav"

export default function Page() {
    return(
      <div
      className="min-h-screen bg-fixed bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/bg.svg')" }}
    >
      <div className="fixed inset-0 bg-gradient-to-b from-black/10 via-black/10 to-black/50 pointer-events-none" />
            <Nav />
            <Hero />
        </div>
    )
}