import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";

interface ChatBubbleProps {
  message: string;
  isUser: boolean;
  timestamp: Date;
  transactionHash?: string;
}

export function ChatBubble({ message, isUser, timestamp, transactionHash }: ChatBubbleProps) {
  const [displayedMessage, setDisplayedMessage] = useState("");
  const [isTyping, setIsTyping] = useState(!isUser); // Only show typing for Trump's messages

  // Typing animation effect
  useEffect(() => {
    if (!isUser) {
      let currentIndex = 0;
      setIsTyping(true);

      const typingInterval = setInterval(() => {
        if (currentIndex < message.length) {
          setDisplayedMessage(message.substring(0, currentIndex + 1));
          currentIndex++;
        } else {
          clearInterval(typingInterval);
          setIsTyping(false);
        }
      }, 30); // Adjust typing speed here

      return () => clearInterval(typingInterval);
    } else {
      setDisplayedMessage(message);
    }
  }, [message, isUser]);

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
        "max-w-[70%] rounded-[22px] px-4 py-2 shadow-sm relative",
        isUser 
          ? "bg-[#007AFF] text-white rounded-br-[4px]" 
          : "bg-[#E9E9EB] text-[#000000] rounded-bl-[4px]"
      )}>
        <p className="text-[15px] leading-5 break-words font-[-apple-system]">
          {isUser ? message : displayedMessage}
          {isTyping && <span className="animate-pulse">|</span>}
        </p>

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