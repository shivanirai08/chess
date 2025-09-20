"use client"

import { useState } from "react";

export default function Page() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [username, setUsername] = useState("");

    const handleSubmit = (e: React.FormEvent) => {

    }
    return (
        <div
      className="min-h-screen bg-fixed bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/bg.svg')" }}
    >
      <div className="fixed inset-0 bg-gradient-to-b from-black/20 to-black/50 pointer-events-none" />
            <h1>Sign Up</h1>
            <form 
            onSubmit={handleSubmit}
            className ="flex flex-col max-w-md mx-auto p-4">

            </form>

        </div>
    );
}