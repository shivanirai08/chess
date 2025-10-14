"use client"

import Input from "@/components/Input";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Button from "@/components/Button";
import axios from "axios";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

export default function LogIn() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [rememberMe, setRememberMe] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
              const params = new URLSearchParams(window.location.search);
              setEmail(params.get("email") || "");
    }, []);

    const validate = () => {
        if (!email.trim()) {
            toast.error("Email is required.");
            return false;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            toast.error("Please enter a valid email address.");
            return false;
        }
        if (!password) {
            toast.error("Password is required.");
            return false;
        }
        if (password.length < 6) {
            toast.error("Password must be at least 6 characters.");
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
            const res = await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/login`, { email, password });
                toast.success("Signed in successfully!");
                // Store user info/token based on rememberMe
                const userData = JSON.stringify(res.data);
                if (rememberMe) {
                    localStorage.setItem("user", userData);
                    sessionStorage.removeItem("user");
                } else {
                    sessionStorage.setItem("user", userData);
                    localStorage.removeItem("user");
                }
                router.push('/onboarding');
        } catch (error: unknown) {
            if (axios.isAxiosError(error)) {
                toast.error(error?.response?.data?.message || "Failed to change password. Please try again.");
            } else {
                toast.error("Failed to change password. Please try again.");
            }
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
                    {/* Log In Title */}
                    <h1 className="text-3xl md:text-4xl font-gveher font-bold text-white text-center mb-4 md:mb-8">
                        Log In
                    </h1>

                    {/* Log In Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <Input
                            id="email"
                            type="email"
                            label="Email Address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={loading}
                        />
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
                                {showPassword ? ( <Eye /> ) : ( <EyeOff /> )}
                            </button>
                        </div>

                        {/* Remember Me and Forgot Password */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="rememberMe"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="mr-2 cursor-pointer accent-primary focus:ring-transparent"
                                    disabled={loading}
                                />
                                <label htmlFor="rememberMe" className="text-white cursor-pointer">
                                    Remember Me
                                </label>
                            </div>
                            <Link href={`/resetpwd?email=${email}`} className="text-white hover:text-primary hover:underline">
                                Forgot password ?
                            </Link>
                        </div>

                        {/* Continue Button */}
                        <Button type="submit" variant="primary" disabled={loading}>
                            {loading ? "Signing in..." : "Continue"}
                        </Button>

                        {/* Sign Up Link */}
                        <p className="text-white text-center">
                            Don&apos;t have an account?{" "}
                            <Link href={`/signup?email=${email}`} className="text-primary hover:text-primary hover:underline">
                                Create one
                            </Link>
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
}