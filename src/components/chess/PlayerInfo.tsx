import Image from "next/image";

interface PlayerInfoProps {
  username: string;
  avatar: string;
  isCurrentPlayer?: boolean;
  isMyTurn: boolean;
  timeRemaining?: string;
  layout?: "horizontal" | "vertical";
}

export function PlayerInfo({
  username,
  avatar,
  isCurrentPlayer = false,
  isMyTurn,
  timeRemaining = "08:05",
  layout = "vertical",
}: PlayerInfoProps) {
  // Horizontal layout for desktop
  if (layout === "horizontal") {
    return null; // Desktop uses inline layout in page.tsx
  }

  // Vertical layout for mobile
  return (
    <div className="flex justify-between items-center gap-2 sm:gap-4">
      <div className="flex flex-col items-center gap-2">
        <div className="sm:h-16 sm:w-16 h-12 w-12">
          <Image
            src={avatar}
            alt={username}
            width={64}
            height={64}
            className="rounded-full sm:h-16 sm:w-16 h-12 w-12"
          />
        </div>
        <span className="text-sm sm:text-base">
          {username}
          {isCurrentPlayer && (
            <span className="text-gray-400 text-xs sm:text-sm ml-1">(you)</span>
          )}
        </span>
      </div>
      <span
        className={`px-2 py-1 rounded transition-all duration-300 text-sm sm:text-base ${
          isMyTurn
            ? "bg-primary text-black font-bold shadow-lg shadow-primary/50 animate-pulse"
            : "bg-zinc-900"
        }`}
      >
        {timeRemaining}
      </span>
    </div>
  );
}
