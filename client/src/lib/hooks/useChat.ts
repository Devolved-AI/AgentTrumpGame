import { useState, useEffect } from 'react';

export interface ChatMessage {
  id: string;
  message: string;
  isUser: boolean;
  timestamp: string;
  transactionHash?: string;
}

const CHAT_HISTORY_KEY = 'agent_trump_chat_history';

export function useChat(address: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Load chat history when component mounts
  useEffect(() => {
    // Start with empty messages for new game
    setMessages([]);
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

  const addMessage = (message: string, isUser: boolean, transactionHash?: string) => {
    console.log('Adding message:', { message, isUser, transactionHash }); // Debug log
    const newMessage: ChatMessage = {
      id: `${Date.now()}-${Math.random()}`,
      message,
      isUser,
      timestamp: new Date().toISOString(),
      transactionHash
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