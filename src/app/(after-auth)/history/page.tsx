"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Trophy, X, CircleEqual, TrendingUp, Calendar } from "lucide-react";
import Image from "next/image";
import { useUserStore } from "@/store/useUserStore";
import { fetchGameSummaries, GameSummaryResponse } from "@/services/gameApi";
import { toast } from "sonner";

type FilterType = "all" | "win" | "loss" | "draw";
type SortType = "recent" | "oldest" | "moves" | "rating";

interface TransformedGame {
  gameId: string;
  opponentName: string;
  opponentElo: number | null;
  playerElo: number | null;
  result: "win" | "loss" | "draw";
  moves: number;
  date: string;
  playerColor: "white" | "black";
  timestamp: Date;
}

const ITEMS_PER_PAGE = 10;

export default function HistoryPage() {
  const router = useRouter();
  const { user } = useUserStore();
  const [games, setGames] = useState<TransformedGame[]>([]);
  const [filteredGames, setFilteredGames] = useState<TransformedGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState<FilterType>("all");
  const [sortBy, setSortBy] = useState<SortType>("recent");
  const [searchQuery, setSearchQuery] = useState("");

  // Stats
  const [stats, setStats] = useState({
    totalGames: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    winRate: 0,
    avgMoves: 0,
    bestStreak: 0,
    currentStreak: 0,
    type: null,
  });

  useEffect(() => {
    const loadGames = async () => {
      try {
        setLoading(true);
        const data = await fetchGameSummaries();
        
        if (data && data.games) {
          const transformed: TransformedGame[] = data.games.map((game: GameSummaryResponse) => ({
            gameId: game.gameId,
            opponentName: game.opponentName,
            opponentElo: game.opponentElo,
            playerElo: game.playerElo,
            result: game.playerResult,
            moves: game.movesCount,
            date: formatDate(game.matchDate),
            playerColor: game.playerColor,
            timestamp: new Date(game.matchDate),
          }));

          setGames(transformed);
          calculateStats(transformed, data.streakStats);
        }
      } catch (err) {
        console.error("Failed to load game history", err);
        toast.error("Failed to load game history");
      } finally {
        setLoading(false);
      }
    };

    loadGames();
  }, []);

  useEffect(() => {
    let filtered = [...games];

    // Apply filter
    if (filter !== "all") {
      filtered = filtered.filter((g) => g.result === filter);
    }

    // Apply search
    if (searchQuery.trim()) {
      filtered = filtered.filter((g) =>
        g.opponentName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "recent":
          return b.timestamp.getTime() - a.timestamp.getTime();
        case "oldest":
          return a.timestamp.getTime() - b.timestamp.getTime();
        case "moves":
          return b.moves - a.moves;
        case "rating":
          return (b.opponentElo ?? 0) - (a.opponentElo ?? 0);
        default:
          return 0;
      }
    });

    setFilteredGames(filtered);
    setCurrentPage(1);
  }, [games, filter, sortBy, searchQuery]);

  const calculateStats = (gamesData: TransformedGame[], streakData: any) => {
    const total = gamesData.length;
    const wins = gamesData.filter((g) => g.result === "win").length;
    const losses = gamesData.filter((g) => g.result === "loss").length;
    const draws = gamesData.filter((g) => g.result === "draw").length;
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
    const avgMoves = total > 0 ? Math.round(gamesData.reduce((sum, g) => sum + g.moves, 0) / total) : 0;

    setStats({
      totalGames: total,
      wins,
      losses,
      draws,
      winRate,
      avgMoves,
      bestStreak: streakData?.longestStreak ?? 0,
      currentStreak: streakData?.currentStreak ?? 0,
      type: streakData?.type,
    });
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const getResultIcon = (result: "win" | "loss" | "draw") => {
    if (result === "win") return <Trophy size={20} className="text-emerald-400" />;
    if (result === "loss") return <X size={20} className="text-red-400" />;
    return <CircleEqual size={20} className="text-gray-400" />;
  };

  const getResultColor = (result: "win" | "loss" | "draw") => {
    if (result === "win") return "border-emerald-500/30 hover:bg-emerald-500/5";
    if (result === "loss") return "border-red-500/30 hover:bg-red-500/5";
    return "border-gray-500/30 hover:bg-gray-500/5";
  };

  const paginatedGames = filteredGames.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const totalPages = Math.ceil(filteredGames.length / ITEMS_PER_PAGE);

  return (
    <div className="h-screen overflow-hidden flex flex-col">
      {/* HEADER */}
      <header className="px-4 sm:px-8 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/dashboard")}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Back to Dashboard"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-2xl font-bold">Match History</h1>
        </div>

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
            <span className="text-xs text-gray-400">ELO: {user.elo || 300}</span>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6 p-4 sm:p-6">
          {/* LEFT: GAMES LIST */}
          <div className="flex flex-col gap-4 h-full overflow-hidden">
            {/* FILTERS & SEARCH */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <input
                type="text"
                placeholder="Search opponent..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-4 py-2 bg-white/5 backdrop-blur-xs border border-white/10 rounded-lg focus:outline-none focus:border-primary transition-colors text-sm"
              />
              
              <div className="flex gap-3">
              {/* Filter */}
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as FilterType)}
                className="px-4 py-2 bg-[#1a1a1a] backdrop-blur-xs w-full border border-white/10 rounded-lg focus:outline-none focus:border-primary transition-colors cursor-pointer text-sm text-white"
              >
                <option value="all" className="bg-[#1a1a1a] text-white">All Games</option>
                <option value="win" className="bg-[#1a1a1a] text-white">Wins</option>
                <option value="loss" className="bg-[#1a1a1a] text-white">Losses</option>
                <option value="draw" className="bg-[#1a1a1a] text-white">Draws</option>
              </select>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortType)}
                className="px-4 py-2 bg-[#1a1a1a] backdrop-blur-xs border w-full border-white/10 rounded-lg focus:outline-none focus:border-primary transition-colors cursor-pointer text-sm text-white"
              >
                <option value="recent" className="bg-[#1a1a1a] text-white">Most Recent</option>
                <option value="oldest" className="bg-[#1a1a1a] text-white">Oldest First</option>
                <option value="moves" className="bg-[#1a1a1a] text-white">Most Moves</option>
                <option value="rating" className="bg-[#1a1a1a] text-white">Highest Rating</option>
              </select>
              </div>
            </div>

            {/* GAMES LIST */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 min-h-0">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <p className="text-gray-400">Loading games...</p>
                </div>
              ) : filteredGames.length === 0 ? (
                <div className="flex items-center justify-center h-64">
                  <p className="text-gray-400">No games found</p>
                </div>
              ) : (
                paginatedGames.map((game, index) => (
                  <motion.div
                    key={game.gameId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className={`p-4 rounded-lg border backdrop-blur-xs transition-all cursor-pointer ${getResultColor(game.result)}`}
                    onClick={() => toast.info("Game review coming soon...")}
                  >
                    <div className="flex items-center justify-between">
                      {/* Left: Result & Opponent */}
                      <div className="flex items-center gap-3">
                        {getResultIcon(game.result)}
                        <div className="flex flex-col">
                          <span className="font-semibold">{game.opponentName}</span>
                          <span className="text-xs text-gray-400">
                            ELO: {game.opponentElo ?? "—"}
                          </span>
                        </div>
                      </div>

                      {/* Right: Game Info */}
                      <div className="flex items-center gap-6 text-sm">
                        <div className="hidden md:flex flex-col items-center">
                          <span className="text-xs text-gray-400">You Played</span>
                          <span className="capitalize">{game.playerColor}</span>
                        </div>
                        <div className="hidden md:flex flex-col items-center">
                          <span className="text-xs text-gray-400">Result</span>
                          <span className="capitalize font-medium">{game.result}</span>
                        </div>
                        <div className="hidden sm:flex flex-col items-center">
                          <span className="text-xs text-gray-400">Moves</span>
                          <span>{game.moves}</span>
                        </div>
                        <div className="flex flex-col items-end">
                          <Calendar size={14} className="text-gray-400 mb-1" />
                          <span className="text-xs text-gray-400">{game.date}</span>
                        </div>
                      </div>
                    </div>

                    {/* Mobile: Additional Info */}
                    <div className="md:hidden mt-3 pt-3 border-t border-white/10 flex justify-between text-xs text-gray-400">
                      <span>Played: {game.playerColor}</span>
                      <span>Moves: {game.moves}</span>
                      <span className="capitalize">{game.result}</span>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* PAGINATION */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between py-3 border-t border-white/10 flex-shrink-0">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 cursor-pointer rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-400">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 cursor-pointer rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  Next
                </button>
              </div>
            )}
          </div>

          {/* RIGHT: INSIGHTS */}
          <div className="hidden lg:flex flex-col gap-4 h-full overflow-hidden">
            <div className="bg-white/2 backdrop-blur-xs rounded-xl p-5 border border-white/10">
              <h2 className="text-lg font-bold mb-3">Statistics</h2>

              {/* Overall Stats */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white/5 rounded-lg p-2.5">
                  <p className="text-[10px] text-gray-400 mb-0.5">Total Games</p>
                  <p className="text-xl font-bold">{stats.totalGames}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-2.5">
                  <p className="text-[10px] text-gray-400 mb-0.5">Win Rate</p>
                  <p className="text-xl font-bold text-emerald-400">{stats.winRate}%</p>
                </div>
              </div>

              {/* W/L/D Breakdown */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Wins</span>
                  <span className="text-emerald-400 font-semibold">{stats.wins}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Losses</span>
                  <span className="text-red-400 font-semibold">{stats.losses}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Draws</span>
                  <span className="text-gray-400 font-semibold">{stats.draws}</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
                    style={{ width: `${stats.winRate}%` }}
                  />
                </div>
              </div>

              {/* Streaks */}
              <div className="space-y-3 mb-4">
                <div className="bg-white/5 rounded-lg p-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={16} className="text-primary" />
                    <span>Current {stats.type} Streak</span>
                  </div>
                  <span className="font-bold text-md">{stats.currentStreak}</span>
                </div>
                <div className="bg-white/5 rounded-lg p-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={16} className="text-amber-500" />
                    <span>Best {stats.type} Streak</span>
                  </div>
                  <span className="font-bold text-md">{stats.bestStreak}</span>
                </div>
              </div>

              {/* Game Insights - Condensed */}
              <div className="pt-3 border-t border-white/10">
                <h3 className="text-md font-semibold mb-2">Game Insights</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-white/5 rounded p-2">
                    <p className="text-gray-400 mb-1">Avg Moves</p>
                    <p className="font-semibold">{stats.avgMoves}</p>
                  </div>
                  <div className="bg-white/5 rounded p-2">
                    <p className="text-gray-400 mb-1">Longest</p>
                    <p className="font-semibold">
                      {games.length > 0 ? Math.max(...games.map((g) => g.moves)) : 0}
                    </p>
                  </div>
                  <div className="bg-white/5 rounded p-2">
                    <p className="text-gray-400 mb-1">Least Moves</p>
                    <p className="font-semibold">
                      {games.length > 0 ? Math.min(...games.map((g) => g.moves)) : 0}
                    </p>
                  </div>
                  <div className="bg-white/5 rounded p-2">
                    <p className="text-gray-400 mb-1">Winning Color</p>
                    <p className="font-semibold capitalize">
                      {games.filter((g) => g.playerColor === "white").length >=
                      games.filter((g) => g.playerColor === "black").length
                        ? "White"
                        : "Black"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
