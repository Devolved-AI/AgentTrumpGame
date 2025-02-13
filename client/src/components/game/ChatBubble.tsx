import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface ChatBubbleProps {
  message: string;
  isUser: boolean;
  timestamp: Date;
}

export function ChatBubble({ message, isUser, timestamp }: ChatBubbleProps) {
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