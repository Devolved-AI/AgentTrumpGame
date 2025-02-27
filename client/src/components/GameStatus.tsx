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
        const [timeRemaining, escalationActive] = await Promise.all([
          contract.getTimeRemaining(),
          contract.escalationActive()
        ]);

        const time = Number(timeRemaining.toString());
        setBaseTime(time);
        setStatus(prev => ({
          ...prev,
          isEscalation: escalationActive,
          timeRemaining: time,
        }));
      } catch (error) {
        console.error("Error fetching initial time:", error);
      }
    };

    initializeTime();
  }, [contract]);

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

        if (!escalationActive) {
          setBaseTime(time);
        }

        setStatus(prev => ({
          ...prev,
          timeRemaining: time,
          lastPlayer,
          totalBalance: formatEther(balance),
          won,
          isEscalation: escalationActive,
          isGameOver: gameOver,
          requiredAmount: requiredAmount,
        }));

      } catch (error) {
        console.error("Error fetching game status:", error);
      }
    };

    const statusInterval = setInterval(updateStatus, 15000);
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
      if (status.isEscalation) {
        setDisplayTime(300);

        const newAmount = await getEscalationPrice();
        setStatus(prev => ({
          ...prev,
          requiredAmount: newAmount,
          lastGuessTimestamp: Date.now(),
          lastPlayer: player
        }));
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
  }, [contract, status.isEscalation]);

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
          // Immediately set escalation and potentially game over
          setStatus(prev => ({ ...prev, isEscalation: true }));
          setDisplayTime(300);
          if (onTimerEnd) {
            onTimerEnd();
          }
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [status.isEscalation, status.isGameOver, baseTime, displayTime, onTimerEnd]);

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
                  Escalation Period Active
                  <div className="mt-1">
                    Cost per guess: {parseFloat(status.requiredAmount).toFixed(4)} ETH
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
              <Progress value={(displayTime / 3600) * 100} className="mt-2" />
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