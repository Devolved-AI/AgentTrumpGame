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
}

export function GameStatus({ showPrizePoolOnly, showTimeRemainingOnly, showLastGuessOnly }: GameStatusProps) {
  const { contract } = useWeb3Store();
  const [status, setStatus] = useState({
    timeRemaining: 0,
    lastPlayer: "",
    totalBalance: "0",
    won: false
  });
  const [displayTime, setDisplayTime] = useState(0);

  const { data: ethPrice } = useQuery({
    queryKey: ['ethPrice'],
    queryFn: fetchEthPrice,
    refetchInterval: 60000, // Refresh every minute
  });

  // Initial time setup - only runs once when contract is available
  useEffect(() => {
    if (!contract) return;

    const initializeTime = async () => {
      try {
        const timeRemaining = await contract.getTimeRemaining();
        setDisplayTime(Number(timeRemaining));
      } catch (error) {
        console.error("Error fetching initial time:", error);
      }
    };

    initializeTime();
  }, [contract]); // Only run when contract changes

  // Contract data updates - separate from display time
  useEffect(() => {
    if (!contract) return;

    const updateStatus = async () => {
      try {
        const [
          timeRemaining,
          lastPlayer,
          balance,
          won
        ] = await Promise.all([
          contract.getTimeRemaining(),
          contract.lastPlayer(),
          contract.getContractBalance(),
          contract.gameWon()
        ]);

        setStatus({
          timeRemaining: Number(timeRemaining),
          lastPlayer,
          totalBalance: formatEther(balance),
          won
        });
      } catch (error) {
        console.error("Error fetching game status:", error);
      }
    };

    updateStatus();
    const interval = setInterval(updateStatus, 5000);
    return () => clearInterval(interval);
  }, [contract]);

  // Independent countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setDisplayTime(prev => {
        if (prev <= 0) return 0;
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []); // Empty dependency array for continuous countdown

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

    return (
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