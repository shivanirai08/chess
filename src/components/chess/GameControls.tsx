import Button from "@/components/ui/Button";

interface GameControlsProps {
  onChatToggle: () => void;
  onDrawOffer: () => void;
  onResign: () => void;
  gameCompleted: boolean;
}

export function GameControls({
  onChatToggle,
  onDrawOffer,
  onResign,
  gameCompleted,
}: GameControlsProps) {
  return (
    <div className="flex gap-2">
      <Button size="small" variant="secondary" onClick={onChatToggle}>
        Chat
      </Button>
      <Button size="small" variant="secondary" onClick={onDrawOffer}>
        Draw
      </Button>
      <Button
        size="small"
        variant="destructive"
        onClick={onResign}
        className="px-2 py-1"
        disabled={gameCompleted}
      >
        Resign
      </Button>
    </div>
  );
}
