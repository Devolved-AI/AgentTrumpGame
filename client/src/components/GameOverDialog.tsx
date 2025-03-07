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
  const fetchGameOverInfo = async (winnerAddress?: string) => {
    if (!contract) return;

    try {
      // Fetch game over info immediately
      const [lastPlayer, block, gameWon] = await Promise.all([
        contract.lastPlayer(),
        contract.lastGuessBlock(),
        contract.gameWon()
      ]);
      
      // If there's a winner but it's not explicitly provided, try to find it
      let winner = winnerAddress;
      console.log("Initial winner from parameter:", winner);
      
      // If we still don't have a winner, check for any player with 100/100 score
      // This is the most reliable approach - looking for anyone with 100 points
      if (!winner || winner === address) {
        try {
          console.log("Fetching all scores to find winner with 100 points");
          // Get the API endpoint for all players
          const response = await fetch(`/api/persuasion/all`, {
            // Add cache busting to ensure we get fresh data
            headers: { 'pragma': 'no-cache', 'cache-control': 'no-cache' }
          });
          const data = await response.json();
          console.log("All player scores:", data);
          
          // Find the first player with score 100
          const maxScorePlayer = Object.entries(data).find(([addr, scoreData]: [string, any]) => 
            scoreData.score >= 100
          );
          
          if (maxScorePlayer) {
            winner = maxScorePlayer[0];
            console.log("Found winner from API with 100 score:", winner);
            
            // Check if we found ourselves as winner and game is won by someone else
            if (winner === address && gameWon && lastPlayer && lastPlayer !== address) {
              console.log("We found ourselves as winner but last player is different, using last player");
              winner = lastPlayer;
            }
            
            // Register the winner in our winners database
            try {
              await fetch('/api/winners', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address: winner })
              });
              console.log("Registered winner in database:", winner);
            } catch (regError) {
              console.warn("Error registering winner:", regError);
            }
          } else if (gameWon && lastPlayer) {
            // If game was won but no one has 100 score, use last player
            console.log("Game is won but no one has 100 score, using last player:", lastPlayer);
            winner = lastPlayer;
            
            // Also register this winner
            try {
              await fetch('/api/winners', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address: winner })
              });
              console.log("Registered last player as winner:", winner);
            } catch (regError) {
              console.warn("Error registering winner:", regError);
            }
          }
        } catch (apiError) {
          console.warn("Error finding winner from API:", apiError);
          
          // Fallback to last player if API fails
          if (gameWon && lastPlayer) {
            winner = lastPlayer;
            console.log("API error, falling back to last player:", lastPlayer);
            
            // Try to register this winner too
            try {
              await fetch('/api/winners', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address: winner })
              });
              console.log("Registered fallback winner:", winner);
            } catch (regError) {
              console.warn("Error registering winner:", regError);
            }
          }
        }
      }

      // If we don't have a winner address yet, and the game was won, use lastPlayer
      if (!winner && gameWon && lastPlayer) {
        winner = lastPlayer;
        console.log("Game was won, using last player as winner:", lastPlayer);
        
        // Register this fallback winner too
        try {
          await fetch('/api/winners', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address: winner })
          });
          console.log("Registered last player as winner (fallback):", winner);
        } catch (regError) {
          console.warn("Error registering fallback winner:", regError);
        }
      }
      
      // Update the game info state
      setGameInfo({
        lastGuessAddress: lastPlayer || "No last player",
        lastBlock: block ? block.toString() : "Unknown",
        winner: winner && winner !== "0x0000000000000000000000000000000000000000" ? winner : undefined
      });

      console.log("Final game info:", {
        lastGuessAddress: lastPlayer || "No last player",
        lastBlock: block ? block.toString() : "Unknown",
        winner: winner && winner !== "0x0000000000000000000000000000000000000000" ? winner : undefined
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
      
      // Update game info with the winner address from the event
      if (event.detail.winner) {
        // Add check to prevent setting our address as winner if it's not really the winner
        if (event.detail.winner !== address || event.detail.winner === address && event.detail.winner !== "0x0000000000000000000000000000000000000000") {
          setGameInfo(prev => ({
            ...prev,
            winner: event.detail.winner
          }));
          
          console.log("Updated game info with winner from event:", event.detail.winner);
        } else {
          console.log("Detected attempt to set our address as winner, will verify...");
        }
      }
      
      // Show the dialog immediately 
      setOpen(true);
      
      // Also fetch additional info from the contract, passing the winner address
      // This will verify the winner through multiple sources
      fetchGameOverInfo(event.detail.winner);
    };

    window.addEventListener('game-over', handleGameOver as EventListener);
    
    return () => {
      window.removeEventListener('game-over', handleGameOver as EventListener);
    };
  }, [address]);

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