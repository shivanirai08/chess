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
};

type UserStore = {
  user: User;
  opponent: Opponent | null;
  isLoading: boolean;
  setUser: (user: User) => void;
  setOpponent: (opponent: Opponent) => void;
  clearOpponent: () => void;
  clearUser: () => void;
};

// Zustand store with persistence
export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      user: { username: "You", avatar: "/avatar7.svg" },
      opponent: { username : "Opponent", avatar: "/avatar8.svg", userId: "", isGuest: true },
      isLoading: true,

      setUser: (user) => set({ user, isLoading: false }),
      setOpponent: (opponent) => set({ opponent }),
      clearOpponent: () => set({ opponent: { username : "Opponent", avatar: "/avatar8.svg", userId: "", isGuest: true } }),
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
