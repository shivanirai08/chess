"use client";

// import { use } from "react";
// import {useState} from "react";
type ButtonProps = {
  onClick?: () => void;
  children: React.ReactNode;
  type?: "button" | "submit" | "reset";
  variant?: "primary" | "secondary";
  disabled?: boolean;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

export default function Button({onClick, children, type, variant, disabled, className, ...props} : ButtonProps) {
    return(
        <button 
                            type={type || "button"}
                            onClick={onClick}
                            disabled={disabled}
                            className={`w-full ${variant === "primary" ? "bg-primary hover:bg-secondary text-black" : " hover:bg-secondary/20 border border-solid border-white/30 text-white bg-transparent"}  font-semibold py-3 px-6 rounded-lg transition-colors duration-200 shadow-lg ${className} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`} 
                            {...props}
                        >
                            {children}
                        </button>
    )
}

