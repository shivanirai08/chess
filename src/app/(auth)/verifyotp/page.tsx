"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import Button from "@/components/Button";
import { toast } from "sonner";
import axios from "axios";

export default function Page() {
  const email = sessionStorage.getItem("signupEmail");
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(40);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);


  // Timer countdown for resend
  useEffect(() => {
    if (timer === 0) return;
    const interval = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  // Handle OTP input
  const handleOtpChange = (idx: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[idx] = value;
    setOtp(newOtp);

    if (value && idx < 3) {
      inputRefs.current[idx + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (otp[idx] === "" && idx > 0) {
        inputRefs.current[idx - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    } else if (e.key === "ArrowRight" && idx < 3) {
      inputRefs.current[idx + 1]?.focus();
    }
  };

  // Handle paste
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 4);
    const newOtp = pasted.split("").map((val, idx) => (idx < 4 ? val : ""));
    setOtp(newOtp);
    inputRefs.current[3]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpValue = otp.join("");
    if (otpValue.length !== 4 || !/^\d{4}$/.test(otpValue)) {
      toast.error("Please enter a valid 4-digit OTP.");
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/verify-email`, { email, otp: otpValue });
      toast.success("OTP verified!");
      localStorage.setItem("user", JSON.stringify(res.data));
      sessionStorage.removeItem("signupEmail");
      window.location.href = '/onboarding';
    } catch (err) {
      toast.error("Invalid OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (timer > 0) return;
    setTimer(40);
    toast.success("OTP resent!");
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/resend-otp`, { email });
      toast.success("OTP resent!");
    } catch (err) {
      toast.error("Failed to resend OTP. Please try again.");
    }
  };

  return (
    <div
      className="relative bg-fixed bg-cover bg-center bg-no-repeat h-screen overflow-hidden"
      style={{ backgroundImage: "url('/bg.svg')" }}
    >
      <div className="fixed inset-0 bg-gradient-to-b from-black/30 to-black/50 pointer-events-none" />

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
          {/* Verify OTP Title */}
          <h1 className="text-3xl md:text-4xl font-gveher font-bold text-white text-center mb-4 md:mb-8">
            Verify OTP
          </h1>

          {/* OTP Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="otp"
                className="block text-white mb-2 font-semibold text-center"
              >
                Enter the 4-digit OTP sent to your email
              </label>
              <div className="flex justify-center gap-4 lg:gap-6">
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(e) => {
                      inputRefs.current[idx] = e;
                    }}
                    type="text"
                    inputMode="numeric"
                    pattern="\d{1}"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    onPaste={idx === 0 ? handlePaste : undefined}
                    className="w-12 h-12 md:w-14 md:h-14 text-2xl md:text-3xl text-center rounded-lg bg-zinc-900 text-white border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-primary tracking-widest"
                    autoFocus={idx === 0}
                  />
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Button
                type="submit"
                variant="primary"
                disabled={loading}
                className="w-full"
              >
                {loading ? "Verifying..." : "Verify"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={timer > 0}
                onClick={handleResend}
                className="w-full"
              >
                {timer > 0 ? `Resend OTP in ${timer}s` : "Resend OTP"}
              </Button>
            </div>
            <div className="text-center mt-2">
              Back to {` `}
              <Link
                href="/signup"
                className="text-primary hover:text-primary hover:underline"
              >
                SignUp
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
