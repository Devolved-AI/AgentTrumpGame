import { useState, useEffect } from 'react';

export interface ChatMessage {
  id: string;
  message: string;
  isUser: boolean;
  timestamp: string;
}

const CHAT_HISTORY_KEY = 'agent_trump_chat_history';

export function useChat(address: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Load chat history when component mounts
  useEffect(() => {
    if (address) {
      const stored = localStorage.getItem(`${CHAT_HISTORY_KEY}_${address.toLowerCase()}`);
      if (stored) {
        try {
          setMessages(JSON.parse(stored));
        } catch (error) {
          console.error('Error loading chat history:', error);
        }
      }
    }
  }, [address]);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (address && messages.length > 0) {
      localStorage.setItem(
        `${CHAT_HISTORY_KEY}_${address.toLowerCase()}`,
        JSON.stringify(messages)
      );
    }
  }, [messages, address]);

  const addMessage = (message: string, isUser: boolean) => {
    const newMessage: ChatMessage = {
      id: `${Date.now()}-${Math.random()}`,
      message,
      isUser,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const clearChat = () => {
    if (address) {
      localStorage.removeItem(`${CHAT_HISTORY_KEY}_${address.toLowerCase()}`);
      setMessages([]);
    }
  };

  return {
    messages,
    addMessage,
    clearChat
  };
}
