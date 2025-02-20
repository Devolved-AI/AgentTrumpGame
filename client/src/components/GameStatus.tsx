import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useWeb3Store, formatEther } from "@/lib/web3";
import { Clock, User, Banknote } from "lucide-react";
import { SiEthereum } from "react-icons/si";

export function GameStatus() {
  const { contract } = useWeb3Store();
  const [status, setStatus] = useState({
    timeRemaining: 0,
    lastPlayer: "",
    totalBalance: "0",
    won: false
  });

  useEffect(() => {
    if (!contract) return;

    const updateStatus = async () => {
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
        timeRemaining: timeRemaining.toNumber(),
        lastPlayer,
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

      <Card className="border-green-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-500">
            <Banknote className="h-5 w-5" />
            Prize Pool
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-500 flex items-center gap-2">
            {status.totalBalance} <SiEthereum className="h-5 w-5" />
          </div>
          {status.won && (
            <div className="text-green-500 mt-2">Game Won!</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}