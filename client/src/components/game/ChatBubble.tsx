import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";

interface ChatBubbleProps {
  message: string;
  isUser: boolean;
  timestamp: Date;
  transactionHash?: string;
}

export function ChatBubble({ message, isUser, timestamp, transactionHash }: ChatBubbleProps) {
  return (
    <motion.div 
      className={cn(
        "flex w-full mb-4",
        isUser ? "justify-end" : "justify-start"
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className={cn(
        "max-w-[70%] rounded-[22px] px-4 py-2 shadow-sm",
        isUser 
          ? "bg-[#007AFF] text-white rounded-br-[4px]" 
          : "bg-[#E9E9EB] text-[#000000] rounded-bl-[4px]"
      )}>
        <p className="text-[15px] leading-5 break-words font-[-apple-system]">{message}</p>
        {transactionHash && (
          <a 
            href={`https://sepolia.basescan.org/tx/${transactionHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "flex items-center gap-1 text-[10px] mt-1 hover:underline",
              isUser ? "text-white/70" : "text-black/50"
            )}
          >
            <ExternalLink className="w-3 h-3" />
            View transaction
          </a>
        )}
        <p className={cn(
          "text-[10px] mt-1",
          isUser ? "text-white/70" : "text-black/50"
        )}>
          {timestamp.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
          })}
        </p>
      </div>
    </motion.div>
  );
}