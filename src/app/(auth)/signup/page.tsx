"use client"

import Input from "@/components/Input";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Button from "@/components/Button";

export default function Page() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [username, setUsername] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Handle form submission
    }

    return (
        <div
      className="relative bg-fixed bg-cover bg-center bg-no-repeat h-screen overflow-hidden "
      style={{ backgroundImage: "url('/bg.svg')" }}>
      <div className="fixed inset-0 bg-gradient-to-b from-black/30 to-black/50 pointer-events-none" />
            
            {/* Chess Logo */}
            <div className="absolute top-6 left-6 z-10">
                <Link href="/" className="text-2xl font-bold text-white hover:text-gray-300 transition-colors">
                    Only Pawns
                </Link>
            </div>
             
            {/* Image Overlay  */}
            <div className="absolute -bottom-20 -right-30 w-150 h-150 opacity-50 pointer-events-none z-10">
  <Image src="/auth.svg"  alt="Chess Logo"  width={200}  height={200}  className="w-full h-full object-contain" />
</div>

            {/* Main Content */}
            <div className="relative z-10 flex items-center justify-center h-full px-4">
                <div className="w-full max-w-md">
                    {/* Sign Up Title */}
                    <h1 className="text-4xl font-bold text-white text-center mb-8">
                        Sign Up
                    </h1>

                    {/* Sign Up Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <Input 
                            id="username" 
                            label="Your Name" 
                            value={username} 
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                        <Input 
                            id="email" 
                            type="email" 
                            label="Email Address" 
                            value={email} 
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                        <Input 
                            id="password" 
                            type="password" 
                            label="Password" 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />

                        {/* Terms and Conditions */}
                        <div className="flex items-center">
                            <input type="checkbox" className="mr-2 cursor-pointer accent-primary focus:ring-transparent" />
                            <p className="text-zinc-200">
                                Accept Terms & Conditions and respect Privacy.
                            </p>
                        </div>

                        {/* Continue Button */}
                        <Button type="submit" variant="primary" >
                            Continue
                        </Button>

                        {/* Sign In Link */}
                        <p className="text-white text-center">
                            Already have an account?{" "}
                            <Link href="/signin" className="text-primary hover:text-lime-300 hover:underline">
                                Sign in
                            </Link>
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
}