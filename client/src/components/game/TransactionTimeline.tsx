import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, ExternalLink } from "lucide-react";

interface TransactionTimelineProps {
  responses: {
    response: string;
    timestamp: number;
    exists: boolean;
    transactionHash: string | null;
    blockNumber: number;
  }[];
}

export function TransactionTimeline({ responses }: TransactionTimelineProps) {
  if (responses.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground">
          No transactions yet
        </CardContent>
      </Card>
    );
  }

  const formatPSTTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString("en-US", {
      timeZone: "America/Los_Angeles",
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
      timeZoneName: 'short'
    });
  };

  return (
    <ScrollArea className="h-[500px] pr-4">
      <div className="relative">
        {/* Vertical timeline line */}
        <div className="absolute left-[15px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500 to-blue-700" />

        {responses.map((response, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="relative pl-10 mb-8 last:mb-0"
          >
            {/* Timeline dot */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: index * 0.1 + 0.2 }}
              className="absolute left-0 w-[12px] h-[12px] rounded-full bg-blue-500 shadow-lg shadow-blue-500/50 transform -translate-x-[5px]"
            />

            <Card className="overflow-hidden">
              <CardContent className="p-4">
                <div className="space-y-3">
                  {/* Timestamp */}
                  <div className="text-sm text-muted-foreground">
                    {formatPSTTime(response.timestamp)}
                  </div>

                  {/* Response */}
                  <p className="text-sm">{response.response}</p>

                  {/* Block Number & Transaction Hash */}
                  <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <span>Block:</span>
                      <span className="font-mono">{response.blockNumber}</span>
                    </div>
                    {response.transactionHash && (
                      <div className="flex items-center gap-2">
                        <span>TX:</span>
                        <a
                          href={`https://sepolia.basescan.org/tx/${response.transactionHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-blue-500 hover:text-blue-600 transition-colors font-mono"
                        >
                          {response.transactionHash.slice(0, 6)}...{response.transactionHash.slice(-4)}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </ScrollArea>
  );
}