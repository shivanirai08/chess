import { useState, useEffect } from "react";
import { useUserStore } from "@/store/useUserStore";
import {
  fetchGameSummaries,
  fetchWeeklyInsights,
  fetchPerformance,
  GameSummaryResponse,
} from "@/services/gameApi";

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

interface PerformanceData {
  format: string;
  played: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
}

interface WeeklyInsightsResponse {
  eloTrend: { days: string[]; ratings: number[] };
  breakdown: { days: string[]; wins: number[]; losses: number[]; draws: number[] };
}

interface StreakStatsResponse {
  currentStreak: number;
  longestStreak: number;
  type: "win" | "loss" | "draw" | null;
}

export function useDashboardData() {
  const { user, setUser } = useUserStore();
  const [games, setGames] = useState<TransformedGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [performanceLoading, setPerformanceLoading] = useState(true);
  const [weekData, setWeekData] = useState<WeeklyInsightsResponse | null>(null);
  const [streakStats, setStreakStats] = useState<StreakStatsResponse | null>(null);

  const formatShortDate = (iso: string) => {
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2, "0")}-${d.toLocaleString("en-US", { month: "short" })}`;
  };

  useEffect(() => {
    // Add abort controller to cancel requests on unmount
    const abortController = new AbortController();
    let isMounted = true;

    const loadData = async () => {
      // Don't fetch if no user ID (logged out)
      if (!user.id) {
        setLoading(false);
        setPerformanceLoading(false);
        return;
      }

      try {
        setLoading(true);
        setPerformanceLoading(true);
        const [summaries, insights, perf] = await Promise.all([
          fetchGameSummaries(),
          fetchWeeklyInsights(),
          fetchPerformance(),
        ]);

        // Only update state if component is still mounted
        if (!isMounted || abortController.signal.aborted) {
          return;
        }

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
        // Only log errors if not aborted (not logging out)
        if (!abortController.signal.aborted) {
          console.error("Failed to load dashboard data", err);
        }
        setGames([]);
        setPerformanceData([]);
      } finally {
        if (isMounted && !abortController.signal.aborted) {
          setLoading(false);
          setPerformanceLoading(false);
        }
      }
    };
    loadData();

    // Cleanup function
    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [user.id, setUser]); // Remove user.elo from dependencies to prevent loops

  return {
    games,
    loading,
    performanceData,
    performanceLoading,
    weekData,
    streakStats,
  };
}
