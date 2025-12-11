"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LogOut, Trophy, CircleEqual, X} from "lucide-react";
import { motion } from "framer-motion";
import { useUserStore } from "@/store/useUserStore";
import Cookies from "js-cookie";
import { useEffect, useState } from "react";

// Import custom icons
import { BulletIcon, BlitzIcon, RapidIcon } from "@/components/icons/TimeControlIcons";

// Import dashboard components
import { PerformanceCard } from "@/components/dashboard/PerformanceCard";
import { GameCard } from "@/components/dashboard/GameCard";
import { KeyMetricsSection } from "@/components/dashboard/KeyMetricsSection";
import { TimeControlGrid } from "@/components/dashboard/TimeControlGrid";
import { WeeklyInsights } from "@/components/dashboard/WeeklyInsights";
import { EloTrendChart } from "@/components/dashboard/EloTrendChart";
import { GameBreakdownChart } from "@/components/dashboard/GameBreakdownChart";
// Import hooks
import { useDashboardData } from "@/hooks/useDashboardData";

// New types for weekly insights and streaks
interface WeeklyInsightsResponse {
  eloTrend: { days: string[]; ratings: number[] };
  breakdown: { days: string[]; wins: number[]; losses: number[]; draws: number[] };
}

export default function Dashboard() {
  const router = useRouter();
  const { clearUser, user } = useUserStore();
  const [welcomeMessage, setWelcomeMessage] = useState("Welcome back");
  const [gameFilter, setGameFilter] = useState<"all" | "win" | "loss" | "draw">("all");
  const [weekOffset, setWeekOffset] = useState(0);
  const [activeInsightsTab, setActiveInsightsTab] = useState<"elo" | "games">("elo");
  const [isSmallScreen, setIsSmallScreen] = useState(false);

  // Use custom hook for data fetching
  const { games, loading, performanceData, performanceLoading, weekData, streakStats } = useDashboardData();

  useEffect(() => {
    // Check if user came from signup/verifyotp (new user) or login (returning user)
    if (typeof window !== "undefined") {
      const referrer = document.referrer;
      const isNewUser = referrer.includes("/verifyotp") || referrer.includes("/signup");
      setWelcomeMessage(isNewUser ? "Welcome" : "Welcome back");
    }
  }, []);

  // Desktop: 7 days, Mobile: 4 days
  useEffect(() => {
    const checkScreen = () => {
      setIsSmallScreen(window.innerWidth < 768);
    };
    checkScreen();
    window.addEventListener("resize", checkScreen);
    return () => window.removeEventListener("resize", checkScreen);
  }, []);

  const handleLogout = () => {
    try {
      clearUser();
      Cookies.remove("auth-token");
      toast.success("Logged out successfully!");
      router.push("/login");
    } catch (err) {
      console.error("Failed to clear auth data", err);
      toast.error("Failed to logout properly");
    }
  };

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

  const filteredGames = gameFilter === "all" ? games : games.filter((g) => g.result === gameFilter);

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

  const formatDayKey = (d: Date) => {
    const dd = String(d.getUTCDate()).padStart(2, "0");
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    return `${dd}-${mm}`;
  };

  const formatRangeLabel = (weekOffset: number, daysCount: number = 7) => {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    start.setUTCDate(start.getUTCDate() - (daysCount - 1) + weekOffset * daysCount);
    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + daysCount - 1);
    const fmt = (d: Date) => `${d.getUTCDate()} ${d.toLocaleString("en-US", { month: "short" })}`;
    return `${fmt(start)} - ${fmt(end)}`;
  };

  const buildWeekView = (
    insights: WeeklyInsightsResponse | null,
    weekOffset: number,
    baseElo?: number | null,
    daysToShow: number = 7 // Add parameter for responsive days
  ) => {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    start.setUTCDate(start.getUTCDate() - (daysToShow - 1) + weekOffset * daysToShow);

    const days = Array.from({ length: daysToShow }, (_, i) => {
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

  const daysToDisplay = isSmallScreen ? 4 : 7;
  const displayedWeekInsights = buildWeekView(weekData, weekOffset, user.elo ?? 300, daysToDisplay);

  return (
    <div className="h-screen overflow-hidden flex flex-col">
      {/* TOP HEADER BAR */}
      <header className="px-4 sm:px-8 py-4 flex items-center justify-between flex-shrink-0">
        <h1 className="text-2xl font-bold">Chess</h1>

        <div className="flex items-center gap-4 sm:gap-8">
          {/* User Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Image
              src={user.avatar || "/avatar1.svg"}
              alt={user.username || "User"}
              width={40}
              height={40}
              className="rounded-full"
            />
            <div className="hidden sm:flex flex-col">
              <span className="text-sm font-medium">{user.username}</span>
              <span className="text-xs text-[#a0a0a0]">Rating: {user.elo || 300}</span>
            </div>
          </div>

          {/* Logout Icon */}
          <button
            onClick={handleLogout}
            className="text-[#a0a0a0] hover:text-red-400 transition-colors duration-300 cursor-pointer p-2 rounded-lg hover:bg-red-500/10"
            aria-label="Logout"
            title="Logout"
          >
            <LogOut size={22} />
          </button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <div className="flex-1 overflow-y-auto lg:overflow-hidden">
        {/* Desktop Layout */}
        <div className="hidden lg:grid h-full px-8 py-2 grid-cols-[3fr_2fr] gap-6">
          {/* LEFT COLUMN */}
          <div className="flex flex-col h-full min-h-0 gap-6">
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

              <KeyMetricsSection
                elo={user.elo || 300}
                gamesCount={games.length}
                currentStreak={streakStats?.currentStreak ?? 0}
                longestStreak={streakStats?.longestStreak ?? 0}
                type={streakStats?.type}
              />

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
              className="bg-white/5 backdrop-blur-xs p-6 rounded-xl flex flex-col flex-1 min-h-0 overflow-hidden "
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Completed Games</h2>
                <div className="flex items-center gap-3">
                  {/* <div className="flex gap-2 text-xs">
                    {(["all", "win", "loss", "draw"] as const).map((f) => (
                      <button
                        key={f}
                        onClick={() => setGameFilter(f)}
                        className={`px-3 py-1 border rounded cursor-pointer transition ${
                          gameFilter === f ? "bg-primary/10 border border-primary " : "hover:bg-white/10 border-white/20"
                        }`}
                      >
                        {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
                      </button>
                    ))}
                  </div> */}
                  <button
                    onClick={() => router.push('/history')}
                    className="text-sm hover:bg-white/5 px-4 py-1 rounded text-white transition whitespace-nowrap cursor-pointer"
                  >
                    View All &gt;

                  </button>
                </div>
              </div>

              <div className="flex-1 space-y-3 pr-2 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center h-32">
                    <p className="text-gray-400">Loading games...</p>
                  </div>
                ) : filteredGames.length === 0 ? (
                  <div className="flex items-center justify-center h-32">
                    <p className="text-gray-400 text-sm">No games</p>
                  </div>
                ) : (
                  filteredGames.slice(0, 10).map((game, index) => (
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
              
              <TimeControlGrid onSelect={handleStartGame} />

              <div className="flex gap-4">
                <button
                  onClick={() => (window.location.href = "/play")}
                  className="flex-1 h-12 border border-gray-500 rounded-lg hover:bg-primary hover:text-black hover:border-none font-medium hover:font-semibold transition-all duration-200 cursor-pointer"
                >
                  <span className="text-sm">Custom Game</span>
                </button>

                <button
                  onClick={() => router.push("/computer")}
                  className="flex-1 h-12 hover:bg-secondary border border-gray-500 hover:border-none font-medium hover:font-semibold rounded-lg transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="text-sm">Vs Computer</span>
                </button>
              </div>
            </motion.section>

            <WeeklyInsights
              weekOffset={weekOffset}
              activeTab={activeInsightsTab}
              dateRange={formatRangeLabel(weekOffset)}
              canGoNext={weekOffset >= 0}
              onTabChange={setActiveInsightsTab}
              onNavigate={handleWeekNav}
            >
              {activeInsightsTab === "elo" ? (
                <EloTrendChart data={{ days: displayedWeekInsights.eloTrend.days, elo: displayedWeekInsights.eloTrend.ratings }} />
              ) : (
                <GameBreakdownChart data={displayedWeekInsights.breakdown} />
              )}
            </WeeklyInsights>
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="lg:hidden flex flex-col gap-6 px-4 py-4 pb-8">
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="rounded-xl"
          >
            <h2 className="text-xl font-bold mb-4">
              {welcomeMessage}, {user.username || "Player"}
            </h2>

            <KeyMetricsSection
              elo={user.elo || 300}
              gamesCount={games.length}
              currentStreak={streakStats?.currentStreak ?? 0}
              longestStreak={streakStats?.longestStreak ?? 0}
              type={streakStats?.type}
            />
          </motion.section>

          {/* NEW GAME SECTION */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="rounded-xl"
          >
            <h2 className="text-lg font-bold mb-2">New Game</h2>
            
            <TimeControlGrid onSelect={handleStartGame} />

            <div className="flex gap-3">
              <button
                onClick={() => (window.location.href = "/play")}
                className="flex-1 h-12 border border-gray-500 rounded-lg hover:bg-primary hover:text-black hover:border-none font-medium hover:font-semibold transition-all duration-200 cursor-pointer"
              >
                <span className="text-sm">Custom Game</span>
              </button>

              <button
                onClick={() => router.push("/computer")}
                className="flex-1 h-12 hover:bg-secondary border border-gray-500 hover:border-none font-medium hover:font-semibold rounded-lg transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span className="text-sm">Vs Computer</span>
              </button>
            </div>
          </motion.section>

          {/* PERFORMANCE BY FORMAT */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="rounded-xl"
          >
            <h3 className="text-sm sm:text-base font-medium mb-4">Performance by Format</h3>

            {performanceLoading ? (
              <div className="flex items-center justify-center h-32">
                <p className="text-gray-400 text-sm">Loading...</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {gameStats.map((stat, index) => (
                  <PerformanceCard key={stat.type} {...stat} index={index} />
                ))}
              </div>
            )}
          </motion.section>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 ">
          <WeeklyInsights
            weekOffset={weekOffset}
            activeTab={activeInsightsTab}
            dateRange={formatRangeLabel(weekOffset, daysToDisplay)}
            canGoNext={weekOffset >= 0}
            onTabChange={setActiveInsightsTab}
            onNavigate={handleWeekNav}
            isMobile
          >
            {activeInsightsTab === "elo" ? (
              <EloTrendChart data={{ days: displayedWeekInsights.eloTrend.days, elo: displayedWeekInsights.eloTrend.ratings }} />
            ) : (
              <GameBreakdownChart data={displayedWeekInsights.breakdown} />
            )}
          </WeeklyInsights>

          {/* COMPLETED GAMES SECTION - MOBILE */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="bg-white/5 backdrop-blur-xs p-4 rounded-xl flex flex-col"
          >
            <div className="flex flex-col gap-3 mb-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base sm:text-lg font-bold">Completed Games</h2>
                <button
                  onClick={() => router.push('/history')}
                  className="text-xs sm:text-sm hover:bg-white/10 px-2 py-1 rounded cursor-pointer transition whitespace-nowrap font-medium"
                >
                  View All &gt;
                </button>
              </div>
              
              <div className="flex gap-2">
                {(["all", "win", "loss", "draw"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setGameFilter(f)}
                    className={`flex-1 px-3 py-2 border rounded cursor-pointer transition text-xs sm:text-sm font-medium ${
                      gameFilter === f ? "border-primary bg-primary/10" : "bg-white/2 hover:bg-white/20 border-white/10"
                    }`}
                  >
                    {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <p className="text-gray-400 text-sm">Loading...</p>
                </div>
              ) : filteredGames.length === 0 ? (
                <div className="flex items-center justify-center h-32">
                  <p className="text-gray-400 text-sm">No games</p>
                </div>
              ) : (
                filteredGames.slice(0, 4).map((game, index) => (
                  <GameCard key={game.gameId || index} game={game} index={index} delay={0.4} />
                ))
              )}
            </div>
          </motion.section>
          </div>
        </div>
      </div>
    </div>
  );
}