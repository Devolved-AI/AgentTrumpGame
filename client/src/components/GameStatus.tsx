import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useWeb3Store, formatEther } from "@/lib/web3";
import { Clock, User, Banknote } from "lucide-react";
import { SiEthereum } from "react-icons/si";
import { useQuery } from "@tanstack/react-query";

const fetchEthPrice = async () => {
  try {
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
    if (!response.ok) {
      console.log('ETH price API returned non-200 response, using fallback price');
      return 3000; // Fallback price
    }
    const data = await response.json();
    return data.ethereum.usd;
  } catch (error) {
    console.log('Error fetching ETH price, using fallback price:', error);
    return 3000; // Fallback price if API fails
  }
};

interface GameStatusProps {
  showPrizePoolOnly?: boolean;
  showTimeRemainingOnly?: boolean;
  showLastGuessOnly?: boolean;
  onTimerEnd?: () => void;
}

export function GameStatus({ showPrizePoolOnly, showTimeRemainingOnly, showLastGuessOnly, onTimerEnd }: GameStatusProps) {
  const { contract, isGameOver, isInEscalationPeriod, getEscalationTimeRemaining, prizePool, updatePrizePool } = useWeb3Store();
  const [status, setStatus] = useState({
    timeRemaining: 0,
    lastPlayer: "",
    totalBalance: "0",
    won: false,
    requiredAmount: "0.0018",
    lastGuessTimestamp: 0,
    isGameOver: false,
    inEscalationPeriod: false,
    escalationTimeRemaining: 0,
    escalationPeriod: 0
  });
  
  // Update local state with prize pool from Web3Store
  useEffect(() => {
    if (prizePool) {
      setStatus(prev => ({
        ...prev,
        totalBalance: prizePool
      }));
      console.log("Updated prize pool from Web3Store:", prizePool);
    }
  }, [prizePool]);
  const [displayTime, setDisplayTime] = useState(600); // 10 minutes in seconds (fixed game timer)
  const [baseTime, setBaseTime] = useState(600); // Match the 10-minute timer

  const { data: ethPrice } = useQuery({
    queryKey: ['ethPrice'],
    queryFn: fetchEthPrice,
    refetchInterval: 60000,
  });

  useEffect(() => {
    if (!contract) return;

    const initializeTime = async () => {
      try {
        const [timeRemaining, won, gameOver] = await Promise.all([
          contract.getTimeRemaining(),
          contract.gameWon(),
          isGameOver()
        ]);

        const time = Number(timeRemaining.toString());

        // Calculate the display time based on saved state or contract time
        let calculatedDisplayTime = 0;
        const savedState = localStorage.getItem('gameTimerState');

        // Cap the max time to 10 minutes (600 seconds) for this game
        const MAX_GAME_TIME = 600;
        // Cap the contract time to our max game time
        const cappedContractTime = Math.min(time, MAX_GAME_TIME);
        
        if (time > MAX_GAME_TIME) {
          console.log(`Contract returned ${time} seconds, capping to ${MAX_GAME_TIME} seconds`);
        }

        if (savedState) {
          try {
            const parsedState = JSON.parse(savedState);
            const { savedTime, timestamp } = parsedState;

            // Only use saved state if the saved time is greater than contract time
            // This ensures we don't reset progress when reconnecting
            const elapsedSeconds = Math.floor((Date.now() - timestamp) / 1000);
            const adjustedSavedTime = Math.max(0, savedTime - elapsedSeconds);

            if (adjustedSavedTime > cappedContractTime) {
              calculatedDisplayTime = Math.min(adjustedSavedTime, MAX_GAME_TIME);
              console.log("Using saved time (capped):", calculatedDisplayTime);
            } else {
              // If capped contract time is better, use that
              calculatedDisplayTime = cappedContractTime;
              console.log("Using capped contract time:", calculatedDisplayTime);
            }
          } catch (e) {
            // If parsing fails, use capped contract time
            calculatedDisplayTime = cappedContractTime;
            console.log("Using capped contract time (parsing error):", calculatedDisplayTime);
          }
        } else {
          // No saved state, use capped contract time
          calculatedDisplayTime = cappedContractTime;
          console.log("No saved state, using capped contract time:", calculatedDisplayTime);
        }

        // Make sure we have a valid time
        calculatedDisplayTime = Math.max(calculatedDisplayTime, 0);

        // Update status with new values from contract
        setStatus(prev => {
          const updatedStatus = {
            ...prev,
            timeRemaining: calculatedDisplayTime, // Use the calculated time for consistency
            isGameOver: gameOver,
            won: won
          };
          return updatedStatus;
        });

        // Update the display time
        setDisplayTime(calculatedDisplayTime);
      } catch (error) {
        console.error("Error fetching initial time:", error);
      }
    };

    initializeTime();
  }, [contract, isGameOver]);

  useEffect(() => {
    if (!contract) return;

    const updateStatus = async () => {
      try {
        // Update prize pool first, to ensure it's accurate
        await updatePrizePool();
        
        const [
          timeRemaining,
          lastPlayer,
          won,
          gameOver,
          requiredAmount,
          inEscalation,
          escalationTime,
          escalationPeriod
        ] = await Promise.all([
          contract.getTimeRemaining(),
          contract.lastPlayer(),
          contract.gameWon(),
          isGameOver(),
          contract.getCurrentRequiredAmount(),
          isInEscalationPeriod(),
          getEscalationTimeRemaining(),
          contract.getCurrentEscalationPeriod ? contract.getCurrentEscalationPeriod() : Promise.resolve(0)
        ]);
        
        // Enhanced conversion of lastPlayer to string with better object handling
        let lastPlayerAddress = '';
        
        try {
          if (typeof lastPlayer === 'string') {
            lastPlayerAddress = lastPlayer;
          } else if (lastPlayer && typeof lastPlayer === 'object') {
            const lastPlayerObj = lastPlayer as any; // Type assertion to bypass strict checking
            
            if (typeof lastPlayerObj.toString === 'function') {
              lastPlayerAddress = lastPlayerObj.toString();
            } else if (lastPlayerObj.address) {
              lastPlayerAddress = lastPlayerObj.address;
            } else {
              // Try to access address as a property (some contracts return structured data)
              const addressStr = JSON.stringify(lastPlayerObj);
              console.log("Last player object:", addressStr);
              lastPlayerAddress = addressStr;
            }
          }
        } catch (err) {
          console.error("Error processing lastPlayer address:", err);
          lastPlayerAddress = String(lastPlayer) || "Unknown address";
        }
        
        console.log("Processed lastPlayer to:", lastPlayerAddress);

        const time = Number(timeRemaining.toString());
        // Cap the time to 10 minutes
        const MAX_GAME_TIME = 600;
        const cappedTime = Math.min(time, MAX_GAME_TIME);
        
        if (time > MAX_GAME_TIME) {
          console.log(`Contract returned ${time} seconds, capping to ${MAX_GAME_TIME} seconds`);
        }

        // Add debug logging with safer toString handling
        console.log("GameStatus - Contract State:", {
          timeRemaining: time,
          cappedTimeRemaining: cappedTime,
          won,
          gameOver,
          lastPlayer,
          lastPlayerType: typeof lastPlayer,
          lastPlayerToString: lastPlayer ? String(lastPlayer) : null,
          // Now using prizePool from Web3Store
          prizePool
        });

        // Update the baseTime with capped value
        setBaseTime(cappedTime);

        // Calculate the escalation period number (1-10)
        const periodNumber = Number(escalationPeriod.toString());
        
        // Enhanced debug logging with escalation info
        console.log("GameStatus - Escalation Info:", {
          inEscalation,
          escalationTime: Number(escalationTime.toString()),
          escalationPeriod: periodNumber
        });
        
        setStatus(prev => ({
          ...prev,
          timeRemaining: cappedTime, // Use the capped time value
          lastPlayer: lastPlayerAddress, // Use the converted address
          // totalBalance is now updated via the prizePool useEffect
          won,
          isGameOver: gameOver,
          requiredAmount: formatEther(requiredAmount),
          inEscalationPeriod: inEscalation,
          escalationTimeRemaining: Number(escalationTime.toString()),
          escalationPeriod: periodNumber
        }));

      } catch (error) {
        console.error("Error fetching game status:", error);
      }
    };

    // More frequent updates of contract state (every 5 seconds)
    const statusInterval = setInterval(updateStatus, 5000);
    updateStatus();

    // Setup event listeners for both GuessSubmitted and Deposited events to update prize pool
    
    // Handle contract balance changes from guesses - use Web3Store updatePrizePool
    const handleGuessEvent = () => {
      console.log("GuessSubmitted event detected, updating prize pool");
      updatePrizePool();
    };

    // Handle contract balance changes from deposits - use Web3Store updatePrizePool
    const handleDepositEvent = () => {
      console.log("Deposited event detected, updating prize pool");
      updatePrizePool();
    };

    try {
      // Listen for GuessSubmitted events
      contract.on(
        contract.getEvent("GuessSubmitted"),
        handleGuessEvent
      );

      // Listen for Deposited events
      contract.on(
        contract.getEvent("Deposited"),
        handleDepositEvent
      );

      return () => {
        clearInterval(statusInterval);
        try {
          contract.removeListener(
            contract.getEvent("GuessSubmitted"),
            handleGuessEvent
          );
          contract.removeListener(
            contract.getEvent("Deposited"),
            handleDepositEvent
          );
        } catch (error) {
          console.error("Error removing event listeners:", error);
        }
      };
    } catch (error) {
      console.error("Error setting up event listeners:", error);
      return () => clearInterval(statusInterval);
    }
  }, [contract, updatePrizePool]);

  useEffect(() => {
    if (!contract) return;

    // Listener for GuessSubmitted that handles game state and last player updates
    const handleGuessEvent = async (
      player: any, // Using 'any' type for player to handle different contract return formats
      amount: any,
      multiplier: any,
      response: string,
      blockNumber: any,
      responseIndex: any
    ) => {
      try {
        // Get the updated time remaining from the contract
        const timeRemaining = await contract.getTimeRemaining();
        const time = Number(timeRemaining.toString());
        
        // Cap the time to 10 minutes for this game
        const MAX_GAME_TIME = 600;
        const cappedTime = Math.min(time, MAX_GAME_TIME);
        
        if (time > MAX_GAME_TIME) {
          console.log(`GuessEvent: Contract returned ${time} seconds, capping to ${MAX_GAME_TIME} seconds`);
        }
        
        // Update the prize pool using the centralized Web3Store method
        await updatePrizePool();

        // Process player address with simple type assertions to avoid TypeScript errors
        let processedAddress = '';
        
        try {
          if (typeof player === 'string') {
            processedAddress = player;
          } else if (player && typeof player === 'object') {
            const playerObj = player as any; // Type assertion to bypass strict type checking
            
            if (typeof playerObj.toString === 'function') {
              processedAddress = playerObj.toString();
            } else if (playerObj.address) {
              processedAddress = playerObj.address;
            } else {
              processedAddress = JSON.stringify(playerObj);
            }
          }
        } catch (err) {
          console.error("Error processing player address:", err);
          processedAddress = String(player) || "Unknown address";
        }
        
        console.log("Processed player address to:", processedAddress);
        
        // Save the game state to localStorage with the last block number
        const gameState = {
          lastPlayer: processedAddress,
          lastBlock: blockNumber ? blockNumber.toString() : "Unknown block",
          lastTimestamp: Date.now(),
          timeRemaining: cappedTime // Use the capped time value
        };
        
        localStorage.setItem('gameState', JSON.stringify(gameState));
        console.log("Saved game state to localStorage:", gameState);
        
        // Update all relevant state in one go
        setStatus(prev => ({
          ...prev,
          lastGuessTimestamp: Date.now(),
          lastPlayer: processedAddress,
          lastBlock: blockNumber ? blockNumber.toString() : "Unknown block",
          timeRemaining: time,
          // Prize pool is updated via the prizePool useEffect
        }));
        
        console.log("Updated status after guess event:", {
          player,
          timeRemaining: time,
          prizePool // Use the Web3Store prize pool value
        });
      } catch (error) {
        console.error("Error updating state after guess:", error);
      }
    };

    try {
      // Listen for GuessSubmitted events with a unique named handler
      contract.on(
        contract.getEvent("GuessSubmitted"),
        handleGuessEvent
      );

      return () => {
        try {
          // Clean up event listener
          contract.removeListener(
            contract.getEvent("GuessSubmitted"),
            handleGuessEvent
          );
        } catch (error) {
          console.error("Error removing event listener:", error);
        }
      };
    } catch (error) {
      console.error("Error setting up game state event listener:", error);
    }
  }, [contract, updatePrizePool]);

  useEffect(() => {
    if (status.isGameOver) return;

    // Set up a single timer for consistent countdown
    const timer = setInterval(() => {
      setDisplayTime(prev => {
        const newTime = Math.max(0, prev - 1);

        // Save timer state to localStorage for persistence across reconnects
        localStorage.setItem('gameTimerState', JSON.stringify({
          savedTime: newTime,
          timestamp: Date.now(),
          inEscalation: status.inEscalationPeriod,
          escalationPeriod: status.escalationPeriod
        }));

        // When timer reaches zero, end the game for everyone
        if (newTime <= 0) {
          console.log("Timer reached zero, game over for everyone");
          
          // Set game over state
          setStatus(prev => ({ 
            ...prev, 
            isGameOver: true
          }));

          // Clear the timer
          clearInterval(timer);
          
          // Trigger the game over callback
          if (onTimerEnd) {
            console.log("Calling onTimerEnd callback");
            onTimerEnd();
          }

          // Create and dispatch a custom game-over event
          const gameOverEvent = new CustomEvent('game-over');
          document.dispatchEvent(gameOverEvent);
          window.dispatchEvent(gameOverEvent);
          console.log("Dispatched game-over event");
          
          return 0;
        }

        return newTime;
      });

      // Update baseTime in sync with displayTime
      setBaseTime(prev => {
        const newTime = Math.max(0, prev - 1);
        return newTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [status, contract, onTimerEnd]);

  const usdValue = ethPrice ? (parseFloat(status.totalBalance) * ethPrice).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD'
  }) : '...';

  const hours = Math.floor(displayTime / 3600);
  const minutes = Math.floor((displayTime % 3600) / 60);
  const seconds = displayTime % 60;
  const isNearEnd = displayTime <= 120; // 2 minutes remaining
  
  // Make sure the text is clearly red when near the end
  const textColorClass = status.isGameOver 
    ? 'text-red-600 font-bold' 
    : (isNearEnd 
      ? 'text-red-500' 
      : 'text-black dark:text-white');

  if (showPrizePoolOnly) {
    return (
      <Card className="border-green-500 h-48 flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center justify-center gap-2 text-green-500 text-2xl">
            <Banknote className="h-7 w-7" />
            Prize Pool
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col justify-center items-center">
          <div className="flex flex-col gap-2 items-center">
            <div className="text-4xl font-bold text-green-500 flex items-center gap-2">
              <SiEthereum className="h-8 w-8" /> {status.totalBalance}
            </div>
            <div className="text-xl text-muted-foreground font-bold">
              {usdValue}
            </div>
          </div>
          {status.won && (
            <div className="text-green-500 mt-2 text-xl">Game Won!</div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (showTimeRemainingOnly) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${textColorClass}`}>
            <Clock className="h-5 w-5" />
            {status.isGameOver ? 'GAME OVER' : (status.inEscalationPeriod ? 'ESCALATION PERIOD' : 'Time Remaining')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!status.isGameOver ? (
            <>
              <div className={`text-2xl font-bold ${textColorClass}`}>
                {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
              </div>
              
              {status.inEscalationPeriod ? (
                <>
                  <div className="mt-2 text-sm text-amber-500 font-bold">
                    Escalation Period {status.escalationPeriod}/10
                  </div>
                  <Progress
                    value={(displayTime / 300) * 100} // 5 minutes for escalation period
                    className={`mt-2 bg-amber-100 ${status.escalationPeriod > 5 ? 'bg-red-100' : ''}`}
                  />
                </>
              ) : (
                <>
                  <Progress
                    value={(displayTime / 600) * 100} // 10 minutes for main period
                    className={`mt-2 ${isNearEnd ? 'bg-red-200' : ''}`}
                  />
                  {isNearEnd ? (
                    <div className="mt-2 text-sm text-red-500">
                      Game ending soon!
                    </div>
                  ) : null}
                </>
              )}
            </>
          ) : (
            <div className="text-2xl font-bold text-red-500">
              GAME OVER
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (showLastGuessOnly) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Last Guess Address
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm font-mono break-all">
            {status.lastPlayer || "No guesses yet"}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${textColorClass}`}>
            <Clock className="h-5 w-5" />
            {status.isGameOver ? 'GAME OVER' : (status.inEscalationPeriod ? 'ESCALATION PERIOD' : 'Time Remaining')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!status.isGameOver ? (
            <>
              <div className={`text-3xl font-bold ${textColorClass}`}>
                {hours > 0 ? `${hours}:` : ''}{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
              </div>
              
              {status.inEscalationPeriod ? (
                <div className="mt-2 text-sm text-amber-500 font-bold">
                  Escalation Period {status.escalationPeriod}/10
                  <div className="text-xs mt-1">
                    Entry cost: {status.requiredAmount} ETH
                  </div>
                </div>
              ) : isNearEnd ? (
                <div className="mt-2 text-sm text-red-500">
                  Game ending soon!
                </div>
              ) : null}
              
              {status.inEscalationPeriod && (
                <Progress
                  value={(displayTime / 300) * 100} // 5 minutes for escalation period
                  className={`mt-2 bg-amber-100 ${status.escalationPeriod > 5 ? 'bg-red-100' : ''}`}
                />
              )}
              
              {!status.inEscalationPeriod && (
                <Progress
                  value={(displayTime / 600) * 100} // 10 minutes for main period
                  className={`mt-2 ${isNearEnd ? 'bg-red-200' : ''}`}
                />
              )}
            </>
          ) : (
            <div className="text-2xl font-bold text-red-500">
              GAME OVER
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-green-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-500">
            <Banknote className="h-5 w-5" />
            Prize Pool
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-1">
            <div className="text-2xl font-bold text-green-500 flex items-center gap-2">
              <SiEthereum className="h-5 w-5" /> {status.totalBalance}
            </div>
            <div className="text-sm text-muted-foreground font-bold">
              {usdValue}
            </div>
          </div>
          {status.won && (
            <div className="text-green-500 mt-2">Game Won!</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Last Guess Address
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm font-mono break-all">
            {status.lastPlayer || "No guesses yet"}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}