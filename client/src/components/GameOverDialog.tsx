import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useWeb3Store } from "@/lib/web3";
import { useEffect, useState } from "react";
import { ethers } from "ethers";

interface GameOverInfo {
  lastGuessAddress: string;
  winnerAddress: string;
  lastBlock: string;
}

export function GameOverDialog() {
  const { contract, address } = useWeb3Store();
  const [open, setOpen] = useState(false);
  const [gameInfo, setGameInfo] = useState<GameOverInfo>({
    lastGuessAddress: "",
    winnerAddress: "",
    lastBlock: ""
  });

  // Check game over status when timer reaches zero
  useEffect(() => {
    if (!contract || !address) return;

    const checkGameStatus = async () => {
      try {
        // Get the time remaining
        const timeRemaining = await contract.getTimeRemaining();
        console.log("Time remaining:", timeRemaining.toString());

        // Only proceed if time has actually run out
        if (timeRemaining.toNumber() <= 0) {
          console.log("Timer expired, fetching game over info");
          // Fetch game over info when timer has reached zero
          const [lastPlayer, winner] = await Promise.all([
            contract.lastPlayer(),
            contract.winner()
          ]);

          // Get the provider and latest block
          const provider = new ethers.BrowserProvider(window.ethereum);
          const block = await provider.getBlock('latest');

          console.log("Setting game over info:", { lastPlayer, winner, blockNumber: block?.number });

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

    // Check immediately and then every 5 seconds
    checkGameStatus();
    const interval = setInterval(checkGameStatus, 5000);

    return () => clearInterval(interval);
  }, [contract, address]); // Dependencies include contract and address

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