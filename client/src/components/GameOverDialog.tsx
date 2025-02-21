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
        const [gameWon, timeRemaining] = await Promise.all([
          contract.gameWon(),
          contract.getTimeRemaining()
        ]);

        const isOver = gameWon || timeRemaining.toNumber() <= 0;
        console.log("Game over status:", isOver, "Game won:", gameWon);

        if (isOver) {
          console.log("Game is over, fetching final info");
          // Fetch game over info
          const lastPlayer = await contract.lastPlayer();
          const block = await contract.lastGuessBlock();

          console.log("Setting game over info:", { lastPlayer, blockNumber: block });

          setGameInfo({
            lastGuessAddress: lastPlayer || (gameWon ? address : "No last player"),
            lastBlock: block ? block.toString() : "Unknown"
          });

          setOpen(true);
        }
      } catch (error) {
        console.error("Error checking game status:", error);
      }
    };

    // Check immediately and then every 2 seconds
    checkGameStatus();
    const interval = setInterval(checkGameStatus, 2000);

    return () => clearInterval(interval);
  }, [contract, address]);

  return (
    <Dialog open={open} onOpenChange={() => {}} modal>
      <DialogContent 
        className="bg-black text-white border-white" 
        onInteractOutside={(e) => { e.preventDefault(); }}
        onEscapeKeyDown={(e) => { e.preventDefault(); }}
      >
        <div className="flex flex-col items-center space-y-6 p-6 text-center">
          <h2 className="text-4xl font-bold mb-4">Game Over</h2>
          <p className="text-xl mb-8">
            {gameInfo.lastGuessAddress === address ? "Congratulations! You've won!" : "Thanks for Playing"}
          </p>

          <div className="space-y-4 w-full text-left">
            <div>
              <p className="font-semibold mb-1">Winner Address:</p>
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