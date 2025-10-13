"use client"

import Input from "@/components/Input";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Button from "@/components/Button";
import axios from "axios";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function ChangePassword() {
    const router = useRouter();
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const validate = () => {
        if (!password) {
            toast.error("Password is required.");
            return false;
        }
        if (password.length < 6) {
            toast.error("Password must be at least 6 characters.");
            return false;
        }
        if (!confirmPassword) {
            toast.error("Confirm Password is required.");
            return false;
        }
        if (password !== confirmPassword) {
            toast.error("Passwords do not match.");
            return false;
        }
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (loading) return;
        if (!validate()) return;
        setLoading(true);
        try {
            const res = await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/change-password`, { password });
            toast.success("Password changed successfully!");
            router.push('/signin');
        } catch (error : any) {
            toast.error(error?.response?.data?.message || "Failed to change password. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="relative bg-fixed bg-cover bg-center bg-no-repeat h-screen overflow-hidden "
            style={{ backgroundImage: "url('/bg.svg')" }}>
            <div className="fixed inset-0 bg-gradient-to-b from-black/30 to-black/50 pointer-events-none" />

            {/* Chess Logo */}
            <div className="absolute top-6 left-6 z-16">
                <Link href="/" className="text-2xl font-bold text-white hover:text-gray-300 cursor-pointer transition-colors">
                    Chess
                </Link>
            </div>

            {/* Image Overlay  */}
            <div className="absolute -bottom-20 -right-30 md:w-150 md:h-150 w-100 h-100 opacity-30 lg:opacity-50 pointer-events-none z-10">
                <Image src="/auth.svg" alt="Chess Logo" width={200} height={200} className="w-full h-full object-contain" />
            </div>

            {/* Main Content */}
            <div className="relative z-10 flex items-center justify-center h-full px-4">
                <div className="w-full max-w-md">
                    {/* Change Password Title */}
                    <h1 className="text-3xl md:text-4xl font-gveher font-bold text-white text-center mb-4 md:mb-8">
                        Change Password
                    </h1>

                    {/* Change Password Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="relative">
                            <Input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                label="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={loading}
                            />
                            <button
                                type="button"
                                className="absolute right-3 top-4 text-gray-200 cursor-pointer"
                                tabIndex={-1}
                                onClick={() => setShowPassword((v) => !v)}
                                aria-label={showPassword ? "Hide password" : "Show password"}
                                disabled={loading}
                            >
                                {showPassword ? (
                                    // Eye open SVG
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                ) : (
                                    // Eye closed SVG
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.477 0-8.268-2.943-9.542-7a9.956 9.956 0 012.442-4.362M6.634 6.634A9.956 9.956 0 0112 5c4.477 0 8.268 2.943 9.542 7a9.956 9.956 0 01-4.362 5.568M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
                                    </svg>
                                )}
                            </button>
                        </div>
                        <div className="relative">
                            <Input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                label="Confirm Password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                disabled={loading}
                            />
                            <button
                                type="button"
                                className="absolute right-3 top-4 text-gray-200 cursor-pointer"
                                tabIndex={-1}
                                onClick={() => setShowPassword((v) => !v)}
                                aria-label={showPassword ? "Hide password" : "Show password"}
                                disabled={loading}
                            >
                                {showPassword ? (
                                    // Eye open SVG
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                ) : (
                                    // Eye closed SVG
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.477 0-8.268-2.943-9.542-7a9.956 9.956 0 012.442-4.362M6.634 6.634A9.956 9.956 0 0112 5c4.477 0 8.268 2.943 9.542 7a9.956 9.956 0 01-4.362 5.568M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
                                    </svg>
                                )}
                            </button>
                        </div>

                        {/* Continue Button */}
                        <Button type="submit" variant="primary" disabled={loading}>
                            {loading ? "Updating..." : "Update Password"}
                        </Button>

                        {/* Sign In Link */}
                        <p className="text-white text-center">
                            Remember your password?{" "}
                            <Link href="/signin" className="text-primary hover:text-primary hover:underline">
                                Sign in
                            </Link>
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
}