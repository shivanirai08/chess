"use client"
import { createContext, useContext, useState, ReactNode, useEffect } from "react";

type User = { username:string; avatar:string; id?: string };
type UserContextType = { 
  user: User; 
  setUser: (user: User) => void;
  isLoading: boolean;
}

const UserContext = createContext<UserContextType>({
  user: { username: "You", avatar: "/avatar7.svg" },
  setUser: () => {},
  isLoading: true
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>({ username: "You", avatar: "/avatar7.svg" });
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Only run on client side
    if (typeof window === "undefined") return;
    
    try {
      const storedUser = localStorage.getItem("user") || sessionStorage.getItem("user");
      if (storedUser) {
        setUser(JSON.parse(storedUser));
        setUser((prevUser) => ({ ...prevUser, avatar: '/avatar7.svg' }));
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <UserContext.Provider value={{ user, setUser, isLoading }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) throw new Error("useUser must be used within UserProvider");
  return context;
}