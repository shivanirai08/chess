"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LogOut, Play, Trophy, Users, Settings } from "lucide-react";

export default function Dashboard() {
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("token");
    toast.success("Logged out successfully!");
    router.push("/login");
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-8 py-6">
        <Link
          href="/"
          className="text-2xl font-bold font-gveher text-white hover:text-gray-300 transition-colors"
        >
          Chess
        </Link>

        {/* Logout Button — content width only */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900/60 border border-zinc-700 text-sm font-medium hover:bg-zinc-800 transition-all"
        >
          <LogOut size={18} />
          Logout
        </button>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex flex-col items-center justify-center h-[80vh] px-4 text-center">
        <h1 className="text-4xl md:text-5xl font-bold font-gveher mb-4">
            Welcome to Your Dashboard
        </h1>
        <p className="text-gray-300 mb-10 max-w-md">
          Ready to play? Start a match, check the leaderboard, or connect with friends.
        </p>

        {/* Dashboard Actions */}
        <div className="grid grid-cols-2 gap-6 w-full max-w-lg">
          <DashboardCard
            title="Play Game"
            icon={<Play className="w-6 h-6" />}
            onClick={() => router.push("/play")}
          />
          <DashboardCard
            title="Leaderboard"
            icon={<Trophy className="w-6 h-6" />}
            onClick={() => router.push("/play")}
          />
          <DashboardCard
            title="Friends"
            icon={<Users className="w-6 h-6" />}
            onClick={() => router.push("/play")}
          />
          <DashboardCard
            title="Settings"
            icon={<Settings className="w-6 h-6" />}
            onClick={() => router.push("/play")}
          />
        </div>
      </main>

      {/* Background Illustration */}
      <div className="absolute -bottom-24 -right-40 md:w-150 md:h-150 w-100 h-100 opacity-30 lg:opacity-50 pointer-events-none z-10">
        <Image
          src="/auth.svg"
          alt="Chess Illustration"
          width={200}
          height={200}
          className="w-full h-full object-contain"
        />
      </div>
    </div>
  );
}

function DashboardCard({
  title,
  icon,
  onClick,
}: {
  title: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-center justify-center gap-3 p-6 rounded-2xl backdrop-blur-sm bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/60 transition-all duration-300 cursor-pointer"
    >
      <div className="text-gray-300 group-hover:text-white transition-colors">
        {icon}
      </div>
      <span className="text-sm font-medium text-gray-300 group-hover:text-white">
        {title}
      </span>
    </button>
  );
}
