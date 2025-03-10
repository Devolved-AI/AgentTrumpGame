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

// Escalation price table for each 5-minute interval
const ESCALATION_PRICES = [
  "0.0018", // First 5 minutes
  "0.0036", // Second 5 minutes
  "0.0072", // Third 5 minutes
  "0.0144", // Fourth 5 minutes
  "0.0288", // Fifth 5 minutes
  "0.0576", // Sixth 5 minutes
  "0.1152", // Seventh 5 minutes
  "0.2304", // Eighth 5 minutes
  "0.4608", // Ninth 5 minutes
  "0.9216"  // Tenth 5 minutes
];

export function GameStatus({ showPrizePoolOnly, showTimeRemainingOnly, showLastGuessOnly, onTimerEnd }: GameStatusProps) {
  const { contract, getEscalationPrice, isGameOver } = useWeb3Store();
  const [status, setStatus] = useState({
    timeRemaining: 0,
    lastPlayer: "",
    totalBalance: "0",
    won: false,
    isEscalation: false,
    requiredAmount: "0.0018",
    lastGuessTimestamp: 0,
    isGameOver: false,
    escalationInterval: 0, // Track which interval we're in (1-10)
    lastGuessInterval: 0, // Track the interval of the last guess
  });
  const [displayTime, setDisplayTime] = useState(180); // 3 minutes in seconds (custom timer for this game)
  const [baseTime, setBaseTime] = useState(180); // Match the 3-minute timer
  const [displayEscalationInterval, setDisplayEscalationInterval] = useState(0);


  const { data: ethPrice } = useQuery({
    queryKey: ['ethPrice'],
    queryFn: fetchEthPrice,
    refetchInterval: 60000,
  });

  useEffect(() => {
    if (!contract) return;

    const initializeTime = async () => {
      try {
        const [timeRemaining, escalationActive, won, gameOver] = await Promise.all([
          contract.getTimeRemaining(),
          contract.escalationActive(),
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
            const { savedTime, timestamp, wasEscalation } = parsedState;

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

        // If we're in escalation mode, ensure time doesn't exceed 5 minutes (300 seconds)
        if (escalationActive && calculatedDisplayTime > 300) {
          calculatedDisplayTime = 300;
        }

        // Make sure we have a valid time
        calculatedDisplayTime = Math.max(calculatedDisplayTime, 0);

        // Update status with new values from contract
        setStatus(prev => {
          const updatedStatus = {
            ...prev,
            isEscalation: escalationActive,
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
          escalationActive,
          gameOver,
          requiredAmount
        ] = await Promise.all([
          contract.getTimeRemaining(),
          contract.lastPlayer(),
          contract.getContractBalance(),
          contract.gameWon(),
          contract.escalationActive(),
          isGameOver(),
          getEscalationPrice()
        ]);

        const time = Number(timeRemaining.toString());

        // Add debug logging
        console.log("GameStatus - Contract State:", {
          timeRemaining: time,
          won,
          escalationActive,
          gameOver,
          lastPlayer,
          balance: formatEther(balance)
        });

        // Only update the baseTime if we're not in escalation mode
        if (!escalationActive) {
          setBaseTime(time);
        }

        setStatus(prev => {
          const newStatus = {
            ...prev,
            timeRemaining: time,
            lastPlayer,
            totalBalance: formatEther(balance),
            won,
            isEscalation: escalationActive,
            isGameOver: gameOver,
            requiredAmount: requiredAmount,
          };

          // If this is a transition to escalation mode, ensure we set the interval
          if (escalationActive && prev.escalationInterval === 0) {
            newStatus.escalationInterval = 1;
            newStatus.requiredAmount = ESCALATION_PRICES[0]; // Force the correct initial price
          }

          return newStatus;
        });

        // Only update displayTime in escalation mode if there's a significant difference
        // This prevents the timer from jumping around during updates
        if (escalationActive && Math.abs(displayTime - time) > 5 && time > 0 && time <= 300) {
          setDisplayTime(time);
        }

      } catch (error) {
        console.error("Error fetching game status:", error);
      }
    };

    // Reduce frequency of status updates to prevent timer disruption
    const statusInterval = setInterval(updateStatus, 30000);
    updateStatus();

    return () => clearInterval(statusInterval);
  }, [contract, displayTime]);

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
        const [timeRemaining, escalationActive] = await Promise.all([
          contract.getTimeRemaining(),
          contract.escalationActive()
        ]);

        const time = Number(timeRemaining.toString());

        // The timer is not reset when a guess is submitted during escalation mode
        // Each interval is exactly 5 minutes regardless of guesses
        if (escalationActive) {
          // Don't reset the timer but record that a guess was made in this interval
          setStatus(prev => {
            console.log(`Recording guess in interval ${prev.escalationInterval}`);
            return {
              ...prev,
              lastGuessTimestamp: Date.now(),
              lastPlayer: player,
              timeRemaining: time,
              lastGuessInterval: prev.escalationInterval // Track that a guess was made in current interval
            };
          });
        } else {
          // Not in escalation mode
          setStatus(prev => ({
            ...prev,
            lastGuessTimestamp: Date.now(),
            lastPlayer: player,
            timeRemaining: time
          }));
        }
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
      // Check escalation status directly from the contract for accurate state
      let escalationActive = false;
      if (contract) {
        // Use the status state value instead of trying to fetch it in the timer
        escalationActive = status.isEscalation;
        console.log(`Timer check - Contract escalation status: ${escalationActive}`);
      }

      setDisplayTime(prev => {
        const newTime = Math.max(0, prev - 1);

        // Save timer state to localStorage for persistence across reconnects
        localStorage.setItem('gameTimerState', JSON.stringify({
          savedTime: newTime,
          timestamp: Date.now(),
          wasEscalation: status.isEscalation
        }));

        if (newTime <= 0 && !status.isEscalation && !escalationActive) {
          // Main timer reached zero but not in escalation mode yet
          console.log("Main timer reached zero, checking for escalation transition");

          // Force transition to escalation mode
          setTimeout(() => {
            setStatus(prev => ({ 
              ...prev, 
              isEscalation: true,
              escalationInterval: 1,
              requiredAmount: ESCALATION_PRICES[0]
            }));

            // Reset display time for escalation period
            setDisplayTime(300);

            localStorage.setItem('escalationInterval', '1');
            localStorage.setItem('escalationPrice', ESCALATION_PRICES[0]);
            console.log("Forced escalation mode transition from timer check");
          }, 0);

          // Instead of immediately ending the game, trigger transition to escalation
          return 0;
        }

        return newTime;
      });

      // Only update baseTime if not in escalation mode
      if (!status.isEscalation && !escalationActive) {
        setBaseTime(prev => {
          const newTime = Math.max(0, prev - 1);

          // Critical point: When main timer reaches zero
          if (newTime === 0) {
            console.log("Base time reached zero, initializing escalation mode");
            console.log("Current status at timer zero:", { 
              isEscalation: status.isEscalation, 
              baseTime: prev,
              displayTime: displayTime,
              escalationActive: escalationActive
            });

            // Ensure we immediately enter escalation mode
            setTimeout(() => {
              // This is the key change - starting escalation mode when timer hits zero
              setStatus(prev => ({ 
                ...prev, 
                isEscalation: true, // Mark as escalation mode
                escalationInterval: 1, // First escalation interval
                requiredAmount: ESCALATION_PRICES[0] // Set to first escalation price
              }));

              // Reset display time to 5 minutes (300 seconds) for first escalation period
              setDisplayTime(300);

              // Store escalation state in localStorage for persistence
              localStorage.setItem('escalationInterval', '1');
              localStorage.setItem('escalationPrice', ESCALATION_PRICES[0]);
            }, 0);

            // Create and dispatch a custom event to notify other components
            const escalationEvent = new CustomEvent('escalation-started', {
              detail: { interval: 1, price: ESCALATION_PRICES[0] }
            });
            document.dispatchEvent(escalationEvent);
            console.log("Dispatched escalation-started event");

            // Don't end game or clear the timer - we're now in escalation mode
          }
          return newTime;
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [status, contract, onTimerEnd]);

  // This effect handles the initialization of escalation mode
  useEffect(() => {
    if (status.isEscalation && status.escalationInterval === 0) {
      // Check if we have saved escalation data
      const savedInterval = localStorage.getItem('escalationInterval');
      const savedPrice = localStorage.getItem('escalationPrice');

      // Calculate which interval we're in based on display time or use saved interval
      let currentInterval = 1;
      let currentPrice = ESCALATION_PRICES[0];

      if (savedInterval && savedPrice) {
        currentInterval = parseInt(savedInterval, 10);
        currentPrice = savedPrice;
        console.log(`Restoring saved escalation interval: ${currentInterval} with price: ${currentPrice}`);
      }

      setStatus(prev => ({
        ...prev, 
        requiredAmount: currentPrice,
        escalationInterval: currentInterval
      }));
      setDisplayEscalationInterval(currentInterval);

      // Update localStorage with current values
      localStorage.setItem('escalationInterval', currentInterval.toString());
      localStorage.setItem('escalationPrice', currentPrice);

      // We don't set displayTime here anymore as it's handled in the initialization effect
    }
  }, [status.isEscalation, status.escalationInterval]);

  // This effect handles the countdown check for escalation mode and interval transitions
  useEffect(() => {
    if (!status.isEscalation) return;

    // Check the timer for interval transitions or game end
    const checkInterval = setInterval(() => {
      if (displayTime <= 0) {
        console.log("Escalation timer reached zero, handling interval transition or game end");
        console.log("Current escalation state:", {
          isEscalation: status.isEscalation,
          interval: status.escalationInterval,
          lastGuess: status.lastGuessInterval
        });

        // Check if we had any guesses in the current interval
        if (status.lastGuessInterval !== status.escalationInterval) {
          // No guesses in this interval - end the game
          console.log("No guesses in current interval - ending game");
          setStatus(prev => ({...prev, isGameOver: true}));
          if (onTimerEnd) {
            console.log("Calling onTimerEnd callback from escalation interval end");
            onTimerEnd();
          }
          clearInterval(checkInterval);
        } else if (status.escalationInterval >= 10) {
          // We've completed all 10 intervals - end the game
          console.log("All 10 escalation intervals completed - ending game");
          setStatus(prev => ({...prev, isGameOver: true}));
          if (onTimerEnd) {
            console.log("Calling onTimerEnd callback from final escalation interval");
            onTimerEnd();
          }
          clearInterval(checkInterval);
        } else {
          // Move to the next escalation interval
          const nextInterval = status.escalationInterval + 1;
          const nextPrice = ESCALATION_PRICES[nextInterval - 1]; // Array is 0-indexed

          console.log(`Moving to escalation interval ${nextInterval} with price ${nextPrice}`);
          console.log(`Previous timer was: ${displayTime} seconds`);

          // Update the status with the new interval and price
          setStatus(prev => ({
            ...prev, 
            escalationInterval: nextInterval,
            requiredAmount: nextPrice
          }));
          setDisplayEscalationInterval(nextInterval);

          // Reset the timer for the new 5-minute interval
          setDisplayTime(300);
          console.log(`Timer reset to: 300 seconds for new escalation period`);

          // Update localStorage with current values for persistence
          localStorage.setItem('escalationInterval', nextInterval.toString());
          localStorage.setItem('escalationPrice', nextPrice);
          console.log(`Escalation data saved to localStorage: interval=${nextInterval}, price=${nextPrice}`);
        }
      }
    }, 1000);

    return () => clearInterval(checkInterval);
  }, [status.isEscalation, status.escalationInterval, status.lastGuessInterval, displayTime, onTimerEnd]);

  // Display the actual price from the contract without modifications
  useEffect(() => {
    if (status.isEscalation && status.escalationInterval > 0 && status.escalationInterval <= 10) {
      // Store the current interval and price in localStorage for other components to use
      localStorage.setItem('escalationInterval', status.escalationInterval.toString());
      localStorage.setItem('escalationPrice', status.requiredAmount);

      console.log(`Current escalation interval: ${status.escalationInterval}`);
      console.log(`Current required amount from contract: ${status.requiredAmount} ETH`);
    }
  }, [status.isEscalation, status.escalationInterval, status.requiredAmount]);

  const usdValue = ethPrice ? (parseFloat(status.totalBalance) * ethPrice).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD'
  }) : '...';

  const hours = Math.floor(displayTime / 3600);
  const minutes = Math.floor((displayTime % 3600) / 60);
  const seconds = displayTime % 60;
  const isNearEnd = !status.isEscalation && displayTime <= 120; // 2 minutes remaining
  // Make sure the text is clearly red during escalation mode or when near the end
  const textColorClass = status.isGameOver 
    ? 'text-red-600 font-bold' 
    : (status.isEscalation 
      ? 'text-red-600 font-bold' 
      : (isNearEnd 
        ? 'text-red-500' 
        : 'text-black dark:text-white'));

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
            {status.isGameOver ? 'GAME OVER' : (status.isEscalation ? 'Escalation Period' : 'Time Remaining')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!status.isGameOver ? (
            <>
              <div className={`text-2xl font-bold ${textColorClass}`}>
                {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
              </div>
              <Progress
                value={(displayTime / (status.isEscalation ? 300 : 1800)) * 100}
                className={`mt-2 ${status.isEscalation ? 'bg-red-300 h-2 [&>div]:bg-red-600' : isNearEnd ? 'bg-red-200' : ''}`}
              />
              {status.isEscalation ? (
                <div className="mt-2 text-sm text-red-500">
                  <div>Escalation Period {status.escalationInterval} of 10</div>
                  <div className="mt-1">
                    Base cost: {parseFloat(status.requiredAmount).toFixed(4)} ETH
                  </div>
                  <div className="mt-1 text-xs">
                    A 10% buffer will be added to ensure transaction success
                  </div>
                  <div className="mt-1 text-xs">
                    Each interval lasts exactly 5:00 minutes
                  </div>
                </div>
              ) : isNearEnd ? (
                <div className="mt-2 text-sm text-red-500">
                  Approaching Escalation Period
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
              {status.isEscalation ? (
                <div className="mt-2 text-sm text-red-500 font-bold">
                  ESCALATION PERIOD {displayEscalationInterval} of 10
                </div>
              ) : isNearEnd ? (
                <div className="mt-2 text-sm text-red-500">
                  Approaching Escalation Period
                </div>
              ) : null}
              {status.isEscalation && (
                <div className="mt-1 text-xs text-red-500">
                  Current Guess Fee: {status.requiredAmount} ETH
                </div>
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