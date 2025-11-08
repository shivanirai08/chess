"use client";

import Input from "@/components/ui/Input";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import Button from "@/components/ui/Button";
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
  const [errors, setErrors] = useState({
    username: false,
    email: false,
    password: false,
  });
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setEmail(params.get("email") || "");
  }, []);

const rules = [
  { label: "At least 6 characters", valid: password.length >= 6 },
  { label: "One number", valid: /\d/.test(password) },
  { label: "One letter", valid: /[A-Za-z]/.test(password) },
  {
    label: "One special character",
    valid: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  },
];

const validate = () => {
  const usernameValid = /^[A-Za-z0-9_]+$/.test(username);
  const newErrors = {
    username:
      !username.trim() ||
      username.length > 20 ||
      !usernameValid,
    email: !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
    password:
      !password ||
      Object.values(rules.map((rule) => rule.valid)).includes(false),
  };

  if (newErrors.username) {
    if (!username.trim()) toast.error("Username cannot be empty");
    else if (username.length > 20)
      toast.error("Username cannot exceed 20 characters");
    else if (!usernameValid)
      toast.error("Username can only contain letters, numbers, and underscores");
  } else if (newErrors.email) {
    toast.error("Enter a valid email");
  } else if (newErrors.password) {
    toast.error("Password does not meet requirements");
  }

  setErrors(newErrors);
  return !Object.values(newErrors).includes(true);
};


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    try {
      await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/register`, {
        username,
        email,
        password,
      });
      toast.success("Account created successfully! Please verify your email.");
      router.push(`/verifyotp?type=signup&email=${email}&routed=true`);
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        setErrors({...errors, username: true, email: true});
        toast.error(
          error?.response?.data?.message ||
            "Failed to create account. Please try again."
        );
      } else {
        setErrors({...errors, email: true});
        toast.error("Failed to create account. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Reset error when user starts typing
  const handleInputChange = (
    field: "username" | "email" | "password",
    value: string
  ) => {
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: false }));
    if (field === "username") setUsername(value);
    if (field === "email") setEmail(value);
    if (field === "password") setPassword(value);
  };

  return (
    <div
      className="relative h-screen overflow-hidden">
      <div className="absolute top-6 left-6 z-16">
        <Link
          href="/"
          className="text-2xl font-bold text-white hover:text-gray-300 transition-colors cursor-pointer"
        >
          Chess
        </Link>
      </div>

      <div className="absolute -bottom-20 -right-30 md:w-150 md:h-150 w-100 h-100 opacity-30 lg:opacity-50 pointer-events-none z-10">
        <Image
          src="/auth.svg"
          alt="Chess Logo"
          width={200}
          height={200}
          className="w-full h-full object-contain"
        />
      </div>

      <div className="relative z-10 flex items-center justify-center h-full px-4">
        <div className="w-full max-w-md">
          <h1 className="text-3xl md:text-4xl font-gveher font-bold text-white text-center mb-4 md:mb-8">
            Create an Account
          </h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="username"
              label="Username"
              value={username}
              aria-invalid={errors.username}
              onChange={(e) => handleInputChange("username", e.target.value)}
              autoFocus
            />

            <Input
              id="email"
              type="email"
              label="Email Address"
              value={email}
              aria-invalid={errors.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
            />

            <div className="space-y-2">
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  label="Password"
                  value={password}
                  aria-invalid={errors.password}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  onChange={(e) =>
                    handleInputChange("password", e.target.value)
                  }
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

            <Button type="submit" variant="primary">
              {loading ? "Creating..." : "Create Account"}
            </Button>

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
      </div>

      {/* Footer Disclaimer */}
      <div className="absolute bottom-4 w-full text-center text-gray-400 z-10 px-4">
        <p className="text-gray-300 text-sm text-center mt-8">
          By signing up, you agree to our{" "}
          <Link href="/terms" className="text-primary hover:underline">
            Terms & Conditions
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
