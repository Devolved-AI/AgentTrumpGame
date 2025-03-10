import { Dialog, DialogPortal, DialogOverlay } from "@/components/ui/dialog";
import { useWeb3Store } from "@/lib/web3";
import { useEffect, useState, forwardRef } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";

// Custom DialogContent without a close button
const DialogContent = forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
        className
      )}
      {...props}
    >
      {children}
      {/* No close button here */}
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = "DialogContent";

interface GameOverInfo {
  lastGuessAddress: string;
  lastBlock: string;
  winner?: string;
}

export function GameOverDialog() {
  const { contract, address, isGameOver } = useWeb3Store();
  const [open, setOpen] = useState(false);
  // Try to get saved block number from localStorage
  const savedFinalBlock = localStorage.getItem('finalGameBlock');
  
  const [gameInfo, setGameInfo] = useState<GameOverInfo>({
    lastGuessAddress: address || "Loading address...",
    lastBlock: savedFinalBlock || "Loading block information...",
    winner: undefined
  });

  // Function to fetch game over info and show the dialog
  const fetchGameOverInfo = async (winnerAddress?: string) => {
    if (!contract) return;

    try {
      console.log("Fetching game over info...");
      
      // Set initial loading state to show something is happening
      setGameInfo(prev => ({
        ...prev,
        lastBlock: "Loading block information..."
      }));
      
      // Fetch game over info immediately from contract
      // We specifically need lastGuessBlock which is the exact block that ended the game
      const [lastPlayer, block, gameWon] = await Promise.all([
        contract.lastPlayer(),
        contract.lastGuessBlock(),
        contract.gameWon()
      ]);
      
      console.log("Contract data retrieved:", { 
        lastPlayer, 
        block: block ? block.toString() : "Unknown", 
        gameWon 
      });
      
      // Immediately update with the FINAL block information
      // This is the actual block of the last transaction that ended the game
      let finalBlock = "Block information unavailable";
      
      // Try multiple methods to get the block information
      // Method 1: From contract response
      if (block && block.toString() !== "0") {
        finalBlock = block.toString();
        console.log("Using block from contract:", finalBlock);
        // Store this final block number so it's consistent and doesn't keep updating
        localStorage.setItem('finalGameBlock', finalBlock);
      } else {
        // Method 2: Try to get from localStorage if previously stored
        const storedFinalBlock = localStorage.getItem('finalGameBlock');
        if (storedFinalBlock && storedFinalBlock !== "Block information unavailable") {
          finalBlock = storedFinalBlock;
          console.log("Using stored final block:", finalBlock);
        } else {
          // Method 3: Try to get the lastBlock from gameState in localStorage
          const gameState = localStorage.getItem('gameState');
          if (gameState) {
            try {
              const parsedState = JSON.parse(gameState);
              if (parsedState.lastBlock && parsedState.lastBlock !== "Unknown block") {
                finalBlock = parsedState.lastBlock;
                console.log("Using last block from game state:", finalBlock);
                // Store this for future use
                localStorage.setItem('finalGameBlock', finalBlock);
              }
            } catch (e) {
              console.error("Error parsing game state from localStorage:", e);
            }
          }
          
          // We no longer need to try to fetch the block number since we're not displaying it
          // Just using a placeholder value now
          if (finalBlock === "Block information unavailable") {
            finalBlock = "Final block";
            console.log("Using placeholder block value");
            localStorage.setItem('finalGameBlock', finalBlock);
          }
        }
      }
      
      setGameInfo(prev => ({
        ...prev,
        lastBlock: finalBlock
      }));
      
      // If there's a winner but it's not explicitly provided, try to find it
      let winner = winnerAddress;
      console.log("Initial winner from parameter:", winner);
      
      // Try to find the player with score 100 - most reliable approach
      try {
        console.log("Fetching all scores to find player with 100 points");
        const response = await fetch(`/api/persuasion/all`, {
          // Add cache busting to ensure we get fresh data
          headers: { 'pragma': 'no-cache', 'cache-control': 'no-cache' }
        });
        const data = await response.json();
        console.log("All player scores:", data);
        
        // Find the player with score 100
        const maxScorePlayer = Object.entries(data).find(([addr, scoreData]: [string, any]) => 
          scoreData.score >= 100
        );
        
        if (maxScorePlayer) {
          winner = maxScorePlayer[0];
          console.log("Found player with 100 score:", winner);
        }
      } catch (apiError) {
        console.warn("Error finding player with 100 score:", apiError);
      }
      
      // If we couldn't find a winner with 100 score, there probably isn't one
      if (!winner || winner === "0x0000000000000000000000000000000000000000") {
        winner = undefined; // No winner
        console.log("No winner found with 100 points");
      }
      
      // Only register a winner in the database if there actually is one
      if (winner) {
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
      }
      
      // Try to get additional information about the block
      let blockInfo = block ? block.toString() : "Block information unavailable";
      try {
        if (block) {
          // Get more blockchain info if available
          const provider = contract.runner?.provider;
          if (provider) {
            console.log("Fetching detailed block information for block:", block.toString());
            try {
              // Get actual block information if possible
              const blockData = await provider.getBlock(Number(block.toString()));
              if (blockData) {
                console.log("Block data retrieved:", blockData);
                // Format block info with extra details if available
                blockInfo = `${block.toString()} (${new Date(Number(blockData.timestamp) * 1000).toLocaleTimeString()})`;
              }
            } catch (blockError) {
              console.warn("Unable to fetch detailed block info:", blockError);
              // Continue with just the number
            }
          }
        }
      } catch (error) {
        console.warn("Error getting additional block information:", error);
      }
      
      // Update the game info state with winner and block data
      // Save the block info to localStorage to ensure it stays consistent
      localStorage.setItem('finalGameBlock', blockInfo);
      
      const gameInfoUpdate = {
        lastGuessAddress: lastPlayer || "Unknown",
        lastBlock: blockInfo,
        winner: winner 
      };
      
      setGameInfo(gameInfoUpdate);

      console.log("Final game info:", gameInfoUpdate);

      // Force the dialog to show
      setOpen(true);
    } catch (error) {
      console.error("Error fetching game over info:", error);
      
      // On error, try to get last player address from status component
      const gameState = localStorage.getItem('gameState');
      let lastPlayer = address;
      // Try to get the last block from localStorage
      let lastBlock = "";
      if (gameState) {
        try {
          const parsedState = JSON.parse(gameState);
          if (parsedState.lastBlock) {
            lastBlock = parsedState.lastBlock;
            console.log("Using last block from game state:", lastBlock);
          }
        } catch (e) {
          console.error("Error parsing game state from localStorage:", e);
        }
      }
      
      // Try to get the final game block from localStorage
      if (!lastBlock) {
        const finalGameBlock = localStorage.getItem('finalGameBlock');
        if (finalGameBlock) {
          lastBlock = finalGameBlock;
          console.log("Using stored final game block:", lastBlock);
        } else {
          lastBlock = "Block information unavailable";
          console.log("Using static block information message");
        }
      }

      // Try to get last player info from localStorage if available
      if (gameState) {
        try {
          const parsedState = JSON.parse(gameState);
          if (parsedState.lastPlayer) {
            lastPlayer = parsedState.lastPlayer;
            console.log("Using last player from game state:", lastPlayer);
          }
        } catch (e) {
          console.error("Error parsing game state from localStorage:", e);
        }
      }

      setGameInfo(prev => ({
        ...prev,
        lastBlock: lastBlock,
        lastGuessAddress: lastPlayer || address || "0x78C0B8846050fB80C2Cd5A8652f40661C798d0dE",
        // Don't set a winner unless we actually know there's a winner
        winner: undefined
      }));
      
      // Still show the dialog
      setOpen(true);
    }
  };

  // Listen for custom game-over event (from PersuasionScore component or timer)
  useEffect(() => {
    const handleGameOver = (event: CustomEvent<{winner?: string; reason?: string; timestamp?: number}>) => {
      console.log("Game over event received:", event.detail);
      
      // Check if this is a timer-expired event
      const isTimerExpired = event.detail.reason === 'timer-expired';
      
      if (isTimerExpired) {
        console.log("Game over due to timer expiration");
      }
      
      // Update game info with the winner address from the event (if there is one)
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
      
      // Also fetch additional info from the contract, passing the winner address if available
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
        className="bg-black/95 text-white border-gray-800" 
        onInteractOutside={(e) => { e.preventDefault(); }}
        onEscapeKeyDown={(e) => { e.preventDefault(); }}
      >
        <div className="flex flex-col items-center space-y-4 p-4 text-center">
          <h2 className="text-3xl font-bold">Game Over</h2>
          
          <p className="text-xl mb-2">
            Thanks for Playing
          </p>

          <div className="space-y-6 w-full text-center">
            {gameInfo.winner && (
              <div className="bg-green-900 p-4 rounded-md">
                <p className="font-semibold mb-1 text-green-400">Winner:</p>
                <p className="font-mono break-all">{gameInfo.winner}</p>
                <p className="text-sm mt-2 text-green-300">
                  This player persuaded Agent Trump with a perfect score of 100/100!
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}