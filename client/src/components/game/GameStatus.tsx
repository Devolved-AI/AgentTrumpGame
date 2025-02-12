import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Clock, User, TrendingUp, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface GameStatusProps {
  timeRemaining: number;
  currentAmount: string;
  lastPlayer: string;
  escalationActive: boolean;
  persuasionScore: number;
  isGameWon: boolean;
}

function formatTimeRemaining(seconds: number, escalationActive: boolean): string {
  if (escalationActive) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')} left in period`;
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  const parts = [];
  if (hours > 0) parts.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`);
  if (minutes > 0) parts.push(`${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`);
  if (remainingSeconds > 0 || parts.length === 0) {
    parts.push(`${remainingSeconds} ${remainingSeconds === 1 ? 'second' : 'seconds'}`);
  }

  return parts.join(', ');
}

function getScoreColor(score: number): string {
  if (score <= 25) return "text-red-500";
  if (score >= 76) return "text-green-500";
  return "text-yellow-500"; // Gold for 26-75
}

function getProgressColor(score: number): string {
  if (score <= 25) return "bg-red-100";
  if (score >= 76) return "bg-green-100";
  return "bg-yellow-100"; // Gold for 26-75
}

export function GameStatus({ 
  timeRemaining, 
  currentAmount, 
  lastPlayer, 
  escalationActive,
  persuasionScore, 
  isGameWon
}: GameStatusProps) {
  const normalizedScore = Math.max(0, Math.min(100, persuasionScore));
  const isGameOver = isGameWon;  // Only consider game over when someone has won

  // Calculate progress percentage
  const progressPercentage = escalationActive 
    ? (timeRemaining / 300) * 100  // 5 minutes (300 seconds) per escalation period
    : (timeRemaining / (72 * 3600)) * 100; // 72 hours in seconds

  return (
    <div className="grid gap-4 grid-cols-2">
      <Card className={cn(
        escalationActive && "border-orange-500 shadow-orange-500/20 shadow-lg"
      )}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Time Remaining</CardTitle>
          <Clock className={cn(
            "h-4 w-4",
            escalationActive ? "text-orange-500" : "text-muted-foreground"
          )} />
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold">
            {isGameWon ? "Game Over!" : formatTimeRemaining(timeRemaining, escalationActive)}
          </div>
          <Progress 
            value={progressPercentage} 
            className={cn(
              "mt-2",
              escalationActive && "bg-orange-100"
            )} 
          />
          {escalationActive && (
            <p className="text-xs text-orange-500 mt-1 font-semibold">
              ⚠️ Escalation Active - Fixed Price Until Timer Ends
            </p>
          )}
        </CardContent>
      </Card>

      <Card className={cn(
        escalationActive && "border-orange-500 shadow-orange-500/20 shadow-lg"
      )}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Required Amount</CardTitle>
          <TrendingUp className={cn(
            "h-4 w-4",
            escalationActive ? "text-orange-500" : "text-muted-foreground"
          )} />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{currentAmount} ETH</div>
          <p className={cn(
            "text-xs",
            escalationActive ? "text-orange-500 font-semibold" : "text-muted-foreground"
          )}>
            {isGameOver 
              ? "Game Over" 
              : escalationActive 
                ? "Current Period's Fixed Price" 
                : "Base Amount (0.0009 ETH)"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Persuasion Score</CardTitle>
          <Star className={cn("h-4 w-4", getScoreColor(persuasionScore))} />
        </CardHeader>
        <CardContent>
          <div className={cn("text-2xl font-bold", getScoreColor(persuasionScore))}>
            {persuasionScore}
          </div>
          <Progress 
            value={normalizedScore} 
            className={cn("mt-2", getProgressColor(persuasionScore))} 
          />
          <p className="text-xs text-muted-foreground mt-1">
            {isGameOver ? "Game Over" : "Score needed: 100"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Last Player</CardTitle>
          <User className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="font-mono text-sm">
            {lastPlayer ? `${lastPlayer.slice(0, 6)}...${lastPlayer.slice(-4)}` : 'No players yet'}
          </div>
          {escalationActive && lastPlayer && (
            <p className="text-xs text-orange-500 mt-1">
              Last guess started escalation period
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}