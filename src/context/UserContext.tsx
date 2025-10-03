"use client"
import { createContext, useContext, useState, ReactNode } from "react";

type User = { name:string; avatar:string};
type UserContextType = { user:User; setUser:(user:User)=> void; }

const UserContext = createContext<UserContextType | null>(null);
export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>({ name: "You", avatar: "/avatar7.svg" });
  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) throw new Error("useUser must be used within UserProvider");
  return context;
}