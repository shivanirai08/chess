"use client";

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

  // error state
  const [errors, setErrors] = useState({
    email: false,
    password: false,
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setEmail(params.get("email") || "");
  }, []);

  const validate = () => {
    const newErrors = {
      email: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()),
      password:
        !password ||
        password.length < 6 ||
        !/[A-Za-z]/.test(password) ||
        !/\d/.test(password) ||
        !/[!@#$%^&*(),.?":{}|<>]/.test(password),
    };

    setErrors(newErrors);

    if (newErrors.email) toast.error("Please enter a valid email address.");
    else if (newErrors.password)
      toast.warning(
        "Password must have at least 6 characters, one number, one letter, and one special character."
      );

    return !Object.values(newErrors).includes(true);
  };

  const handleInputChange = (field: "email" | "password", value: string) => {
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: false }));
    if (field === "email") setEmail(value);
    if (field === "password") setPassword(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (!validate()) return;
    setLoading(true);

    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/login`,
        { email, password }
      );

      toast.success("Signed in successfully!");
      const userData = JSON.stringify(res.data);

      if (rememberMe) {
        localStorage.setItem("user", userData);
        sessionStorage.removeItem("user");
      } else {
        sessionStorage.setItem("user", userData);
        localStorage.removeItem("user");
      }

      router.push("/onboarding");
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        toast.error(
          error?.response?.data?.message ||
            "Failed to log in. Please try again."
        );
        setErrors({ email: true, password: true });
      } else {
        toast.error("Failed to log in. Please try again.");
        setErrors({ email: true, password: true });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative bg-fixed bg-cover bg-center bg-no-repeat h-screen overflow-hidden"
      style={{ backgroundImage: "url('/bg.svg')" }}
    >
      <div className="fixed inset-0 bg-gradient-to-b from-black/30 to-black/50 pointer-events-none" />

      {/* Logo */}
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
            Log In
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <Input
              id="email"
              type="email"
              label="Email Address"
              value={email}
              aria-invalid={errors.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              disabled={loading}
              autoFocus
            />

            {/* Password */}
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                label="Password"
                value={password}
                aria-invalid={errors.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
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
                {showPassword ? <Eye /> : <EyeOff />}
              </button>
            </div>

            {/* Remember Me / Forgot */}
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
                <label
                  htmlFor="rememberMe"
                  className="text-white cursor-pointer"
                >
                  Remember Me
                </label>
              </div>

              <Link
                href={`/resetpwd?email=${email}`}
                className="text-white hover:text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            {/* Button */}
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? "Signing in..." : "Continue"}
            </Button>

            <p className="text-white text-center">
              Don&apos;t have an account?{" "}
              <Link
                href={`/signup?email=${email}`}
                className="text-primary hover:text-primary hover:underline"
              >
                Create one
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
