import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useWeb3Store, formatEther } from "@/lib/web3";
import { Clock, User, Banknote } from "lucide-react";
import { SiEthereum } from "react-icons/si";
import { useQuery } from "@tanstack/react-query";

const fetchEthPrice = async () => {
  const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
  const data = await response.json();
  return data.ethereum.usd;
};

interface GameStatusProps {
  showPrizePoolOnly?: boolean;
  showTimeRemainingOnly?: boolean;
  showLastGuessOnly?: boolean;
  onTimerEnd?: () => void;
}

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
    escalationInterval: 0, // Initialize escalationInterval
    lastGuessInterval: 0, // Initialize lastGuessInterval
  });
  const [displayTime, setDisplayTime] = useState(300);
  const [baseTime, setBaseTime] = useState(0);

  const { data: ethPrice } = useQuery({
    queryKey: ['ethPrice'],
    queryFn: fetchEthPrice,
    refetchInterval: 60000,
  });

  useEffect(() => {
    if (!contract) return;

    const initializeTime = async () => {
      try {
        const [timeRemaining, escalationActive, gameOver] = await Promise.all([
          contract.getTimeRemaining(),
          contract.escalationActive(),
          isGameOver()
        ]);

        const time = Number(timeRemaining.toString());
        
        // Set the base time only when not in escalation mode or game is not over
        if (!escalationActive) {
          setBaseTime(time);
        }
        
        // Update status with new values from contract
        setStatus(prev => {
          const updatedStatus = {
            ...prev,
            isEscalation: escalationActive,
            timeRemaining: time,
            isGameOver: gameOver
          };
          
          // If already in escalation mode, make sure to preserve that state
          if (escalationActive && prev.escalationInterval === 0) {
            updatedStatus.escalationInterval = 1;
          }
          
          return updatedStatus;
        });
        
        // If in escalation mode and the displayTime doesn't match the contract's time,
        // update it to keep them synchronized (only when there's a significant difference)
        if (escalationActive && Math.abs(displayTime - time) > 5 && time > 0 && time <= 300) {
          setDisplayTime(time);
        }
      } catch (error) {
        console.error("Error fetching initial time:", error);
      }
    };

    initializeTime();
  }, [contract, displayTime, isGameOver]);

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

    const statusInterval = setInterval(updateStatus, 15000);
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
        
        // In escalation mode, the contract resets the timer to 5 minutes when a guess is submitted
        // This is by design - update the UI to match this behavior
        if (escalationActive) {
          console.log("Guess submitted during escalation - updating timer to", time);
          setDisplayTime(time);
        }

        setStatus(prev => ({
          ...prev,
          lastGuessTimestamp: Date.now(),
          lastPlayer: player,
          timeRemaining: time,
          lastGuessInterval: prev.escalationInterval // Track that a guess was made in current interval
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

    const timer = setInterval(() => {
      if (status.isEscalation) {
        setDisplayTime(prev => {
          if (prev <= 0) {
            // Immediately set game over and trigger callback
            setStatus(prev => ({ ...prev, isGameOver: true }));
            if (onTimerEnd) {
              onTimerEnd();
            }
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      } else {
        const newBaseTime = Math.max(0, baseTime - 1);
        setDisplayTime(newBaseTime);
        setBaseTime(newBaseTime);
        if (newBaseTime === 0) {
          // End the game immediately when the timer reaches zero
          setStatus(prev => ({ 
            ...prev, 
            isGameOver: true,
            isEscalation: false 
          }));
          if (onTimerEnd) {
            onTimerEnd();
          }
          clearInterval(timer);
          return;
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [status.isEscalation, status.isGameOver, baseTime, displayTime, onTimerEnd]);

  // This effect handles the initialization of escalation mode with doubled price
  useEffect(() => {
    if (status.isEscalation && status.escalationInterval === 0) {
      // Only set this once when escalation first activates
      const doubledPrice = (0.0009 * 2).toFixed(4);
      setStatus(prev => ({
        ...prev, 
        requiredAmount: doubledPrice,
        escalationInterval: 1 // Mark that we've entered the escalation phase
      }));
      
      // Only set timer to 5 minutes (300 seconds) if not already in escalation mode
      // This prevents the timer from resetting when wallet is disconnected/reconnected
      const timeFromContract = status.timeRemaining;
      if (timeFromContract > 0 && timeFromContract < 300) {
        // We're already in escalation mode, use the remaining time from the contract
        setDisplayTime(timeFromContract);
      } else {
        // Initial entry into escalation mode
        setDisplayTime(300);
      }
    }
  }, [status.isEscalation, status.escalationInterval, status.timeRemaining]);

  // This effect handles the countdown check for escalation mode
  useEffect(() => {
    if (!status.isEscalation) return;

    // When timer reaches zero in escalation mode, the game is over
    const checkInterval = setInterval(() => {
      if (displayTime <= 0) {
        // Game over when the 5-minute escalation period ends
        setStatus(prev => ({...prev, isGameOver: true}));
        if (onTimerEnd) onTimerEnd();
        clearInterval(checkInterval);
      }
    }, 1000);

    return () => clearInterval(checkInterval);
  }, [status.isEscalation, displayTime, onTimerEnd]);

  const usdValue = ethPrice ? (parseFloat(status.totalBalance) * ethPrice).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD'
  }) : '...';

  const minutes = Math.floor(displayTime / 60);
  const seconds = displayTime % 60;
  const isNearEnd = !status.isEscalation && displayTime <= 300;
  const textColorClass = status.isGameOver ? 'text-red-500' : (status.isEscalation || isNearEnd ? 'text-red-500' : 'text-black dark:text-white');

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
                {minutes}:{seconds.toString().padStart(2, '0')}
              </div>
              <Progress
                value={(displayTime / (status.isEscalation ? 300 : 3600)) * 100}
                className={`mt-2 ${status.isEscalation || isNearEnd ? 'bg-red-200' : ''}`}
              />
              {status.isEscalation ? (
                <div className="mt-2 text-sm text-red-500">
                  <div>Escalation Period Active</div>
                  <div className="mt-1">
                    Cost per guess: {parseFloat(status.requiredAmount).toFixed(4)} ETH
                  </div>
                  <div className="mt-1 text-xs">
                    Each guess resets timer to 5:00 for all players
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
              <div className={`text-2xl font-bold ${textColorClass}`}>
                {minutes}:{seconds.toString().padStart(2, '0')}
              </div>
              <Progress value={(displayTime / (status.isEscalation ? 300 : 3600)) * 100} className="mt-2" />
              {status.isEscalation && (
                <div className="mt-1 text-xs text-red-500">
                  Each guess extends the timer for all players
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