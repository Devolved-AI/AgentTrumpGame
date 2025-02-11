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
}

function formatTimeRemaining(seconds: number): string {
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
  if (score < 0) return "text-red-500";
  if (score >= 6) return "text-green-500";
  return "text-yellow-500";
}

function getProgressColor(score: number): string {
  if (score < 0) return "bg-red-100";
  if (score >= 6) return "bg-green-100";
  return "bg-yellow-100";
}

export function GameStatus({ 
  timeRemaining, 
  currentAmount, 
  lastPlayer, 
  escalationActive,
  persuasionScore 
}: GameStatusProps) {
  // Normalize score for progress bar (between 0 and 100)
  const normalizedScore = Math.max(0, Math.min(100, ((persuasionScore + 1) / 11) * 100));

  return (
    <div className="grid gap-4 grid-cols-2">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Time Remaining</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold">{formatTimeRemaining(timeRemaining)}</div>
          <Progress value={(timeRemaining / 3600) * 100} className="mt-2" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Required Amount</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{currentAmount} ETH</div>
          <p className="text-xs text-muted-foreground">
            {escalationActive ? "Escalation Active" : "Base Amount"}
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
        </CardContent>
      </Card>
    </div>
  );
}