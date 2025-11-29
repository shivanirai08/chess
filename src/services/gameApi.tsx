import Cookies from "js-cookie";
import { toast } from "sonner";

// Get authentication token from cookies
export const getToken = () => {
  if (typeof window === "undefined") return null;
  try {
    return Cookies.get("auth-token") || null;
  } catch {
    return null;
  }
};

//Fetch game state from the server
export const fetchGameState = async (gameId: string, guestId?: string) => {
  const token = getToken();
  if (!token && !guestId) {
    toast.error("Authentication required");
    return null;
  }

  try {
    let response;
    if (token) {
      response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/game/${gameId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
    } else if (guestId) {
      response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/game/${gameId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }
    if (!response?.ok) {
      if (response?.status === 404) {
        toast.error("Game not found");
      } else {
        toast.error("Failed to fetch game state");
      }
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching game state:", error);
    toast.error("Network error while fetching game");
    return null;
  }
};

// Resign from the current game
export const resignGame = async (gameId: string, guestId?: string) => {
  const token = getToken();

  // Support both authenticated users and guests
  if (!token && !guestId) {
    toast.error("Authentication required");
    return null;
  }

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Add auth token for authenticated users
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/game/${gameId}/resign`,
      {
        method: "POST",
        headers,
        body: guestId && !token ? JSON.stringify({ guestId }) : undefined,
      }
    );

    if (!response.ok) {
      if (response.status === 400) {
        toast.error("Cannot resign from this game");
      } else if (response.status === 404) {
        toast.error("Game not found");
      } else {
        toast.error("Failed to resign");
      }
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error resigning:", error);
    toast.error("Network error while resigning");
    return null;
  }
};

// Get game ID from current URL path
export const getGameIdFromPath = () => {
  if (typeof window === "undefined") return null;
  const parts = window.location.pathname.split("/").filter(Boolean);
  return parts.length ? parts[parts.length - 1] : null;
};
