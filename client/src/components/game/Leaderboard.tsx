import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trophy, ArrowUp, Clock } from "lucide-react";
import { formatEth } from "@/lib/utils";

export interface LeaderboardEntry {
  address: string;
  totalContributed: string;
  attempts: number;
  lastTimestamp: number;
}

interface LeaderboardProps {
  entries: LeaderboardEntry[];
}

export function Leaderboard({ entries }: LeaderboardProps) {
  const sortedEntries = [...entries].sort(
    (a, b) => parseFloat(b.totalContributed) - parseFloat(a.totalContributed)
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          {sortedEntries.length === 0 ? (
            <p className="text-center text-muted-foreground">No players yet</p>
          ) : (
            <div className="space-y-4">
              {sortedEntries.map((entry, index) => (
                <div
                  key={entry.address}
                  className="rounded-lg border p-4 hover:bg-accent transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {index < 3 && (
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                          index === 0 ? 'bg-yellow-500' :
                          index === 1 ? 'bg-gray-400' :
                          'bg-amber-600'
                        } text-white font-bold`}>
                          {index + 1}
                        </div>
                      )}
                      <span className="font-mono text-sm">
                        {entry.address.slice(0, 6)}...{entry.address.slice(-4)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1 text-sm">
                        <ArrowUp className="h-4 w-4" />
                        <span>{entry.attempts}</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm">
                        <Clock className="h-4 w-4" />
                        <span>{new Date(entry.lastTimestamp * 1000).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right font-bold text-green-600">
                    {formatEth(entry.totalContributed)} ETH
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
