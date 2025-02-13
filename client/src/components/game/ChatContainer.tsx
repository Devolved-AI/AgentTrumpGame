import { useEffect, useRef } from "react";
import { ChatBubble } from "./ChatBubble";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface ChatMessage {
  id: string;
  message: string;
  isUser: boolean;
  timestamp: string;
}

interface ChatContainerProps {
  messages: ChatMessage[];
  className?: string;
}

export function ChatContainer({ messages, className }: ChatContainerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <ScrollArea className={className}>
      <div ref={scrollRef} className="flex flex-col p-4 space-y-2">
        {messages.map((msg) => (
          <ChatBubble
            key={msg.id}
            message={msg.message}
            isUser={msg.isUser}
            timestamp={new Date(msg.timestamp)}
          />
        ))}
      </div>
    </ScrollArea>
  );
}
