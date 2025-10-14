"use client";

import Input from "@/components/ui/Input";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Button from "@/components/ui/Button";
import axios from "axios";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Check, Eye, EyeOff, X } from "lucide-react";

export default function ChangePassword() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({ password: false });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setToken(params.get("token") || "");
  }, []);

  // Password validation checks
  const passwordChecks = {
    length: password.length >= 6,
    letter: /[A-Za-z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  const validate = () => {
    let isValid = true;
    const newErrors = { password: false };

    if (!password) {
      toast.error("Password is required.");
      newErrors.password = true;
      isValid = false;
    } else if (Object.values(passwordChecks).includes(false)) {
      toast.error("Password does not meet all requirements.");
      newErrors.password = true;
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (!validate()) return;
    setLoading(true);
    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/change-password`,
        { newPassword: password },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      toast.success("Password changed successfully!");
      router.push("/signin");
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        toast.error(
          error?.response?.data?.message ||
            "Failed to change password. Please try again."
        );
      } else {
        toast.error("Failed to change password. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative h-screen overflow-hidden">

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
          {/* Change Password Title */}
          <h1 className="text-3xl md:text-4xl font-gveher font-bold text-white text-center mb-4 md:mb-8">
            Change Password
          </h1>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              {/* Password Input */}
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  label="New Password"
                  value={password}
                  onChange={(e) => {setPassword(e.target.value); setErrors({password: false })}}
                  aria-invalid={errors.password}
                  disabled={loading}
                  autoFocus
                />
                <button
                  type="button"
                  className="absolute right-3 top-4 text-gray-200 cursor-pointer"
                  tabIndex={-1}
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  disabled={loading}
                >
                  {showPassword ? <Eye /> : <EyeOff />}
                </button>
              </div>

              {/* Password Requirements */}
              <div className="space-y-1 text-sm text-gray-200 px-2">
                {[
                  {
                    label: "At least 6 characters",
                    valid: passwordChecks.length,
                  },
                  {
                    label: "One number and one letter",
                    valid: passwordChecks.number && passwordChecks.letter,
                  },
                  {
                    label: "One special character",
                    valid: passwordChecks.special,
                  },
                ].map((check, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 transition-colors"
                  >
                    {check.valid ? (
                      <Check className="h-4 w-4 text-green-400" />
                    ) : (
                      <X className="h-4 w-4 text-gray-500" />
                    )}
                    <span
                      className={
                        check.valid ? "text-green-400" : "text-gray-400"
                      }
                    >
                      {check.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Continue Button */}
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? "Updating..." : "Update Password"}
            </Button>

            {/* Sign In Link */}
            <p className="text-white text-center">
              Remember your password?{" "}
              <Link
                href="/login"
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
