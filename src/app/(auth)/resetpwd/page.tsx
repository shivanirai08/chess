"use client";

import Input from "@/components/ui/Input";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Button from "@/components/ui/Button";
import axios from "axios";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const [hasSentOnce, setHasSentOnce] = useState(false);
  const [errors, setErrors] = useState<{ email: boolean }>({ email: false });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setEmail(params.get("email") || "");
  }, []);

  useEffect(() => {
    if (timer === 0) return;
    const interval = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const validate = () => {
    if (!email.trim()) {
      toast.error("Email is required.");
      setErrors({ email: true });
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter a valid email address.");
      setErrors({ email: true });
      return false;
    }
    setErrors({ email: false });
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/forgot-password`,
        { email }
      );
      if (res.status === 200) {
        toast.success("Password reset link sent!");
        setTimer(30);
        router.push(`/verifyotp?type=reset&email=${email}`);
      }
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        toast.error(
          error?.response?.data?.message ||
            "Failed to send password reset link."
        );
      } else {
        toast.error("Failed to send password reset link.");
      }
      setErrors({ email: true });
    } finally {
      setLoading(false);
      setHasSentOnce(true);
    }
  };

  return (
    <div
      className="relative h-screen overflow-hidden"
    >
      {/* Chess Logo */}
      <div className="absolute top-6 left-6 z-16">
        <Link
          href="/"
          className="text-2xl font-bold text-white hover:text-gray-300 cursor-pointer transition-colors"
        >
          Chess
        </Link>
      </div>

      {/* Image Overlay */}
      <div className="absolute -bottom-20 -right-30 md:w-150 md:h-150 w-100 h-100 opacity-30 lg:opacity-50 pointer-events-none z-10">
        <Image
          src="/auth.svg"
          alt="Chess Logo"
          width={200}
          height={200}
          className="w-full h-full object-contain"
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex items-center justify-center h-full px-4">
        <div className="w-full max-w-md">
          <h1 className="text-3xl md:text-4xl font-gveher font-bold text-white text-center mb-4 md:mb-8">
            Reset Your Password
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              id="email"
              type="email"
              label="Email Address"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErrors({ email: false });
              }}
              disabled={loading}
              aria-invalid={errors.email}
              autoFocus
            />

            <Button
              type="submit"
              variant="primary"
              disabled={timer > 0 || loading}
            >
              {loading
                ? "Sending..."
                : hasSentOnce && timer > 0
                ? `Resend in ${timer}s`
                : hasSentOnce
                ? "Resend Link"
                : "Send Reset Link"}
            </Button>

            <p className="text-white text-center">
              Remember your password?{" "}
              <Link
                href={`/login?email=${email}`}
                className="text-primary hover:text-primary hover:underline"
              >
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
