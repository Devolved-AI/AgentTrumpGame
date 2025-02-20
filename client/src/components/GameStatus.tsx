import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useWeb3Store, formatEther } from "@/lib/web3";
import { Clock, TrendingUp, Trophy } from "lucide-react";

export function GameStatus() {
  const { contract } = useWeb3Store();
  const [status, setStatus] = useState({
    timeRemaining: 0,
    requiredAmount: "0",
    isEscalating: false,
    totalBalance: "0",
    won: false
  });

  useEffect(() => {
    if (!contract) return;

    const updateStatus = async () => {
      const [
        timeRemaining,
        requiredAmount,
        isEscalating,
        balance,
        won
      ] = await Promise.all([
        contract.getTimeRemaining(),
        contract.currentRequiredAmount(),
        contract.escalationActive(),
        contract.getContractBalance(),
        contract.gameWon()
      ]);

      setStatus({
        timeRemaining: timeRemaining.toNumber(),
        requiredAmount: formatEther(requiredAmount),
        isEscalating,
        totalBalance: formatEther(balance),
        won
      });
    };

    updateStatus();
    const interval = setInterval(updateStatus, 2000);
    return () => clearInterval(interval);
  }, [contract]);

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
            {Math.floor(status.timeRemaining / 60)}:{(status.timeRemaining % 60).toString().padStart(2, '0')}
          </div>
          <Progress value={(status.timeRemaining / 3600) * 100} className="mt-2" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Current Stake
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {status.requiredAmount} ETH
          </div>
          {status.isEscalating && (
            <div className="text-orange-500 mt-2">Escalation Active!</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Prize Pool
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {status.totalBalance} ETH
          </div>
          {status.won && (
            <div className="text-green-500 mt-2">Game Won!</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
