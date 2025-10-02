"use client";

// import { use } from "react";
// import {useState} from "react";
type ButtonProps = {
  onClick?: () => void;
  children: React.ReactNode;
  size?: "small" |"normal";
  type?: "button" | "submit" | "reset";
  variant?: "primary" | "secondary" | "destructive";
  disabled?: boolean;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

export default function Button({
  onClick,
  children,
  size,
  type,
  variant,
  disabled,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type || "button"}
      onClick={onClick}
      disabled={disabled}
      className={`w-full ${ variant === "primary"
          ? "bg-primary hover:bg-secondary text-black"
          : variant === "destructive"
          ? "bg-destructive hover:bg-destructive/80 text-black"
          : "border border-2 border-solid border-white/80 text-white bg-transparent"
      } ${size === "small" ? "text-sm md:px-6 py-1.5 px-4 rounded-sm" : "text-base md:px-6 md:py-3 px-4 py-2 rounded-lg"} ${className} ${disabled ? "opacity-50 cursor-not-allowed" : ""} font-semibold transition-colors duration-200 shadow-lg`}
      {...props}
    >
      {children}
    </button>
  );
}
