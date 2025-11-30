import Button from "@/components/ui/Button";
import { X } from "lucide-react";

interface DrawOfferDialogProps {
  isOpen: boolean;
  isOffering: boolean; // true if this user is offering, false if receiving offer
  opponentName: string;
  onAccept: () => void;
  onDecline: () => void;
  onCancel?: () => void; // for canceling your own offer
}

export function DrawOfferDialog({
  isOpen,
  isOffering,
  opponentName,
  onAccept,
  onDecline,
  onCancel,
}: DrawOfferDialogProps) {
  if (!isOpen) return null;

  const handleClose = () => {
    if (isOffering) {
      onCancel?.();
    } else {
      onDecline();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-zinc-900/95 rounded-lg p-6 max-w-md w-full mx-4 border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.6)] relative">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-white/50 hover:text-white transition"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {isOffering ? (
          <>
            <h2 className="text-xl font-bold mb-3 pr-8">Draw Offer Sent</h2>
            <p className="text-gray-300 mb-6">
              Waiting for {opponentName} to respond to your draw offer...
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                onClick={onCancel}
                variant="secondary"
                className="flex-1"
              >
                Cancel Offer
              </Button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-xl font-bold mb-3 pr-8">Draw Offer</h2>
            <p className="text-gray-300 mb-6">
              {opponentName} has offered a draw. Do you accept?
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                onClick={onDecline}
                variant="secondary"
                className="flex-1"
              >
                Decline
              </Button>
              <Button
                onClick={onAccept}
                variant="primary"
                className="flex-1"
              >
                Accept Draw
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
