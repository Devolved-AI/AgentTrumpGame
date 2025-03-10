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
  const { contract, isGameOver } = useWeb3Store();
  const [status, setStatus] = useState({
    timeRemaining: 0,
    lastPlayer: "",
    totalBalance: "0",
    won: false,
    requiredAmount: "0.0018",
    lastGuessTimestamp: 0,
    isGameOver: false
  });
  const [displayTime, setDisplayTime] = useState(180); // 3 minutes in seconds (custom timer for this game)
  const [baseTime, setBaseTime] = useState(180); // Match the 3-minute timer

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

        if (savedState) {
          try {
            const parsedState = JSON.parse(savedState);
            const { savedTime, timestamp } = parsedState;

            // Only use saved state if the saved time is greater than contract time
            // This ensures we don't reset progress when reconnecting
            const elapsedSeconds = Math.floor((Date.now() - timestamp) / 1000);
            const adjustedSavedTime = Math.max(0, savedTime - elapsedSeconds);

            if (adjustedSavedTime > time) {
              calculatedDisplayTime = adjustedSavedTime;
              console.log("Using saved time:", calculatedDisplayTime);
            } else {
              // If contract time is better, use that (handles case where server might have
              // a more accurate timer than what was stored locally)
              calculatedDisplayTime = time;
              console.log("Using contract time (better than saved):", calculatedDisplayTime);
            }
          } catch (e) {
            // If parsing fails, use contract time
            calculatedDisplayTime = time;
            console.log("Using contract time (parsing error):", calculatedDisplayTime);
          }
        } else {
          // No saved state, use contract time
          calculatedDisplayTime = time;
          console.log("No saved state, using contract time:", calculatedDisplayTime);
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
        const [
          timeRemaining,
          lastPlayer,
          balance,
          won,
          gameOver,
          requiredAmount
        ] = await Promise.all([
          contract.getTimeRemaining(),
          contract.lastPlayer(),
          contract.getContractBalance(),
          contract.gameWon(),
          isGameOver(),
          contract.getCurrentRequiredAmount()
        ]);

        const time = Number(timeRemaining.toString());

        // Add debug logging
        console.log("GameStatus - Contract State:", {
          timeRemaining: time,
          won,
          gameOver,
          lastPlayer,
          balance: formatEther(balance)
        });

        // Update the baseTime
        setBaseTime(time);

        setStatus(prev => ({
          ...prev,
          timeRemaining: time,
          lastPlayer,
          totalBalance: formatEther(balance),
          won,
          isGameOver: gameOver,
          requiredAmount: formatEther(requiredAmount),
        }));

      } catch (error) {
        console.error("Error fetching game status:", error);
      }
    };

    // Reduce frequency of status updates to prevent timer disruption
    const statusInterval = setInterval(updateStatus, 30000);
    updateStatus();

    return () => clearInterval(statusInterval);
  }, [contract]);

  useEffect(() => {
    if (!contract) return;

    const handleGuessSubmitted = async (
      player: string,
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

        // Save the game state to localStorage with the last block number
        const gameState = {
          lastPlayer: player,
          lastBlock: blockNumber ? blockNumber.toString() : "Unknown block",
          lastTimestamp: Date.now(),
          timeRemaining: time
        };
        
        localStorage.setItem('gameState', JSON.stringify(gameState));
        console.log("Saved game state to localStorage:", gameState);
        
        // Not in escalation mode
        setStatus(prev => ({
          ...prev,
          lastGuessTimestamp: Date.now(),
          lastPlayer: player,
          lastBlock: blockNumber ? blockNumber.toString() : "Unknown block",
          timeRemaining: time
        }));
      } catch (error) {
        console.error("Error updating timer after guess:", error);
      }
    };

    try {
      // Use contract.on with the event name directly
      contract.on(
        contract.getEvent("GuessSubmitted"),
        handleGuessSubmitted
      );

      return () => {
        try {
          contract.removeListener(
            contract.getEvent("GuessSubmitted"),
            handleGuessSubmitted
          );
        } catch (error) {
          console.error("Error removing event listener:", error);
        }
      };
    } catch (error) {
      console.error("Error setting up event listener:", error);
    }
  }, [contract]);

  useEffect(() => {
    if (status.isGameOver) return;

    // Set up a single timer for consistent countdown
    const timer = setInterval(() => {
      setDisplayTime(prev => {
        const newTime = Math.max(0, prev - 1);

        // Save timer state to localStorage for persistence across reconnects
        localStorage.setItem('gameTimerState', JSON.stringify({
          savedTime: newTime,
          timestamp: Date.now()
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
            {status.isGameOver ? 'GAME OVER' : 'Time Remaining'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!status.isGameOver ? (
            <>
              <div className={`text-2xl font-bold ${textColorClass}`}>
                {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
              </div>
              <Progress
                value={(displayTime / 180) * 100}
                className={`mt-2 ${isNearEnd ? 'bg-red-200' : ''}`}
              />
              {isNearEnd ? (
                <div className="mt-2 text-sm text-red-500">
                  Game ending soon!
                </div>
              ) : null}
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
            {status.isGameOver ? 'GAME OVER' : 'Time Remaining'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!status.isGameOver ? (
            <>
              <div className={`text-3xl font-bold ${textColorClass}`}>
                {hours > 0 ? `${hours}:` : ''}{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
              </div>
              {isNearEnd ? (
                <div className="mt-2 text-sm text-red-500">
                  Game ending soon!
                </div>
              ) : null}
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