"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Settings, Trophy, Zap, CircleEqual, X } from "lucide-react";
import { TbTargetArrow } from "react-icons/tb";
import { FaChess, FaFire } from "react-icons/fa";
import { motion } from "framer-motion";
import { fetchGameSummaries, GameSummaryResponse, fetchWeeklyInsights, fetchPerformance } from "@/services/gameApi";

// Custom Chess Time Control Icons
const BulletIcon = ({ size = 16, className = "", style }: { size?: number; className?: string; style?: React.CSSProperties }) => (
  <svg aria-hidden="true" viewBox="0 0 24 24" height={size} width={size} className={className} style={style} xmlns="http://www.w3.org/2000/svg">
    <path d="M7.17005 15.2999L8.60005 16.7699L0.330049 23.6699L7.17005 15.2999ZM0.300049 17.5999L4.80005 11.5999L5.70005 13.5999L0.300049 17.5999ZM10.77 10.0999C14.24 6.49994 16.7 4.89994 19.47 3.69994C17.07 3.69994 14.17 4.06994 9.67005 8.29994C9.70005 8.79994 10.37 9.76994 10.77 10.0999ZM21.83 2.16994C21.83 2.16994 22.06 3.26994 22.06 4.93994C22.06 7.60994 21.39 11.7699 17.89 15.2699L15.72 17.4399C15.05 18.1099 14.39 18.0399 13.59 17.7099L6.12005 24.0099L15.92 11.8399L10.69 15.8699C10.26 15.4699 9.76005 15.0399 9.36005 14.6399C7.63005 12.9399 5.23005 9.63994 6.59005 8.26994L8.79005 6.13994C12.32 2.63994 16.42 1.93994 19.09 1.93994C20.72 1.93994 21.82 2.16994 21.82 2.16994H21.83Z" fill="currentColor" />
  </svg>
);

const BlitzIcon = ({ size = 16, className = "", style }: { size?: number; className?: string; style?: React.CSSProperties }) => (
  <svg aria-hidden="true" viewBox="0 0 24 24" height={size} width={size} className={className} style={style} xmlns="http://www.w3.org/2000/svg">
    <path d="M5.77002 15C4.74002 15 4.40002 14.6 4.57002 13.6L6.10002 3.4C6.27002 2.4 6.73002 2 7.77002 2H13.57C14.6 2 14.9 2.4 14.64 3.37L11.41 15H5.77002ZM18.83 9C19.86 9 20.03 9.33 19.4 10.13L9.73002 22.86C8.50002 24.49 8.13002 24.33 8.46002 22.29L10.66 8.99L18.83 9Z" fill="currentColor" />
  </svg>
);

const RapidIcon = ({ size = 16, className = "", style }: { size?: number; className?: string; style?: React.CSSProperties }) => (
  <svg aria-hidden="true" viewBox="0 0 24 24" height={size} width={size} className={className} style={style} xmlns="http://www.w3.org/2000/svg">
    <path d="M11.97 14.63C11.07 14.63 10.1 13.9 10.47 12.4L11.5 8H12.5L13.53 12.37C13.9 13.9 12.9 14.64 11.96 14.64L11.97 14.63ZM12 22.5C6.77 22.5 2.5 18.23 2.5 13C2.5 7.77 6.77 3.5 12 3.5C17.23 3.5 21.5 7.77 21.5 13C21.5 18.23 17.23 22.5 12 22.5ZM12 19.5C16 19.5 18.5 17 18.5 13C18.5 9 16 6.5 12 6.5C8 6.5 5.5 9 5.5 13C5.5 17 8 19.5 12 19.5ZM10.5 5.23V1H13.5V5.23H10.5ZM15.5 2H8.5C8.5 0.3 8.93 0 12 0C15.07 0 15.5 0.3 15.5 2Z" fill="currentColor" />
  </svg>
);

import { useUserStore } from "@/store/useUserStore";
import Cookies from "js-cookie";
import { useEffect, useState, useRef } from "react";


interface TransformedGame {
  username: string;
  rating: number | null;
  playerElo: number | null;
  result: string;
  accuracy: number;
  moves: number;
  date: string;
  gameId: string;
  playerColor: "white" | "black";
}

// Remove unused types
interface PerformanceData {
  format: string;
  played: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
}

// New types for weekly insights and streaks
interface WeeklyInsightsResponse {
  eloTrend: { days: string[]; ratings: number[] };
  breakdown: { days: string[]; wins: number[]; losses: number[]; draws: number[] };
}

interface StreakStatsResponse {
  currentStreak: number;
  longestStreak: number;
  type: "win" | "loss" | "draw" | null;
}

export default function Dashboard() {
  const router = useRouter();
  const { clearUser, user, setUser } = useUserStore();
  const [welcomeMessage, setWelcomeMessage] = useState("Welcome back");
  const [games, setGames] = useState<TransformedGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [performanceLoading, setPerformanceLoading] = useState(true);
  const [gameFilter, setGameFilter] = useState<"all" | "win" | "loss" | "draw">("all");

  // Weekly Insights states
  const [weekOffset, setWeekOffset] = useState(0);
  const [activeInsightsTab, setActiveInsightsTab] = useState<"elo" | "games">("elo");
  const [weekData, setWeekData] = useState<WeeklyInsightsResponse | null>(null);
  const [streakStats, setStreakStats] = useState<StreakStatsResponse | null>(null);

  useEffect(() => {
    // Check if user came from signup/verifyotp (new user) or login (returning user)
    if (typeof window !== "undefined") {
      const referrer = document.referrer;
      const isNewUser = referrer.includes("/verifyotp") || referrer.includes("/signup");
      setWelcomeMessage(isNewUser ? "Welcome" : "Welcome back");
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setPerformanceLoading(true);
        const [summaries, insights, perf] = await Promise.all([
          fetchGameSummaries(),
          fetchWeeklyInsights(),
          fetchPerformance()
        ]);
        
        // Extract games, current ELO, and streak stats from summaries response
        const gamesData = summaries?.games ?? [];
        const latestElo = summaries?.currentElo ?? user.elo ?? 300;
        const streakData = summaries?.streakStats ?? null;
        
        const transformedGames = gamesData.map((game: GameSummaryResponse) => ({
          username: game.opponentName,
          rating: game.opponentElo,
          playerElo: game.playerElo,
          result: game.playerResult,
          accuracy: 0,
          moves: game.movesCount,
          date: formatShortDate(game.matchDate),
          gameId: game.gameId,
          playerColor: game.playerColor,
        }));
        setGames(transformedGames);
        setWeekData(insights);
        setStreakStats(streakData);
        setPerformanceData(perf ?? []);

        // Always update user ELO with current ELO from backend
        setUser({ elo: latestElo });
      } catch (err) {
        console.error("Failed to load dashboard data", err);
        setGames([]);
        setPerformanceData([]);
      } finally {
        setLoading(false);
        setPerformanceLoading(false);
      }
    };
    loadData();
  }, [user.id, user.elo, setUser]);

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
  const gameStats =
    performanceData.length > 0
      ? performanceData.map((stat) => {
          let icon, color;

          switch (stat.format) {
            case "Overall":
              icon = Trophy;
              color = "#10b981";
              break;
            case "Bullet":
              icon = BulletIcon;
              color = "#ef4444";
              break;
            case "Blitz":
              icon = BlitzIcon;
              color = "#f59e0b";
              break;
            case "Rapid":
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
            color,
          };
        })
      : [
          { type: "Overall", icon: Trophy, played: 0, wins: 0, winRate: 0, color: "#10b981" },
          { type: "Bullet", icon: BulletIcon, played: 0, wins: 0, winRate: 0, color: "#ef4444" },
          { type: "Blitz", icon: BlitzIcon, played: 0, wins: 0, winRate: 0, color: "#f59e0b" },
          { type: "Rapid", icon: RapidIcon, played: 0, wins: 0, winRate: 0, color: "#3b82f6" },
        ];

  const filteredGames =
    gameFilter === "all" ? games : games.filter((g) => g.result === gameFilter);

  const handleStartGame = (timeControl: string) => {
    router.push(`/play?timeControl=${encodeURIComponent(timeControl)}&autoStart=true`);
  };

  const handleWeekNav = (direction: "prev" | "next" | "current") => {
    if (direction === "current") {
      setWeekOffset(0);
    } else if (direction === "prev") {
      setWeekOffset((prev) => prev - 1);
    } else if (weekOffset < 0) {
      setWeekOffset((prev) => prev + 1);
    }
  };

  const formatShortDate = (iso: string) => {
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2, "0")}-${d.toLocaleString("en-US", { month: "short" })}`;
  };

  const formatDayKey = (d: Date) => {
    const dd = String(d.getUTCDate()).padStart(2, "0");
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    return `${dd}-${mm}`;
  };

  const formatRangeLabel = (weekOffset: number) => {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    start.setUTCDate(start.getUTCDate() - 6 + weekOffset * 7);
    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 6);
    const fmt = (d: Date) => `${d.getUTCDate()} ${d.toLocaleString("en-US", { month: "short" })}`;
    return `${fmt(start)} - ${fmt(end)}`;
  };

  const buildWeekView = (
    insights: WeeklyInsightsResponse | null,
    weekOffset: number,
    baseElo?: number | null
  ) => {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    start.setUTCDate(start.getUTCDate() - 6 + weekOffset * 7);

    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setUTCDate(start.getUTCDate() + i);
      return formatDayKey(d);
    });

    const defaultRating = baseElo ?? 300;
    const ratings: number[] = [];
    const wins: number[] = [];
    const losses: number[] = [];
    const draws: number[] = [];

    let lastRating = defaultRating;
    days.forEach(day => {
      const eloIdx = insights?.eloTrend.days.indexOf(day) ?? -1;
      const r = eloIdx >= 0 ? insights?.eloTrend.ratings[eloIdx] ?? lastRating : lastRating;
      lastRating = r ?? lastRating;

      ratings.push(r ?? defaultRating);

      const brIdx = insights?.breakdown.days.indexOf(day) ?? -1;
      wins.push(brIdx >= 0 ? insights!.breakdown.wins[brIdx] : 0);
      losses.push(brIdx >= 0 ? insights!.breakdown.losses[brIdx] : 0);
      draws.push(brIdx >= 0 ? insights!.breakdown.draws[brIdx] : 0);
    });

    return {
      eloTrend: { days, ratings },
      breakdown: { days, wins, losses, draws },
    };
  };

  const displayedWeekInsights = buildWeekView(weekData, weekOffset, user.elo ?? 300);

  const currentWeekInsights = displayedWeekInsights;

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
          <div className="flex flex-col h-full min-h-0 min-w-0 gap-6">
            {/* STATISTICS OVERVIEW */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="rounded-xl"
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
                <div className="bg-white/5 backdrop-blur-xs rounded-lg p-4 flex flex-col items-end justify-center gap-1 h-20 relative overflow-hidden">
                  <FaFire size={80} className="text-orange-500 opacity-50 absolute -top-0 -left-2" />
                  <span className="text-4xl font-bold">{streakStats?.currentStreak ?? 0}</span>
                  <span className="text-xs text-[#a0a0a0]">Longest Streak: {streakStats?.longestStreak ?? 0}</span>
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
                                background: `linear-gradient(to right, ${stat.color}, ${stat.color}dd)`,
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
              className="bg-white/5 backdrop-blur-xs p-6 rounded-xl flex flex-col flex-1 min-h-0 overflow-hidden"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Completed Games</h2>
                <div className="flex gap-2 text-xs">
                  {(["all", "win", "loss", "draw"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setGameFilter(f)}
                      className={`px-3 py-1 rounded cursor-pointer transition ${
                        gameFilter === f ? "bg-primary text-black" : "bg-white/10 hover:bg-white/20"
                      }`}
                    >
                      {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 space-y-3 pr-2 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center h-32">
                    <p className="text-gray-400">Loading games...</p>
                  </div>
                ) : filteredGames.length === 0 ? (
                  <div className="flex items-center justify-center h-32">
                    <p className="text-gray-400">No games for this filter</p>
                  </div>
                ) : (
                  filteredGames.map((game, index) => (
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

          {/* RIGHT COLUMN - New Game + Weekly Insights */}
          <div className="flex flex-col h-full min-h-0 min-w-0 gap-4">
            {/* NEW GAME SECTION */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="rounded-xl"
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
                    className="h-14 bg-white/5 backdrop-blur-xs rounded-lg hover:bg-white/10 transition-all duration-200 flex flex-col items-center justify-center gap-1 relative overflow-hidden cursor-pointer hover:border hover:border-primary group"
                  >
                    <div className="absolute -top-1 -right-1 opacity-10 pointer-events-none transition-all duration-200">
                      <control.icon
                        size={64}
                        className="text-[#5d5a5a] group-hover:text-primary transition-colors duration-200"
                      />
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
                  onClick={() => (window.location.href = "/play")}
                  className="flex-1 h-12 border border-gray-500 rounded-lg hover:bg-primary hover:text-black hover:border-none font-medium hover:font-semibold transition-all duration-200 cursor-pointer"
                >
                  <span className="text-sm">Custom Game</span>
                </button>

                {/* VS Computer Button */}
                <button
                  onClick={() => toast.info("VS Computer coming soon...")}
                  className="flex-1 h-12 hover:bg-secondary border border-gray-500 hover:border-none font-medium hover:font-semibold rounded-lg transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Zap size={20} />
                  <span className="text-sm">Vs Computer</span>
                </button>
              </div>
            </motion.section>

            {/* WEEKLY INSIGHTS SECTION */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="rounded-xl p-4 flex flex-col bg-white/5 backdrop-blur-xs flex-1 min-h-0 "
            >
              {/* Header with Week Navigation */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Weekly Insights</h3>
                <div className="flex items-center gap-2 text-sm">
                  <button
                    onClick={() => handleWeekNav("prev")}
                    className="px-2 py-1 rounded hover:bg-white/10 transition-colors cursor-pointer"
                    aria-label="Previous week"
                  >
                    &lt; Prev
                  </button>
                  <button
                    onClick={() => handleWeekNav("current")}
                    className="px-3 py-1 rounded bg-primary text-black text-xs font-semibold cursor-pointer"
                  >
                    {formatRangeLabel(weekOffset)}
                  </button>
                  <button
                    onClick={() => handleWeekNav("next")}
                    disabled={weekOffset >= 0}
                    className={`px-2 py-1 rounded transition-colors ${
                      weekOffset >= 0 ? "opacity-30 cursor-not-allowed" : "hover:bg-white/10 cursor-pointer"
                    }`}
                    aria-label="Next week"
                  >
                    Next &gt;
                  </button>
                </div>
              </div>

              {/* Tab Buttons */}
              <div className="flex gap-2 mb-4">
                {[
                  { key: "elo", label: "ELO Trend" },
                  { key: "games", label: "Game Breakdown" },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveInsightsTab(tab.key as "elo" | "games")}
                    className={`flex-1 py-2 rounded text-sm font-medium cursor-pointer transition-all ${
                      activeInsightsTab === tab.key ? "bg-primary text-black" : "bg-white/10 hover:bg-white/20"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="flex-1 min-h-0">
                {activeInsightsTab === "elo" ? (
                  <EloTrendChart data={{ days: currentWeekInsights.eloTrend.days, elo: currentWeekInsights.eloTrend.ratings }} />
                ) : (
                  <GameBreakdownChart data={currentWeekInsights.breakdown} />
                )}
              </div>
            </motion.section>
          </div>
        </div>
      </div>
    </div>
  );
}

// ELO TREND CHART  (AREA + LINE GRAPH)

interface EloTrendData {
  days: string[];
  ratings?: number[];
  elo?: number[];
  wins?: number[];
  losses?: number[];
  draws?: number[];
}

const EloTrendChart= ({
  data,
}: {
  data: EloTrendData
}) => {
  const width = 600;
  const height = 180;
  const padding = 30;

  const series = data.ratings ?? data.elo ?? [];
  const safeSeries = series.length ? series : Array(data.days.length || 7).fill(300);

  const minElo = Math.min(...safeSeries) - 10;
  const maxElo = Math.max(...safeSeries) + 10;
  const range = maxElo - minElo || 1;

  const points = data.days.map((day, idx) => {
    const x = padding + (idx / Math.max(1, data.days.length - 1)) * (width - padding * 2);
    const y = height - padding - ((safeSeries[idx] - minElo) / range) * (height - padding * 2);
    return { day, elo: safeSeries[idx], x, y, delta: idx > 0 ? safeSeries[idx] - safeSeries[idx - 1] : 0 };
  });

  const areaPath = [
    `M ${points[0].x} ${height - padding}`,
    ...points.map((p) => `L ${p.x} ${p.y}`),
    `L ${points[points.length - 1].x} ${height - padding}`,
    "Z",
  ].join(" ");

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  return (
    <div className="w-full h-full flex flex-col justify-end relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-[180px]"
        preserveAspectRatio="none"
        style={{ overflow: "visible" }}
      >
        <defs>
          <linearGradient id="eloGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
          </linearGradient>
        </defs>

        <path d={areaPath} fill="url(#eloGradient)" />
        <path
          d={linePath}
          stroke="#a855f7"
          strokeWidth={2.5}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {points.map((point, index) => (
          <g key={index} className="group cursor-pointer">
            <circle cx={point.x} cy={point.y} r={4} fill="#a855f7" />

            <text
              x={point.x}
              y={height - 6}
              fill="#a0a0a0"
              fontSize={16}
              textAnchor="middle"
            >
              {point.day}
            </text>

            {/* Tooltip */}
            <g
              className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
              style={{ zIndex: 50 }}
            >
              <rect
                x={point.x - 50}
                y={point.y - 70}
                width={100}
                height={60}
                rx={8}
                fill="#000"
                fillOpacity={0.85}
              />
              <text x={point.x} y={point.y - 53} fill="#fff" fontSize={14} textAnchor="middle">
                {point.day}
              </text>
              <text x={point.x} y={point.y-34} fill="#fff" fontSize={14} textAnchor="middle">
                ELO: {point.elo}
              </text>
              <text
                x={point.x}
                y={point.y-16}
                fill={point.delta > 0 ? "#22c55e" : point.delta < 0 ? "#ef4444" : "#9ca3af"}
                fontSize={14}
                textAnchor="middle"
              >
                {point.delta > 0 ? `+${point.delta}` : point.delta}
              </text>
            </g>
          </g>
        ))}
      </svg>
    </div>
  );
};


// GAME BREAKDOWN CHART
const GameBreakdownChart = ({
  data,
}: {
  data: { days: string[]; wins: number[]; losses: number[]; draws: number[] };
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 300, height: 150 });

  // Observe parent size
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect) {
          setDimensions({
            width: entry.contentRect.width,
            height: entry.contentRect.height,
          });
        }
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const { width, height } = dimensions;

  const padding = 30;
  const maxValue = Math.max(...data.wins, ...data.losses, ...data.draws, 1);
  const MIN_BAR = 3; // minimum bar height for zero values

  const barWidth = Math.max(width / 50, 8); // responsive bar width
  const innerGap = barWidth * 0.6;
  const groupSpacing = width / data.days.length;

  const COLORS = {
    wins: "#4ade80",
    draws: "#cbd5e1",
    losses: "#f87171",
  };

  const scaleY = (v: number) =>
    height - padding - (v / maxValue) * (height - padding * 2);


  return (
    <div ref={containerRef} className="w-full h-full relative">
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        style={{ overflow: "visible" }}
      >
        {data.days.map((day, i) => {
          const centerX = i * groupSpacing + groupSpacing / 2;

          const wins = data.wins[i];
          const draws = data.draws[i];
          const losses = data.losses[i];

          const values = [wins, draws, losses];
          const tallestValue = Math.max(...values);
          const tooltipY = scaleY(tallestValue) - 55;

          const winsHeight = height - padding - scaleY(wins);
          const drawsHeight = height - padding - scaleY(draws);
          const lossesHeight = height - padding - scaleY(losses);

          const winsH = wins === 0 ? MIN_BAR : winsHeight;
          const drawsH = draws === 0 ? MIN_BAR : drawsHeight;
          const lossesH = losses === 0 ? MIN_BAR : lossesHeight;

          const winsY = height - padding - winsH;
          const drawsY = height - padding - drawsH;
          const lossesY = height - padding - lossesH;

          return (
            <g key={i} className="group cursor-pointer">
              {/* WIN BAR */}
              <rect
                x={centerX - barWidth - innerGap}
                y={winsY}
                width={barWidth}
                height={winsH}
                rx={4}
                fill={COLORS.wins}
              />

              {/* DRAW BAR */}
              <rect
                x={centerX}
                y={drawsY}
                width={barWidth}
                height={drawsH}
                rx={4}
                fill={COLORS.draws}
              />

              {/* LOSS BAR */}
              <rect
                x={centerX + barWidth + innerGap}
                y={lossesY}
                width={barWidth}
                height={lossesH}
                rx={4}
                fill={COLORS.losses}
              />

              {/* DAY LABEL */}
              <text
                x={centerX}
                y={height - padding + 20}
                fill="#a0a0a0"
                fontSize={14}
                textAnchor="middle"
              >
                {day}
              </text>

              {/* TOOLTIP */}
              <g
                className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                style={{ zIndex: 50 }}
              >
                <rect
                  x={centerX -20}
                  y={tooltipY - 10}
                  width={100}
                  height={80}
                  rx={8}
                  fill="#000"
                  fillOpacity={0.85}
                />

                <text x={centerX} y={tooltipY + 16} fill="#fff" fontSize={16}>
                  {day}
                </text>
                <text x={centerX} y={tooltipY + 32} fill={COLORS.wins} fontSize={14}>
                  Wins: {wins}
                </text>
                <text x={centerX} y={tooltipY + 45} fill={COLORS.draws} fontSize={14}>
                  Draws: {draws}
                </text>
                <text x={centerX} y={tooltipY + 58} fill={COLORS.losses} fontSize={14}>
                  Losses: {losses}
                </text>
              </g>
            </g>
          );
        })}
      </svg>
    </div>
  );
};