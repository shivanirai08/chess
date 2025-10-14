"use client";

import Input from "@/components/Input";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import Button from "@/components/Button";
import { toast } from "sonner";
import axios from "axios";
import { useRouter } from "next/navigation";
import { Check, Eye, EyeOff, X } from "lucide-react";

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setEmail(params.get("email") || "");
  }, []);

  const validate = () => {
    if (!username.trim()) {
      toast.error("Name is required");
      return false;
    }
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      toast.error("Enter a valid email");
      return false;
    }
    if (!password) {
      toast.error("Password is required");
      return false;
    }
    if (Object.values(rules.map((rule) => rule.valid)).includes(false)) {
      toast.error("Password does not meet all requirements.");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/register`, {
        username,
        email,
        password,
      });
      toast.success("Account created successfully! Please verify your email.");
      router.push(`/verifyotp?type=signup&email=${email}`);
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        toast.error(
          error?.response?.data?.message ||
            "Failed to change password. Please try again."
        );
      } else {
        toast.error("Failed to change password. Please try again.");
      }
    }
  };

  // Password requirements
  const rules = [
    {
      label: "At least 6 characters",
      valid: password.length >= 6,
    },
    {
      label: "one number",
      valid: /\d/.test(password),
    },
    {
      label: "one letter",
      valid: /[A-Za-z]/.test(password),
    },
    {
      label: "one special character",
      valid: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    },
  ];

  return (
    <div
      className="relative bg-fixed bg-cover bg-center bg-no-repeat h-screen overflow-hidden "
      style={{ backgroundImage: "url('/bg.svg')" }}
    >
      <div className="fixed inset-0 bg-gradient-to-b from-black/30 to-black/50 pointer-events-none" />

      {/* Chess Logo */}
      <div className="absolute top-6 left-6 z-16">
        <Link
          href="/"
          className="text-2xl font-bold text-white hover:text-gray-300 transition-colors cursor-pointer"
        >
          Chess
        </Link>
      </div>

      {/* Image Overlay  */}
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
          {/* Sign Up Title */}
          <h1 className="text-3xl md:text-4xl font-gveher font-bold text-white text-center mb-4 md:mb-8">
            Create an Account
          </h1>

          {/* Sign Up Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                id="username"
                label="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <Input
                id="email"
                type="email"
                label="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                label="Password"
                value={password}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="absolute right-3 top-4 text-gray-200 cursor-pointer"
                tabIndex={-1}
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <Eye /> : <EyeOff />}
              </button>
            </div>

            {/* Password Requirements */}
            <div
              className={`transition-all duration-300 text-sm text-gray-200 ${
                focused
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-2"
              }`}
            >
              <div className="px-2 grid grid-cols-2 gap-x-4">
                {rules.map((rule, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    {rule.valid ? (
                      <Check className="text-green-400 w-4 h-4" />
                    ) : (
                      <X className="text-gray-400 w-4 h-4" />
                    )}
                    <span>{rule.label}</span>
                  </div>
                ))}
              </div>
            </div>
            </div>

            {/* Continue Button */}
            <Button type="submit" variant="primary" disabled={!validate}>
              Continue
            </Button>

            {/* Sign In Link */}
            <p className="text-white text-center">
              Already have an account?{" "}
              <Link
                href={`/login?email=${email}`}
                className="text-primary hover:text-lime-300 hover:underline"
              >
                Log In
              </Link>
            </p>
          </form>
        </div>
        {/* Footer Disclaimer
        <p className="text-gray-300 text-xs text-center mt-8">
          By signing up, you agree to our{" "}
          <Link href="/terms" className="text-primary hover:underline">
            Terms & Conditions
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </Link>
          .
        </p> */}
      </div>
    </div>
  );
}
