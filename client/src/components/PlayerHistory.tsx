import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useWeb3Store, formatEther } from "@/lib/web3";
import { formatInTimeZone } from "date-fns-tz";

interface Response {
  text: string;
  timestamp: number;
  exists: boolean;
}

export function PlayerHistory() {
  const { contract, address } = useWeb3Store();
  const [responses, setResponses] = useState<Response[]>([]);

  useEffect(() => {
    if (!contract || !address) return;

    const loadResponses = async () => {
      const count = await contract.getPlayerResponseCount(address);
      const responses = [];

      for (let i = 0; i < count; i++) {
        const [text, timestamp, exists] = await contract.getPlayerResponseByIndex(address, i);
        // Safely convert timestamp to number, handling both BigNumber and regular number cases
        const timestampNum = typeof timestamp === 'object' && 'toNumber' in timestamp 
          ? timestamp.toNumber() 
          : Number(timestamp);

        responses.push({ text, timestamp: timestampNum, exists });
      }

      setResponses(responses.reverse());
    };

    loadResponses();

    // Listen for new responses
    const filter = contract.filters.GuessSubmitted(address);
    contract.on(filter, (player, amount, multiplier, response, blockNumber) => {
      setResponses(prev => [{
        text: response,
        timestamp: Math.floor(Date.now() / 1000), // Convert to Unix timestamp (seconds)
        exists: true
      }, ...prev]);
    });

    return () => {
      contract.removeAllListeners(filter);
    };
  }, [contract, address]);

  if (!address) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Previous Guesses</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          {responses.map((response, i) => (
            <div
              key={i}
              className="mb-4 p-4 border rounded-lg bg-secondary/50"
            >
              <p className="text-lg">{response.text}</p>
              <p className="text-sm text-muted-foreground mt-2">
                {formatInTimeZone(
                  new Date(response.timestamp * 1000), // Convert Unix timestamp to Date object
                  'America/Los_Angeles',
                  'h:mmaaa MM/dd/yyyy'
                )}
              </p>
            </div>
          ))}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}