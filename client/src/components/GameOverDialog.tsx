import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useWeb3Store } from "@/lib/web3";
import { useEffect, useState } from "react";

interface GameOverInfo {
  lastGuessAddress: string;
  lastBlock: string;
  winner?: string;
}

export function GameOverDialog() {
  const { contract, address, isGameOver } = useWeb3Store();
  const [open, setOpen] = useState(false);
  const [gameInfo, setGameInfo] = useState<GameOverInfo>({
    lastGuessAddress: "",
    lastBlock: ""
  });

  // Function to fetch game over info and show the dialog
  const fetchGameOverInfo = async () => {
    if (!contract) return;

    try {
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
    } catch (error) {
      console.error("Error fetching game over info:", error);
    }
  };

  // Listen for custom game-over event (from PersuasionScore component)
  useEffect(() => {
    const handleGameOver = (event: CustomEvent<{winner: string}>) => {
      console.log("Game over event received, winner:", event.detail.winner);
      setGameInfo(prev => ({
        ...prev,
        winner: event.detail.winner
      }));
      
      // Show the dialog immediately
      setOpen(true);
      
      // Also fetch additional info from the contract
      fetchGameOverInfo();
    };

    window.addEventListener('game-over', handleGameOver as EventListener);
    
    return () => {
      window.removeEventListener('game-over', handleGameOver as EventListener);
    };
  }, []);

  // Regular polling to check game status (fallback method)
  useEffect(() => {
    if (!contract || !address) return;

    const checkGameStatus = async () => {
      try {
        // Get game state information
        const [gameWon, timeRemaining] = await Promise.all([
          contract.gameWon(),
          contract.getTimeRemaining()
        ]);

        const time = Number(timeRemaining.toString());
        const isOver = gameWon || time <= 0;

        if (isOver) {
          await fetchGameOverInfo();
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
  
  // Additional check using the isGameOver function from Web3Store
  useEffect(() => {
    if (!contract || !address) return;
    
    const checkGameState = async () => {
      try {
        const gameOver = await isGameOver();
        if (gameOver) {
          await fetchGameOverInfo();
        }
      } catch (error) {
        console.error("Error checking isGameOver:", error);
      }
    };
    
    const interval = setInterval(checkGameState, 2000);
    
    return () => clearInterval(interval);
  }, [contract, address, isGameOver]);

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
          
          {gameInfo.winner ? (
            <p className="text-xl mb-4 text-green-400">
              🏆 A player has reached 100/100 persuasion!
            </p>
          ) : (
            <p className="text-xl mb-4">
              {Number(gameInfo.lastBlock) > 0 ? "Time's up!" : "Thanks for Playing"}
            </p>
          )}

          <div className="space-y-6 w-full text-left">
            {gameInfo.winner && (
              <div className="bg-green-900 p-4 rounded-md">
                <p className="font-semibold mb-1 text-green-400">Winner:</p>
                <p className="font-mono break-all">{gameInfo.winner}</p>
                <p className="text-sm mt-2 text-green-300">
                  This player persuaded Agent Trump with a perfect score of 100/100!
                </p>
              </div>
            )}
            
            <div>
              <p className="font-semibold mb-1">Last Player:</p>
              <p className="font-mono break-all">{gameInfo.lastGuessAddress}</p>
            </div>

            <div>
              <p className="font-semibold mb-1">Last Block:</p>
              <p className="font-mono">{gameInfo.lastBlock}</p>
            </div>
            
            <p className="text-center mt-4 text-sm">
              The prize pool has been distributed to {gameInfo.winner ? "the winner" : "the last player"}.
              <br />
              Start a new game session to play again!
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}