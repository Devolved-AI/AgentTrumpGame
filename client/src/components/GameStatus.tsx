import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useWeb3Store, formatEther, parseEther } from "@/lib/web3";
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
}

export function GameStatus({ showPrizePoolOnly, showTimeRemainingOnly, showLastGuessOnly }: GameStatusProps) {
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
    lastUpdate: Date.now()
  });
  const [displayTime, setDisplayTime] = useState(300);

  const { data: ethPrice } = useQuery({
    queryKey: ['ethPrice'],
    queryFn: fetchEthPrice,
    refetchInterval: 60000, // Refresh every minute
  });

  useEffect(() => {
    if (!contract) return;

    const initializeTime = async () => {
      try {
        const [timeRemaining, escalationActive] = await Promise.all([
          contract.getTimeRemaining(),
          contract.escalationActive()
        ]);

        const time = Number(timeRemaining);
        setStatus(prev => ({
          ...prev,
          isEscalation: escalationActive,
          timeRemaining: time,
          lastUpdate: Date.now()
        }));

        setDisplayTime(escalationActive ? 300 : time);
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

        const time = Number(timeRemaining);
        const isNewGuess = lastPlayer !== status.lastPlayer;

        setStatus(prev => ({
          ...prev,
          timeRemaining: time,
          lastPlayer,
          totalBalance: formatEther(balance),
          won,
          isEscalation: escalationActive,
          isGameOver: gameOver,
          requiredAmount: requiredAmount,
          lastGuessTimestamp: isNewGuess ? Date.now() : prev.lastGuessTimestamp,
          lastUpdate: Date.now()
        }));

        if (isNewGuess && escalationActive) {
          setDisplayTime(300); // Reset to 5 minutes on new guess during escalation
        } else if (!escalationActive) {
          setDisplayTime(time);
        }
      } catch (error) {
        console.error("Error fetching game status:", error);
      }
    };

    const statusInterval = setInterval(updateStatus, 5000);
    return () => clearInterval(statusInterval);
  }, [contract]);

  // Continuous countdown timer
  useEffect(() => {
    if (status.isGameOver) return;

    const timer = setInterval(() => {
      setDisplayTime(prev => {
        if (status.isEscalation) {
          // In escalation mode, count down from 300 seconds
          if (prev <= 0) return 0;
          return prev - 1;
        } else {
          // In normal mode, calculate remaining time based on contract time
          const elapsed = (Date.now() - status.lastUpdate) / 1000;
          return Math.max(0, status.timeRemaining - Math.floor(elapsed));
        }
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [status.isEscalation, status.timeRemaining, status.isGameOver, status.lastUpdate]);

  const usdValue = ethPrice ? (parseFloat(status.totalBalance) * ethPrice).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD'
  }) : '...';

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
    const minutes = Math.floor(displayTime / 60);
    const seconds = displayTime % 60;
    const isNearEnd = !status.isEscalation && displayTime <= 300;
    const textColorClass = status.isEscalation || isNearEnd ? 'text-red-500' : 'text-black dark:text-white';

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
              {(status.isEscalation || isNearEnd) && (
                <div className="mt-2 text-sm text-red-500">
                  {status.isEscalation ? (
                    <>
                      Escalation Period Active
                      <div className="mt-1">
                        Cost per guess: {parseFloat(status.requiredAmount).toFixed(4)} ETH
                      </div>
                    </>
                  ) : (
                    "Approaching Escalation Period"
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="text-2xl font-bold text-red-500">
              Game has ended
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

  const minutes = Math.floor(displayTime / 60);
  const seconds = displayTime % 60;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Time Remaining
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {minutes}:{seconds.toString().padStart(2, '0')}
          </div>
          <Progress value={(displayTime / 3600) * 100} className="mt-2" />
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