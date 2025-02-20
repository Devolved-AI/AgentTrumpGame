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
  const { contract } = useWeb3Store();
  const [status, setStatus] = useState({
    timeRemaining: 0,
    lastPlayer: "",
    totalBalance: "0",
    won: false,
    isEscalation: false,
    requiredAmount: "0",
    lastGuessTimestamp: 0
  });
  const [displayTime, setDisplayTime] = useState(0);

  const { data: ethPrice } = useQuery({
    queryKey: ['ethPrice'],
    queryFn: fetchEthPrice,
    refetchInterval: 60000, // Refresh every minute
  });

  // Initial time setup
  useEffect(() => {
    if (!contract) return;

    const initializeTime = async () => {
      try {
        const [timeRemaining, escalationActive, lastGuessBlock] = await Promise.all([
          contract.getTimeRemaining(),
          contract.escalationActive(),
          contract.lastGuessBlock()
        ]);

        const time = Number(timeRemaining);

        if (escalationActive) {
          // Calculate the actual remaining time in the escalation period
          const provider = contract.provider;
          const currentBlock = await provider.getBlockNumber();
          const currentBlockData = await provider.getBlock(currentBlock);
          const lastGuessBlockData = await provider.getBlock(Number(lastGuessBlock));

          if (currentBlockData && lastGuessBlockData) {
            const elapsedTime = currentBlockData.timestamp - lastGuessBlockData.timestamp;
            const remainingTime = Math.max(0, 300 - elapsedTime); // 300 seconds = 5 minutes
            setDisplayTime(remainingTime);
          } else {
            setDisplayTime(300); // Fallback to 5 minutes if block data is unavailable
          }
        } else {
          setDisplayTime(time);
        }

        setStatus(prev => ({
          ...prev,
          isEscalation: escalationActive,
          timeRemaining: time
        }));
      } catch (error) {
        console.error("Error fetching initial time:", error);
      }
    };

    initializeTime();
  }, [contract]);

  // Contract data updates - every 5 seconds
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
          requiredAmount,
          lastGuessBlock
        ] = await Promise.all([
          contract.getTimeRemaining(),
          contract.lastPlayer(),
          contract.getContractBalance(),
          contract.gameWon(),
          contract.escalationActive(),
          contract.currentRequiredAmount(),
          contract.lastGuessBlock()
        ]);

        const time = Number(timeRemaining);
        const isNewGuess = lastPlayer !== status.lastPlayer;

        if (escalationActive) {
          // Update the remaining time based on the last guess block
          const provider = contract.provider;
          const currentBlock = await provider.getBlockNumber();
          const currentBlockData = await provider.getBlock(currentBlock);
          const lastGuessBlockData = await provider.getBlock(Number(lastGuessBlock));

          if (currentBlockData && lastGuessBlockData) {
            const elapsedTime = currentBlockData.timestamp - lastGuessBlockData.timestamp;
            const remainingTime = Math.max(0, 300 - elapsedTime);

            // Only reset to 5 minutes if there's a new guess
            if (isNewGuess) {
              setDisplayTime(300);
            } else {
              setDisplayTime(remainingTime);
            }
          }
        } else {
          // Not in escalation mode, use normal time remaining
          if (Math.abs(time - displayTime) > 5) {
            setDisplayTime(time);
          }
        }

        setStatus(prev => ({
          timeRemaining: time,
          lastPlayer,
          totalBalance: formatEther(balance),
          won,
          isEscalation: escalationActive,
          requiredAmount: formatEther(requiredAmount),
          lastGuessTimestamp: isNewGuess ? Date.now() / 1000 : prev.lastGuessTimestamp
        }));

      } catch (error) {
        console.error("Error fetching game status:", error);
      }
    };

    updateStatus();
    const interval = setInterval(updateStatus, 5000);
    return () => clearInterval(interval);
  }, [contract, status.lastPlayer, status.isEscalation, displayTime]);

  // Independent countdown timer - updates every second
  useEffect(() => {
    const timer = setInterval(() => {
      setDisplayTime(prev => {
        // Don't go below zero
        if (prev <= 0) return 0;
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

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
    const isNearEnd = !status.isEscalation && displayTime <= 300; // Within 5 minutes of end
    const textColorClass = status.isEscalation || isNearEnd ? 'text-red-500' : 'text-black dark:text-white';

    return (
      <Card>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${textColorClass}`}>
            <Clock className="h-5 w-5" />
            {status.isEscalation ? 'Escalation Period' : 'Time Remaining'}
          </CardTitle>
        </CardHeader>
        <CardContent>
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
                  Escalation Period Started
                  <div className="mt-1">
                    Cost per guess: {parseFloat(status.requiredAmount).toFixed(4)} ETH
                  </div>
                </>
              ) : (
                "Approaching Escalation Period"
              )}
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