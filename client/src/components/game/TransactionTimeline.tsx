import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, MessageSquare, ExternalLink } from "lucide-react";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";

interface TransactionTimelineProps {
  responses: {
    response: string;
    timestamp: number;
    exists: boolean;
    transactionHash?: string;
    blockNumber: number;
  }[];
}

export function TransactionTimeline({ responses }: TransactionTimelineProps) {
  const [selectedResponse, setSelectedResponse] = useState<typeof responses[0] | null>(null);

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
    <>
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

              <Card 
                className="overflow-hidden cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => setSelectedResponse(response)}
              >
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {/* Timestamp */}
                    <div className="text-sm text-muted-foreground">
                      {formatPSTTime(response.timestamp)}
                    </div>

                    {/* Response Preview */}
                    <p className="text-sm">
                      {response.response.length > 100 
                        ? `${response.response.slice(0, 100)}...` 
                        : response.response}
                    </p>

                    {/* Transaction Hash Preview */}
                    {response.transactionHash && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>TX:</span>
                        <span className="font-mono">
                          {response.transactionHash.slice(0, 6)}...{response.transactionHash.slice(-4)}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </ScrollArea>

      {/* Transaction Details Dialog */}
      <Dialog open={!!selectedResponse} onOpenChange={() => setSelectedResponse(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Timestamp */}
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{selectedResponse && formatPSTTime(selectedResponse.timestamp)}</span>
            </div>

            {/* Block Number */}
            <div className="space-y-2">
              <h4 className="font-semibold">Block Number:</h4>
              <div className="font-mono text-sm bg-muted p-4 rounded-md">
                {selectedResponse?.blockNumber}
              </div>
            </div>

            {/* Transaction Hash with Link */}
            {selectedResponse?.transactionHash && (
              <div className="space-y-2">
                <h4 className="font-semibold">Transaction Hash:</h4>
                <a
                  href={`https://sepolia.basescan.org/tx/${selectedResponse.transactionHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-blue-500 hover:text-blue-600 transition-colors font-mono bg-muted p-4 rounded-md"
                >
                  {selectedResponse.transactionHash}
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            )}

            {/* Full Response */}
            <div className="space-y-2">
              <h4 className="font-semibold">Response:</h4>
              <p className="text-sm whitespace-pre-wrap bg-muted p-4 rounded-md">
                {selectedResponse?.response}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}