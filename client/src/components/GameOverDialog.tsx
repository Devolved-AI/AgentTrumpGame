import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useWeb3Store } from "@/lib/web3";
import { useEffect, useState } from "react";

interface GameOverInfo {
  lastGuessAddress: string;
  winnerAddress: string;
  lastBlock: string;
}

export function GameOverDialog() {
  const { contract, isGameOver } = useWeb3Store();
  const [open, setOpen] = useState(false);
  const [gameInfo, setGameInfo] = useState<GameOverInfo>({
    lastGuessAddress: "",
    winnerAddress: "",
    lastBlock: ""
  });

  // Check game over status periodically
  useEffect(() => {
    if (!contract) return;

    const checkGameStatus = async () => {
      try {
        const gameOver = await isGameOver();

        if (gameOver) {
          // Fetch game over info when game is detected as over
          const [lastPlayer, winner] = await Promise.all([
            contract.lastPlayer(),
            contract.winner()
          ]);

          const provider = contract.provider;
          const block = await provider.getBlock('latest');

          setGameInfo({
            lastGuessAddress: lastPlayer || "No last player",
            winnerAddress: winner || "No Winner",
            lastBlock: block ? block.number.toString() : "Unknown"
          });

          setOpen(true);
        }
      } catch (error) {
        console.error("Error checking game status:", error);
      }
    };

    // Check immediately and then every 10 seconds
    checkGameStatus();
    const interval = setInterval(checkGameStatus, 10000);

    return () => clearInterval(interval);
  }, [contract, isGameOver]);

  return (
    <Dialog open={open} onOpenChange={() => {}} modal>
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
              <p className="font-semibold mb-1">Winner Wallet Address:</p>
              <p className="font-mono break-all">{gameInfo.winnerAddress}</p>
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