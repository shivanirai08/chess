"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

type User = {
  elo?: number;
  id?: string;
  email?: string;
  username?: string;
  avatar?: string;
  guestId?: string | null;
};

type Opponent = {
  userId: string;
  username: string;
  avatar?: string;
  isGuest: boolean;
  elo?: number | null | undefined;
};

type UserStore = {
  user: User;
  opponent: Opponent | null;
  isLoading: boolean;
  setUser: (user: Partial<User>) => void;
  setOpponent: (opponent: Partial<Opponent>) => void;
  clearOpponent: () => void;
  clearUser: () => void;
};

// Zustand store with persistence
export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      user: { username: "You", avatar: "/avatar7.svg" },
      opponent: { username : "Opponent", avatar: "/avatar8.svg", userId: "", isGuest: true, elo: null },
      isLoading: true,

      setUser: (user) =>
        set((state) => ({
          user: { ...state.user, ...user },
          isLoading: false,
        })),
      setOpponent: (opponent) =>
        set((state) => {
          const mergedOpponent: Opponent = {
            userId: opponent.userId ?? state.opponent?.userId ?? "",
            username: opponent.username ?? state.opponent?.username ?? "Opponent",
            avatar: opponent.avatar ?? state.opponent?.avatar ?? "/avatar8.svg",
            isGuest: opponent.isGuest ?? state.opponent?.isGuest ?? true,
            elo: opponent.elo ?? state.opponent?.elo ?? null,
          };
          return { opponent: mergedOpponent };
        }),
      clearOpponent: () =>
        set({
          opponent: {
            username: "Opponent",
            avatar: "/avatar8.svg",
            userId: "",
            isGuest: true,
            elo: null,
          },
        }),
      clearUser: () => {
        localStorage.removeItem("user");
        localStorage.removeItem("user-store");
        set({ user: { username: "You", avatar: "/avatar7.svg", guestId : null }, opponent: null, isLoading: false });
      },
    }),
    {
      name: "user-store", // key for storage
      storage: createJSONStorage(() => localStorage || sessionStorage), 
    }
  )
);
