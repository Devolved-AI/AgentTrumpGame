import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useWeb3Store } from "@/lib/web3";
import { useEffect, useState } from "react";

interface GameOverInfo {
  lastGuessAddress: string;
  lastBlock: string;
}

export function GameOverDialog() {
  const { contract, address } = useWeb3Store();
  const [open, setOpen] = useState(false);
  const [gameInfo, setGameInfo] = useState<GameOverInfo>({
    lastGuessAddress: "",
    lastBlock: ""
  });

  useEffect(() => {
    if (!contract || !address) return;

    const checkGameStatus = async () => {
      try {
        // Get game state information
        const timeRemaining = await contract.getTimeRemaining();
        const time = Number(timeRemaining.toString());
        
        // Contract's gameWon is a state variable, not a function
        const isOver = await contract.isGameOver() || time <= 0;

        if (isOver) {
          // Fetch game over info immediately
          const [lastPlayer, block] = await Promise.all([
            contract.lastPlayer(),
            contract.lastGuessBlock()
          ]);

          setGameInfo({
            lastGuessAddress: lastPlayer || "No last player",
            lastBlock: block ? block.toString() : "Unknown"
          });

          // Force the dialog to show
          setOpen(true);
        }
      } catch (error) {
        console.error("Error checking game status:", error);
      }
    };

    // Check immediately and then every second to ensure we catch the game over state quickly
    checkGameStatus();
    const interval = setInterval(checkGameStatus, 1000);

    return () => clearInterval(interval);
  }, [contract, address]);

  return (
    <Dialog 
      open={open} 
      onOpenChange={() => {}}
      modal={true}
    >
      <DialogContent 
        className="bg-black text-white border-white" 
        onInteractOutside={(e) => { e.preventDefault(); }}
        onEscapeKeyDown={(e) => { e.preventDefault(); }}
      >
        <div className="flex flex-col items-center space-y-6 p-6 text-center">
          <h2 className="text-4xl font-bold mb-4">Game Over</h2>
          <p className="text-xl mb-8">Thanks for Playing</p>

          <div className="space-y-4 w-full text-left">
            <div>
              <p className="font-semibold mb-1">Last Guess Wallet Address:</p>
              <p className="font-mono break-all">{gameInfo.lastGuessAddress}</p>
            </div>

            <div>
              <p className="font-semibold mb-1">Last Block:</p>
              <p className="font-mono">{gameInfo.lastBlock}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}