"use client";

import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
}

const Input: React.FC<InputProps> = ({ id, label, type = "text", ...props }) => {
  return (
    <div className="relative w-full">
      <input
        id={id}
        type={type}
        placeholder=" "
        className="peer w-full border-2 border-gray-400 bg-transparent pt-4 pb-2 px-4 text-white 
                   placeholder-transparent focus:border-primary focus:outline-none rounded-md"
        {...props}
      />
      <label
        htmlFor={id}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-300 text-base transition-all px-1
               peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-md peer-placeholder-shown:text-zinc-300
               peer-focus:-top-2 peer-focus:-translate-y-0 peer-focus:text-sm peer-focus:text-primary peer-focus:bg-black peer-not-placeholder-shown:-top-2 peer-not-placeholder-shown:-translate-y-0 peer-not-placeholder-shown:text-sm peer-not-placeholder-shown:text-zinc-300 peer-not-placeholder-shown:bg-black"
      >
        {label}
      </label>
    </div>
  );
};

export default Input;
