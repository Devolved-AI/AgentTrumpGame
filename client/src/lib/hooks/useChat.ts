import { useState, useEffect } from 'react';

export interface ChatMessage {
  id: string;
  message: string;
  isUser: boolean;
  timestamp: string;
  transactionHash?: string;
}

// Key format includes both contract and wallet address to separate different game instances
const CHAT_HISTORY_KEY = 'agent_trump_chat_history';

export function useChat(address: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Load chat history when component mounts or address changes
  useEffect(() => {
    if (address) {
      // Load existing chat history for this wallet address
      const storedMessages = localStorage.getItem(
        `${CHAT_HISTORY_KEY}_${address.toLowerCase()}`
      );
      if (storedMessages) {
        try {
          const parsedMessages = JSON.parse(storedMessages);
          setMessages(parsedMessages);
          console.log('Loaded chat history:', parsedMessages);
        } catch (error) {
          console.error('Error parsing stored messages:', error);
          setMessages([]);
        }
      } else {
        // Start with empty messages for new game
        setMessages([]);
      }
    }
  }, [address]);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (address && messages.length > 0) {
      try {
        localStorage.setItem(
          `${CHAT_HISTORY_KEY}_${address.toLowerCase()}`,
          JSON.stringify(messages)
        );
        console.log('Saved messages to storage:', messages);
      } catch (error) {
        console.error('Error saving messages:', error);
      }
    }
  }, [messages, address]);

  const addMessage = (message: string, isUser: boolean, transactionHash?: string) => {
    console.log('Adding message:', { message, isUser, transactionHash }); // Debug log

    // Don't add empty messages
    if (!message.trim()) {
      console.log('Skipping empty message');
      return;
    }

    const newMessage: ChatMessage = {
      id: `${Date.now()}-${Math.random()}`,
      message: message.trim(),
      isUser,
      timestamp: new Date().toISOString(),
      transactionHash
    };

    setMessages(prev => {
      // Check for duplicate messages (same content and transaction hash)
      const isDuplicate = prev.some(msg => 
        msg.message === newMessage.message && 
        msg.transactionHash === newMessage.transactionHash
      );

      if (isDuplicate) {
        console.log('Skipping duplicate message');
        return prev;
      }

      return [...prev, newMessage];
    });
  };

  const clearChat = () => {
    if (address) {
      localStorage.removeItem(`${CHAT_HISTORY_KEY}_${address.toLowerCase()}`);
      setMessages([]);
      console.log('Chat history cleared');
    }
  };

  return {
    messages,
    addMessage,
    clearChat
  };
}