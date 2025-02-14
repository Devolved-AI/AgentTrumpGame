import { useEffect, useRef } from "react";
import { ChatBubble } from "./ChatBubble";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Battery, Signal, Wifi, ExternalLink } from "lucide-react";
import { ResponseForm } from "./ResponseForm";
import { Button } from "@/components/ui/button";
import { NETWORK_CONFIG } from "@/lib/config";

export interface ChatMessage {
  id: string;
  message: string;
  isUser: boolean;
  timestamp: string;
  isLoading?: boolean;
  transactionHash?: string;
}

interface ChatContainerProps {
  messages: ChatMessage[];
  className?: string;
  onSubmit: (response: string) => Promise<void>;
  currentAmount: string;
  isLoading: boolean;
  transactionStatus?: 'pending' | 'success' | 'error';
  disabled?: boolean;
}

export function ChatContainer({ 
  messages, 
  className,
  onSubmit,
  currentAmount,
  isLoading,
  transactionStatus,
  disabled
}: ChatContainerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    if (scrollRef.current) {
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 100); // Small delay to ensure content is rendered
    }
  }, [messages]);

  const getExplorerUrl = (hash: string) => {
    return `${NETWORK_CONFIG.blockExplorerUrls[0]}/tx/${hash}`;
  };

  return (
    <div className="relative w-full h-full rounded-[38px] bg-[#f2f2f7] shadow-xl overflow-hidden flex flex-col">
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
      <ScrollArea className="flex-1 min-h-0 px-4">
        <div ref={scrollRef} className="flex flex-col py-4 space-y-2">
          {messages.map((msg) => (
            <div key={msg.id} className="space-y-1">
              <ChatBubble
                message={msg.message}
                isUser={msg.isUser}
                timestamp={new Date(msg.timestamp)}
                isLoading={msg.isLoading}
              />
              {msg.isUser && msg.transactionHash && (
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-blue-500 hover:text-blue-700"
                    onClick={() => window.open(getExplorerUrl(msg.transactionHash!), '_blank')}
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    View Transaction
                  </Button>
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <ChatBubble
              message="..."
              isUser={false}
              timestamp={new Date()}
              isLoading={true}
            />
          )}
        </div>
      </ScrollArea>

      {/* Message Input - Fixed at bottom */}
      <div className="mt-auto">
        <ResponseForm
          onSubmit={onSubmit}
          currentAmount={currentAmount}
          isLoading={isLoading}
          transactionStatus={transactionStatus}
          disabled={disabled}
        />
      </div>
    </div>
  );
}