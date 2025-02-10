import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PlayerHistoryProps {
  responses: {
    response: string;
    timestamp: number;
    exists: boolean;
  }[];
}

export function PlayerHistory({ responses }: PlayerHistoryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Response History</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          {responses.length === 0 ? (
            <p className="text-center text-muted-foreground">No responses yet</p>
          ) : (
            <div className="space-y-4">
              {responses.map((response, index) => (
                <div
                  key={index}
                  className="rounded-lg border p-4 hover:bg-accent"
                >
                  <p className="text-sm text-muted-foreground">
                    {new Date(response.timestamp * 1000).toLocaleString()}
                  </p>
                  <p className="mt-2 text-sm">{response.response}</p>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
