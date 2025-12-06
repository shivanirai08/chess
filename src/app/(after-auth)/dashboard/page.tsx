"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Settings, Trophy, ChevronLeft, ChevronRight, Zap, CircleEqual, X } from "lucide-react";
import { TbTargetArrow } from "react-icons/tb"
import { FaChess, FaFire } from "react-icons/fa";
import { motion } from "framer-motion";
import axios from "axios";
import { fetchGameSummaries, GameSummaryResponse } from "@/services/gameApi";

// Custom Chess Time Control Icons
const BulletIcon = ({ size = 16, className = "", style }: { size?: number; className?: string; style?: React.CSSProperties }) => (
  <svg aria-hidden="true" viewBox="0 0 24 24" height={size} width={size} className={className} style={style} xmlns="http://www.w3.org/2000/svg">
    <path d="M7.17005 15.2999L8.60005 16.7699L0.330049 23.6699L7.17005 15.2999ZM0.300049 17.5999L4.80005 11.5999L5.70005 13.5999L0.300049 17.5999ZM10.77 10.0999C14.24 6.49994 16.7 4.89994 19.47 3.69994C17.07 3.69994 14.17 4.06994 9.67005 8.29994C9.70005 8.79994 10.37 9.76994 10.77 10.0999ZM21.83 2.16994C21.83 2.16994 22.06 3.26994 22.06 4.93994C22.06 7.60994 21.39 11.7699 17.89 15.2699L15.72 17.4399C15.05 18.1099 14.39 18.0399 13.59 17.7099L6.12005 24.0099L15.92 11.8399L10.69 15.8699C10.26 15.4699 9.76005 15.0399 9.36005 14.6399C7.63005 12.9399 5.23005 9.63994 6.59005 8.26994L8.79005 6.13994C12.32 2.63994 16.42 1.93994 19.09 1.93994C20.72 1.93994 21.82 2.16994 21.82 2.16994H21.83Z" fill="currentColor"/>
  </svg>
);

const BlitzIcon = ({ size = 16, className = "", style }: { size?: number; className?: string; style?: React.CSSProperties }) => (
  <svg aria-hidden="true" viewBox="0 0 24 24" height={size} width={size} className={className} style={style} xmlns="http://www.w3.org/2000/svg">
    <path d="M5.77002 15C4.74002 15 4.40002 14.6 4.57002 13.6L6.10002 3.4C6.27002 2.4 6.73002 2 7.77002 2H13.57C14.6 2 14.9 2.4 14.64 3.37L11.41 15H5.77002ZM18.83 9C19.86 9 20.03 9.33 19.4 10.13L9.73002 22.86C8.50002 24.49 8.13002 24.33 8.46002 22.29L10.66 8.99L18.83 9Z" fill="currentColor"/>
  </svg>
);

const RapidIcon = ({ size = 16, className = "", style }: { size?: number; className?: string; style?: React.CSSProperties }) => (
  <svg aria-hidden="true" viewBox="0 0 24 24" height={size} width={size} className={className} style={style} xmlns="http://www.w3.org/2000/svg">
    <path d="M11.97 14.63C11.07 14.63 10.1 13.9 10.47 12.4L11.5 8H12.5L13.53 12.37C13.9 13.9 12.9 14.64 11.96 14.64L11.97 14.63ZM12 22.5C6.77 22.5 2.5 18.23 2.5 13C2.5 7.77 6.77 3.5 12 3.5C17.23 3.5 21.5 7.77 21.5 13C21.5 18.23 17.23 22.5 12 22.5ZM12 19.5C16 19.5 18.5 17 18.5 13C18.5 9 16 6.5 12 6.5C8 6.5 5.5 9 5.5 13C5.5 17 8 19.5 12 19.5ZM10.5 5.23V1H13.5V5.23H10.5ZM15.5 2H8.5C8.5 0.3 8.93 0 12 0C15.07 0 15.5 0.3 15.5 2Z" fill="currentColor"/>
  </svg>
);
import { useUserStore } from "@/store/useUserStore";
import Cookies from "js-cookie";
import { useEffect, useState } from "react";


interface GameData {
  _id: string;
  whitePlayerId: string;
  blackPlayerId: string;
  whitePlayerName: string;
  blackPlayerName: string;
  status: string;
  result?: string;
  moves?: string[];
  createdAt: string;
}

interface TransformedGame {
  username: string;
  rating: number | null;
  playerElo: number | null;
  result: string;
  accuracy: number;
  moves: number;
  date: string;
  gameId: string;
  playerColor: 'white' | 'black';
}

interface PerformanceData {
  format: string;
  played: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
}

export default function Dashboard() {
  const router = useRouter();
  const { clearUser, user, setUser } = useUserStore();
  const [welcomeMessage, setWelcomeMessage] = useState("Welcome back");
  const [games, setGames] = useState<TransformedGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [performanceLoading, setPerformanceLoading] = useState(true);

  // Weekly stats states
  const [selectedWeek, setSelectedWeek] = useState(0); // 0 = current week, -1 = last week, etc.
  const [selectedMetric, setSelectedMetric] = useState<"total" | "win" | "loss" | "draw">("total");

  useEffect(() => {
    // Check if user came from signup/verifyotp (new user) or login (returning user)
    if (typeof window !== "undefined") {
      const referrer = document.referrer;
      const isNewUser = referrer.includes("/verifyotp") || referrer.includes("/signup");
      setWelcomeMessage(isNewUser ? "Welcome" : "Welcome back");
    }
  }, []);

  useEffect(() => {
    const fetchGames = async () => {
      try {
        setLoading(true);
        const summaries = await fetchGameSummaries();
        const transformedGames = (summaries || []).map((game: GameSummaryResponse) => ({
          username: game.opponentName,
          rating: game.opponentElo,
          playerElo: game.playerElo,
          result: game.playerResult,
          accuracy: 0,
          moves: game.movesCount,
          date: new Date(game.matchDate).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
          gameId: game.gameId,
          playerColor: game.playerColor,
        }));
        setGames(transformedGames);

        const latestRatedGame = (summaries || []).find(
          (summary) => typeof summary.playerElo === "number"
        );
        if (latestRatedGame && typeof latestRatedGame.playerElo === "number") {
          setUser({ elo: latestRatedGame.playerElo });
        }
      } catch (err) {
        console.error("Failed to fetch summaries", err);
        setGames([]);
      } finally {
        setLoading(false);
      }
    };

    const fetchPerformance = async () => {
      try {
        setPerformanceLoading(true);
        const res = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/game/performance`, {
          headers: {
            Authorization: `Bearer ${Cookies.get("auth-token")}`,
          },
        });
        setPerformanceData(res.data);
        console.log("Performance data:", res.data);
      } catch (err) {
        console.error("Failed to fetch performance stats", err);
        setPerformanceData([]);
      } finally {
        setPerformanceLoading(false);
      }
    };

    fetchGames();
    fetchPerformance();
  }, [user.id, setUser]);

  const handleLogout = () => {
    try {
      clearUser();
      Cookies.remove("auth-token");
    } catch (err) {
      console.error("Failed to clear auth data", err);
    }
    toast.success("Logged out successfully!");
    setTimeout(() => router.push("/login"), 300);
  };

  const timeControls = [
    { time: "1 min", icon: BulletIcon },
    { time: "1|1", icon: BulletIcon },
    { time: "2|1", icon: BulletIcon },
    { time: "3 min", icon: BlitzIcon },
    { time: "3|2", icon: BlitzIcon },
    { time: "5 min", icon: BlitzIcon },
    { time: "10 min", icon: RapidIcon },
    { time: "15|10", icon: RapidIcon },
    { time: "30 min", icon: RapidIcon },
  ];


  // Map performance data to gameStats format
  const gameStats = performanceData.length > 0 ? performanceData.map(stat => {
    let icon, color;
    
    switch (stat.format) {
      case 'Overall':
        icon = Trophy;
        color = "#10b981";
        break;
      case 'Bullet':
        icon = BulletIcon;
        color = "#ef4444";
        break;
      case 'Blitz':
        icon = BlitzIcon;
        color = "#f59e0b";
        break;
      case 'Rapid':
        icon = RapidIcon;
        color = "#3b82f6";
        break;
      default:
        icon = Trophy;
        color = "#10b981";
    }

    return {
      type: stat.format,
      icon,
      played: stat.played,
      wins: stat.wins,
      winRate: Math.round(stat.winRate),
      color
    };
  }) : [
    { type: "Overall", icon: Trophy, played: 0, wins: 0, winRate: 0, color: "#10b981" },
    { type: "Bullet", icon: BulletIcon, played: 0, wins: 0, winRate: 0, color: "#ef4444" },
    { type: "Blitz", icon: BlitzIcon, played: 0, wins: 0, winRate: 0, color: "#f59e0b" },
    { type: "Rapid", icon: RapidIcon, played: 0, wins: 0, winRate: 0, color: "#3b82f6" },
  ];

  // Weekly stats data (mock data - replace with real data later)
  const weeklyStats = {
    0: { // Current week
      days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      total: [5, 8, 6, 10, 7, 12, 9],
      win: [3, 5, 4, 6, 5, 8, 6],
      loss: [1, 2, 1, 3, 1, 3, 2],
      draw: [1, 0, 1, 0, 1, 0, 1],
    },
    "-1": { // Last week
      days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      total: [7, 6, 9, 8, 10, 11, 8],
      win: [4, 4, 6, 5, 7, 8, 5],
      loss: [2, 1, 2, 2, 2, 2, 2],
      draw: [0, 1, 1, 0, 1, 1, 0],
    },
  };

  const currentWeekData = weeklyStats[selectedWeek.toString() as keyof typeof weeklyStats] || weeklyStats["0"];
  const maxValue = Math.max(...currentWeekData[selectedMetric]);

  const handleStartGame = (timeControl: string) => {
    // Navigate to play page with time control and step parameters
    router.push(`/play?timeControl=${encodeURIComponent(timeControl)}&autoStart=true`);
  };

  const getWeekLabel = (weekOffset: number) => {
    if (weekOffset === 0) return "This Week";
    if (weekOffset === -1) return "Last Week";
    return `${Math.abs(weekOffset)} weeks ago`;
  };

  return (
    <div className="h-screen overflow-hidden flex flex-col">
      {/* TOP HEADER BAR */}
      <header className="px-8 py-4 flex items-center justify-between flex-shrink-0">
        <h1 className="text-2xl font-bold">Chess</h1>

        <div className="flex items-center gap-8">
          {/* User Profile */}
          <div className="flex items-center gap-3">
            <Image
              src={user.avatar || "/avatar1.svg"}
              alt={user.username || "User"}
              width={40}
              height={40}
              className="rounded-full"
            />
            <div className="flex flex-col">
              <span className="text-sm font-medium">{user.username}</span>
              <span className="text-xs text-[#a0a0a0]">Rating: {user.elo || 300}</span>
            </div>
          </div>

          {/* Settings Icon */}
          <button
            onClick={handleLogout}
            className="text-[#a0a0a0] hover:text-white transition-all duration-300 hover:rotate-45 cursor-pointer"
            aria-label="Settings"
            title="Logout"
          >
            <Settings size={24} />
          </button>
        </div>
      </header>

      {/* MAIN CONTENT - Two Column Layout */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full px-8 py-2 grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6 overflow-hidden">
          {/* LEFT COLUMN - Statistics */}
          <div className="flex flex-col h-full overflow-y-auto min-w-0">
          {/* STATISTICS OVERVIEW */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="rounded-xl mb-6"
          >
            {/* Welcome Message */}
            <h2 className="text-2xl font-bold mb-6">
              {welcomeMessage}, {user.username || "Player"}
            </h2>

            {/* Top Row - Key Metrics */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              {/* ELO */}
              <div className="bg-white/5 backdrop-blur-xs rounded-lg p-4 flex flex-col items-end justify-center gap-2 h-20 relative overflow-hidden">
                <TbTargetArrow size={90} className="text-[#a855f7] opacity-50 absolute -top-1 -left-2" />
                <span className="text-4xl font-bold">{user.elo || 300}</span>
                <span className="text-sm text-[#a0a0a0]">ELO</span>
              </div>

              {/* Games */}
              <div className="bg-white/5 backdrop-blur-xs rounded-lg p-4 flex flex-col items-end justify-center gap-2 relative h-20 overflow-hidden">
                <FaChess size={80} className="text-primary opacity-50 absolute top-0 left-0" />
                <span className="text-4xl font-bold">{games.length}</span>
                <span className="text-sm text-[#a0a0a0]">Games</span>
              </div>

              {/* Streak */}
              <div className="bg-white/5 backdrop-blur-xs rounded-lg p-4 flex flex-col items-end justify-center gap-2 h-20 relative overflow-hidden">
                <FaFire size={80} className="text-orange-500 opacity-50 absolute -top-0 -left-2" />
                <span className="text-4xl font-bold">42</span>
                <span className="text-sm text-[#a0a0a0]">Streak</span>
              </div>
            </div>

            {/* PERFORMANCE BY FORMAT */}
            <div>
              <h3 className="text-sm font-medium mb-4">Performance by Format</h3>

              {performanceLoading ? (
                <div className="flex items-center justify-center h-32">
                  <p className="text-gray-400">Loading performance data...</p>
                </div>
              ) : (
                <div className="flex gap-4">
                  {gameStats.map((stat, index) => {
                    const Icon = stat.icon;

                    return (
                      <motion.div
                        key={stat.type}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: 0.1 + index * 0.05 }}
                        className="bg-white/5 backdrop-blur-xs flex-1 rounded-lg p-4 transition-all duration-300 relative overflow-hidden"
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <Icon size={16} style={{ color: stat.color }} />
                          <span className="text-sm font-medium">{stat.type}</span>
                        </div>

                        <div className="flex items-end justify-between mb-2">
                          <div className="flex flex-col">
                            <span className="text-[10px] text-[#a0a0a0]">Played</span>
                            <span className="text-lg font-bold" style={{ color: stat.color }}>
                              {stat.played}
                            </span>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-[10px] text-[#a0a0a0]">Wins</span>
                            <span className="text-sm text-[#a0a0a0]">{stat.wins}</span>
                          </div>
                        </div>

                        {/* Progress Bar - represents win rate */}
                        <div className="h-1 bg-[#1a1a1a] rounded-full overflow-visible relative group cursor-pointer">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${stat.winRate}%` }}
                            transition={{ duration: 1, delay: 0.3 + index * 0.1, ease: "easeOut" }}
                            className="h-full rounded-full"
                            style={{
                              background: `linear-gradient(to right, ${stat.color}, ${stat.color}dd)`
                            }}
                          />
                          {/* Tooltip - shows win rate on hover */}
                          <div className="absolute -top-9 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/90 text-white text-xs px-2 py-1 rounded whitespace-nowrap pointer-events-none z-10">
                            Win Rate: {stat.winRate}%
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.section>

          {/* COMPLETED GAMES SECTION */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="bg-white/5 backdrop-blur-xs p-6 rounded-xl overflow-hidden flex flex-col h-full"
          >
            <h2 className="text-lg font-bold mb-4">Completed Games</h2>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <p className="text-gray-400">Loading games...</p>
                </div>
              ) : games.length === 0 ? (
                <div className="flex items-center justify-center h-32">
                  <p className="text-gray-400">No completed games yet</p>
                </div>
              ) : (
                games.map((game, index) => (
                  <motion.div
                    key={game.gameId || index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.3 + index * 0.05 }}
                    className={`h-18 rounded-lg py-2 px-4 flex items-center justify-between cursor-pointer transition-all duration-200 border ${
                      game.result === "win"
                        ? "border-[#10b981] hover:bg-[#1a3a2a]"
                        : game.result === "loss"
                        ? "border-[#ef4444] hover:bg-[#3a1a1a]"
                        : "hover:bg-[#2a2a2a]"
                    }`}
                    onClick={() => toast.info("Game review coming soon...")}
                  >
                    {/* Left Side - Opponent Info */}
                    <div className="flex items-center gap-3">
                      <div>
                        {game.result === "win" ? (
                          <Trophy size={20} className="text-[#10b981]" />
                        ) : game.result === "loss" ? (
                          <X size={20} className="text-[#ef4444]" />
                        ) : (
                          <CircleEqual size={20} className="text-[#a0a0a0]" />
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold">{game.username}</span>
                        <span className="text-xs text-[#a0a0a0]">{game.rating}</span>
                      </div>
                    </div>

                    {/* Right Side - Game Stats */}
                    <div className="hidden md:flex items-center gap-6">
                      <div className="flex flex-col items-center">
                          <span className="text-[10px] text-[#a0a0a0]">You Played</span>
                          <span className="text-sm capitalize">{game.playerColor}</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] text-[#a0a0a0]">Result</span>
                          <span className="text-sm capitalize">{game.result}</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] text-[#a0a0a0]">Opponent ELO</span>
                          <span className="text-sm">{game.rating ?? "—"}</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] text-[#a0a0a0]">Moves</span>
                          <span className="text-sm">{game.moves}</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] text-[#a0a0a0]">Date</span>
                          <span className="text-sm">{game.date}</span>
                        </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.section>
        </div>

        {/* RIGHT COLUMN - New Game Section */}
        <div className="flex flex-col h-full overflow-y-auto min-w-0">
          {/* NEW GAME SECTION */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="rounded-xl mb-4"
          >
            <h2 className="text-lg font-bold mb-5">New Game</h2>

            {/* Time Control Grid */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              {timeControls.map((control, index) => (
                <motion.button
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 + index * 0.05 }}
                  onClick={() => handleStartGame(control.time)}
                  className="h-14 bg-white/5 backdrop-blur-xs rounded-lg hover:bg-white/10  transition-all duration-200 flex flex-col items-center justify-center gap-1 relative overflow-hidden cursor-pointer hover:border hover:border-primary group"
                >
                  <div className="absolute -top-1 -right-1 opacity-10 pointer-events-none transition-all duration-200">
                    <control.icon size={64} className="text-[#5d5a5a] group-hover:text-primary transition-colors duration-200" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{control.time}</span>
                  </div>
                </motion.button>
              ))}
            </div>

            <div className="flex gap-4">
              {/* Custom Button */}
              <button
                onClick={() => window.location.href = '/play'}
                className="flex-1 h-12 border border-gray-500 rounded-lg hover:bg-primary
                hover:text-black hover:border-none font-medium hover:font-semibold transition-all duration-200 cursor-pointer"
              >
                <span className="text-sm">Custom Game</span>
              </button>

              {/* VS Computer Button */}
              <button
                onClick={() => toast.info("VS Computer coming soon...")}
                className="flex-1 h-12 hover:bg-secondary border border-gray-500 hover:border-none font-medium hover:font-semibold rounded-lg transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Zap size={20} />
                <span className=" text-sm">Vs Computer</span>
              </button>
            </div>
          </motion.section>

          {/* WEEKLY STATS SECTION */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className=" rounded-xl p-4 flex-1 flex flex-col bg-white/5 backdrop-blur-xs"
          >
            {/* Header with Week Navigation */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">Weekly Performance</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedWeek(selectedWeek - 1)}
                  className="p-1 rounded hover:bg-white/10 transition-colors"
                  aria-label="Previous week"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm text-white min-w-[80px] text-center">
                  {getWeekLabel(selectedWeek)}
                </span>
                <button
                  onClick={() => setSelectedWeek(selectedWeek + 1)}
                  disabled={selectedWeek >= 0}
                  className="p-1 rounded hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Next week"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* Metric Toggles */}
            <div className="flex gap-2 ">
              {[
                { key: "total", label: "Total", color: "bg-secondary" },
                { key: "win", label: "Wins", color: "bg-[#10b981]" },
                { key: "loss", label: "Losses", color: "bg-red-500" },
                { key: "draw", label: "Draws", color: "bg-gray-500" },
              ].map((metric) => (
                <button
                  key={metric.key}
                  onClick={() => setSelectedMetric(metric.key as typeof selectedMetric)}
                  className={`flex-1 px-2 py-2 cursor-pointer rounded text-sm font-medium transition-all text-white ${
                    selectedMetric === metric.key
                      ? `${metric.color}`
                      : "bg-white/8 hover:bg-white/10"
                  }`}
                >
                  {metric.label}
                </button>
              ))}
            </div>

            {/* Bar Chart */}
            <div className="flex-1 flex items-end justify-between gap-2 px-2">
              {currentWeekData.days.map((day, index) => {
                const value = currentWeekData[selectedMetric][index];
                const heightPercentage = maxValue > 0 ? (value / maxValue) * 100 : 0;

                return (
                  <div key={day} className="flex-1 flex flex-col items-center gap-2">
                    {/* Bar */}
                    <div className="w-full flex items-end justify-center" style={{ height: "120px" }}>
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${heightPercentage}%` }}
                        transition={{ duration: 0.5, delay: index * 0.05 }}
                        className={`w-full rounded-t relative group ${
                          selectedMetric === "win"
                            ? "bg-gradient-to-t from-[#A9E8AD] to-[#388B1D]"
                            : selectedMetric === "loss"
                            ? "bg-gradient-to-t from-[#FA8183] to-[#AF2528]"
                            : selectedMetric === "draw"
                            ? "bg-gradient-to-t from-[#6F6C6C] to-[#424141]"
                            : "bg-gradient-to-t from-[#A15DE5] to-[#5B2791]"
                        }`}
                      >
                        {/* Tooltip on hover */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                          {value} games
                        </div>
                      </motion.div>
                    </div>
                    {/* Day Label */}
                    <span className="text-sm text-[#a0a0a0]">{day}</span>
                  </div>
                );
              })}
            </div>
          </motion.section>
        </div>
      </div>
    </div>
  </div>
  );
}