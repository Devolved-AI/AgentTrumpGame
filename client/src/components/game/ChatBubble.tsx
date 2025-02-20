import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import { Avatar, AvatarImage } from "@/components/ui/avatar";

interface ChatBubbleProps {
  message: string;
  isUser: boolean;
  timestamp: Date;
  isLoading?: boolean;
  transactionHash?: string;
}

export function ChatBubble({ 
  message, 
  isUser, 
  timestamp, 
  isLoading,
  transactionHash 
}: ChatBubbleProps) {
  return (
    <motion.div 
      className={cn(
        "flex w-full mb-4 items-start gap-2",
        isUser ? "justify-end flex-row-reverse" : "justify-start"
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {!isUser && (
        <Avatar className="w-8 h-8">
          <AvatarImage src="/trump-avatar.jpg" alt="Trump" className="object-cover" />
        </Avatar>
      )}
      <div className={cn(
        "max-w-[70%] rounded-[22px] px-4 py-2 shadow-sm relative",
        isUser 
          ? "bg-[#007AFF] text-white rounded-br-[4px]" 
          : "bg-[#E9E9EB] text-[#000000] rounded-bl-[4px]"
      )}>
        <p className="text-[15px] leading-5 break-words font-[-apple-system]">
          {message}
        </p>

        {isUser && transactionHash && (
          <a
            href={`https://sepolia.basescan.org/tx/${transactionHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "flex items-center gap-1 text-xs mt-1",
              isUser ? "text-white/70 hover:text-white/90" : "text-black/50 hover:text-black/70"
            )}
          >
            View transaction <ExternalLink className="h-3 w-3" />
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