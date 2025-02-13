import { useEffect, useRef } from "react";
import { ChatBubble } from "./ChatBubble";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Battery, Signal, Wifi } from "lucide-react";

export interface ChatMessage {
  id: string;
  message: string;
  isUser: boolean;
  timestamp: string;
  transactionHash?: string;
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
    <div className="relative w-full h-full rounded-[38px] bg-[#f2f2f7] shadow-xl overflow-hidden">
      {/* iPhone Notch */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[40%] h-[25px] bg-black rounded-b-[18px] z-10" />

      {/* Status Bar */}
      <div className="relative h-11 bg-[#f2f2f7] flex items-center justify-between px-5 z-0">
        <div className="text-sm font-semibold">9:41</div>
        <div className="flex items-center gap-1">
          <Signal className="w-4 h-4" />
          <Wifi className="w-4 h-4" />
          <Battery className="w-5 h-5" />
        </div>
      </div>

      {/* Navigation Bar */}
      <div className="bg-[#f6f6f6] border-b border-gray-200 py-2 px-4">
        <h2 className="text-center font-semibold text-lg">Agent Trump</h2>
      </div>

      {/* Messages */}
      <ScrollArea className={className}>
        <div ref={scrollRef} className="flex flex-col p-4 space-y-2">
          {messages.map((msg) => (
            <ChatBubble
              key={msg.id}
              message={msg.message}
              isUser={msg.isUser}
              timestamp={new Date(msg.timestamp)}
              transactionHash={msg.transactionHash}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}