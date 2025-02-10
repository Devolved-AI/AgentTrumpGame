import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, MessageSquare } from "lucide-react";

interface TransactionTimelineProps {
  responses: {
    response: string;
    timestamp: number;
    exists: boolean;
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
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <Clock className="h-4 w-4" />
                  {formatPSTTime(response.timestamp)}
                </div>
                <div className="flex items-start gap-2">
                  <MessageSquare className="h-4 w-4 mt-1 text-blue-500" />
                  <p className="text-sm">{response.response}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </ScrollArea>
  );
}