"use client"

import Input from "@/components/Input";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function Page() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [rememberMe, setRememberMe] = useState(false);

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
                    {/* Sign In Title */}
                    <h1 className="text-4xl font-bold text-white text-center mb-8">
                        Sign In
                    </h1>

                    {/* Sign In Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
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

                        {/* Remember Me and Forgot Password */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <input 
                                    type="checkbox" 
                                    id="rememberMe"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="mr-2 cursor-pointer accent-primary focus:ring-transparent" 
                                />
                                <label htmlFor="rememberMe" className="text-white cursor-pointer">
                                    Remember Me
                                </label>
                            </div>
                            <Link href="/forgot-password" className="text-white hover:text-primary hover:underline">
                                Forgot password ?
                            </Link>
                        </div>

                        {/* Continue Button */}
                        <button 
                            type="submit"
                            className="w-full bg-primary hover:bg-secondary text-black font-semibold py-3 px-6 rounded-lg transition-colors duration-200 shadow-lg"
                        >
                            Continue
                        </button>

                        {/* Sign Up Link */}
                        <p className="text-white text-center">
                            Don't have an account?{" "}
                            <Link href="/signup" className="text-primary hover:text-primary hover:underline">
                                Sign up
                            </Link>
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
}