"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import Button from "@/components/ui/Button";
import { toast } from "sonner";
import axios from "axios";
import { useRouter } from "next/navigation";

export default function OTPpage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [type, setType] = useState<string | null>(null);
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(40);
  const [status, setStatus] = useState<"idle" | "error" | "success">("idle");
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setEmail(params.get("email") || "");
    setType(params.get("type") || "");
  }, []);

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
    setStatus("idle");

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
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    const newOtp = pasted.split("").map((val, idx) => (idx < 4 ? val : ""));
    setOtp(newOtp);
    setStatus("idle");
    inputRefs.current[3]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpValue = otp.join("");
    if (otpValue.length !== 4 || !/^\d{4}$/.test(otpValue)) {
      toast.error("Please enter a valid 4-digit OTP.");
      setStatus("error");
      return;
    }
    setLoading(true);
    const apiUrl =
      type === "signup"
        ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/verify-email`
        : `${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/verify-reset-otp`;

    try {
      const res = await axios.post(apiUrl, { email, otp: otpValue });
      toast.success("OTP verified!");
      setStatus("success");

      // Small delay to show success UI before redirect
      setTimeout(() => {
        const token = res.data.forgotPasswordAccessToken;
        {type === "signup" && localStorage.setItem("user", JSON.stringify(res.data.user));
          localStorage.setItem("token", JSON.stringify(res.data.token))}
        router.push(
          type === "signup"
            ? "/dashboard"
            : `/newpwd?token=${encodeURIComponent(token)}`
        );
      }, 600);
    } catch (error: unknown) {
      setStatus("error");
      if (axios.isAxiosError(error)) {
        toast.error(
          error?.response?.data?.message || "Invalid OTP. Please try again."
        );
      } else {
        toast.error("Invalid OTP. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (timer > 0) return;
    setTimer(40);
    setStatus("idle");
    toast.success("OTP resent!");
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/resend-otp`, { email });
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        toast.error(
          error?.response?.data?.message || "Failed to resend OTP. Please try again."
        );
      } else {
        toast.error("Failed to resend OTP. Please try again.");
      }
    }
  };

  return (
    <div
      className="relative h-screen overflow-hidden"
    >
      {/* Logo */}
      <div className="absolute top-6 left-6 z-16">
        <Link
          href="/"
          className="text-2xl font-bold text-white hover:text-gray-300 cursor-pointer transition-colors"
        >
          Chess
        </Link>
      </div>

      {/* Background Image */}
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
            Verify OTP
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="otp"
                className="block text-white mb-2 font-semibold text-center"
              >
                Enter the 4-digit OTP sent to {email ? `${email}` : ""}
              </label>
              <div className="flex justify-center gap-4 lg:gap-8 mt-4">
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
                    aria-invalid={status === "error"}
                    className={`w-12 h-12 md:w-16 md:h-16 text-xl md:text-2xl text-center rounded-lg bg-zinc-900 text-white border transition-all duration-200 
                      ${status === "error"
                        ? "border-red-500 ring-1 ring-red-500 animate-shake"
                        : status === "success"
                        ? "border-green-500 ring-1 ring-green-500"
                        : "border-zinc-700 focus:ring-1 focus:ring-primary"}`}
                    autoFocus={idx === 0}
                  />
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-4">
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

            <div className="text-center mt-2 text-white">
              Back to{" "}
              <Link
                href={type === "signup" ? "/signup" : "/resetpwd"}
                className="text-primary hover:text-primary hover:underline"
              >
                {type === "signup" ? "Sign Up" : "Reset Password"}
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
