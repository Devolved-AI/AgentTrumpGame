import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useWeb3Store, formatEther } from "@/lib/web3";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatInTimeZone } from "date-fns-tz";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { TypingIndicator } from "./TypingIndicator";
import { TransactionVisualization } from "./TransactionVisualization";
import { generateTrumpResponse } from "@/lib/openai";
import { PERSUASION_EVENT } from "./PersuasionScore";

interface GuessFormProps {
  onTimerEnd?: () => void;
}

const WELCOME_MESSAGE = {
  text: "Hey there! I'm Agent Trump. Try to convince me to give you the money in the prize pool!",
  timestamp: Math.floor(Date.now() / 1000),
  isUser: false
};

const guessSchema = z.object({
  response: z.string()
    .min(1, "Response is required")
    .max(2000, "Response too long")
});

interface TransactionState {
  hash: string;
  status: 'pending' | 'confirmed' | 'failed';
  value?: string;
}

interface Message {
  text: string;
  timestamp: number;
  isUser: boolean;
  exists?: boolean;
  transaction?: TransactionState;
}

const ESCALATION_PRICES = [
    "0.0018", // Period 1
    "0.0036", // Period 2
    "0.0072", // Period 3
    "0.0144", // Period 4
    "0.0288", // Period 5
    "0.0576", // Period 6
    "0.1152", // Period 7
    "0.2304", // Period 8
    "0.4608", // Period 9
    "0.9216"  // Period 10
  ];


export function GuessForm({ onTimerEnd }: GuessFormProps) {
  const { contract, address } = useWeb3Store();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [isGameOver, setIsGameOver] = useState(false);

  useEffect(() => {
    setMessages([WELCOME_MESSAGE]);

    if (!contract || !address) {
      return;
    }

    let mounted = true;

    const loadResponses = async () => {
      try {
        const [gameWon, timeRemaining] = await Promise.all([
          contract.gameWon(),
          contract.getTimeRemaining()
        ]);

        // Set initial game over state
        const isOver = gameWon || Number(timeRemaining.toString()) <= 0;
        setIsGameOver(isOver);
        if (isOver && onTimerEnd) {
          onTimerEnd();
        }

        const count = await contract.getPlayerResponseCount(address);
        const responses: Message[] = [];

        for (let i = 0; i < count; i++) {
          if (!mounted) return;

          const [response, timestamp, exists] = await contract.getPlayerResponseByIndex(address, i);
          let text = response;
          try {
            const parsed = JSON.parse(response);
            text = parsed.response;
          } catch (e) {
            console.log("Response parsing failed, using raw text");
          }

          const timestampNum = typeof timestamp === 'object' && 'toNumber' in timestamp
            ? timestamp.toNumber()
            : Number(timestamp);

          responses.push({
            text,
            timestamp: timestampNum,
            exists,
            isUser: true
          });
        }

        if (mounted) {
          setMessages([WELCOME_MESSAGE, ...responses]);
        }
      } catch (error) {
        console.error("Error loading responses:", error);
        // Removed toast notification for better UX
        if (mounted) {
          setMessages([WELCOME_MESSAGE]); // Reset to welcome message on error
        }
      }
    };

    loadResponses();

    return () => {
      mounted = false;
      setMessages([WELCOME_MESSAGE]);
    };
  }, [contract, address]);

  useEffect(() => {
    if (!contract) return;

    const checkGameState = async () => {
      try {
        const [gameWon, timeRemaining] = await Promise.all([
          contract.gameWon(),
          contract.getTimeRemaining()
        ]);
        const time = Number(timeRemaining.toString());
        const isOver = gameWon || time <= 0;

        if (isOver) {
          setIsGameOver(true);
          if (onTimerEnd) {
            onTimerEnd();
          }
          // Ensure we stop checking once the game is over
          clearInterval(interval);
        } else {
          setIsGameOver(false);
        }
      } catch (error) {
        console.error("Error checking game state:", error);
      }
    };

    // Check game state immediately
    checkGameState();
    
    // Check more frequently (every 2 seconds) to ensure we catch game over states quickly
    const interval = setInterval(checkGameState, 2000);
    
    // Also listen for custom game-over events
    const handleGameOver = () => {
      console.log("Game over event received in GuessForm");
      setIsGameOver(true);
      if (onTimerEnd) {
        onTimerEnd();
      }
    };
    
    window.addEventListener('game-over', handleGameOver);

    return () => {
      clearInterval(interval);
      window.removeEventListener('game-over', handleGameOver);
    };
  }, [contract, onTimerEnd]);

  const form = useForm<z.infer<typeof guessSchema>>({
    resolver: zodResolver(guessSchema),
    defaultValues: {
      response: ""
    }
  });

  const onSubmit = async (data: z.infer<typeof guessSchema>) => {
    if (!contract || isGameOver) {
      toast({
        title: "Game Over",
        description: "The game has ended. No more guesses can be submitted.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Double check game state before submitting
      const [gameWon, timeRemaining] = await Promise.all([
        contract.gameWon(),
        contract.getTimeRemaining()
      ]);

      // Also check if any player has reached max persuasion (100/100)
      let maxPersuasion = false;
      try {
        // Check if the current player has max persuasion
        if (address) {
          const response = await fetch(`/api/persuasion/${address}`);
          const data = await response.json();
          if (data && data.score >= 100) {
            maxPersuasion = true;
            console.log("This player has already achieved maximum persuasion!");
          }
        }
      } catch (scoreError) {
        console.warn("Error checking persuasion score:", scoreError);
      }

      const time = Number(timeRemaining.toString());
      const isOver = gameWon || time <= 0 || maxPersuasion;

      if (isOver) {
        setIsGameOver(true);
        if (onTimerEnd) {
          onTimerEnd();
        }
        toast({
          title: "Game Over",
          description: "The game has ended. No more guesses can be submitted.",
          variant: "destructive"
        });
        return;
      }

      setIsSubmitting(true);
      setIsTyping(true);

      // Get the correct required amount based on the current escalation interval
      const isEscalation = await contract.escalationActive();
      let requiredAmount;

      if (isEscalation) {
        console.log("Getting required amount for escalation mode");
        try {
          // Check which escalation period we're in from localStorage
          const escalationInterval = localStorage.getItem('escalationInterval');
          const periodIndex = escalationInterval ? parseInt(escalationInterval) - 1 : 0;

          // Ensure we have a valid period index
          if (periodIndex >= 0 && periodIndex < ESCALATION_PRICES.length) {
            // Use the exact price from our predefined table
            const { parseEther } = await import('@/lib/web3');
            const exactPrice = ESCALATION_PRICES[periodIndex];
            requiredAmount = parseEther(exactPrice);

            console.log(`Using exact price from table for period ${periodIndex + 1}: ${exactPrice} ETH`);

            // Add a tiny buffer for gas price fluctuations (0.5%)
            // This should help prevent "insufficient payment" errors
            // This is a very small amount but can make a difference
            const buffer = requiredAmount * BigInt(1005) / BigInt(1000);
            requiredAmount = buffer;
            console.log(`With tiny buffer: ${formatEther(requiredAmount)} ETH`);
          } else {
            // Fallback to contract value if period is invalid
            requiredAmount = await contract.currentRequiredAmount();
            console.log(`Using contract amount: ${formatEther(requiredAmount)} ETH`);
          }
        } catch (error) {
          console.error("Error setting required amount:", error);

          // Fallback to contract value
          requiredAmount = await contract.currentRequiredAmount();
          console.log(`Fallback to contract amount: ${formatEther(requiredAmount)} ETH`);
        }
      } else {
        // Not in escalation mode, use contract value
        try {
          // Get the required amount directly from the contract
          requiredAmount = await contract.currentRequiredAmount();
          console.log(`Using required amount from contract: ${formatEther(requiredAmount)} ETH`);

          // No overrides - always use the contract's required amount
          // This ensures we're sending exactly what the contract expects
        } catch (error) {
          console.error("Error getting required amount from contract:", error);

          // Fallback to the base game fee if contract call fails
          const { parseEther } = await import('@/lib/web3');
          requiredAmount = parseEther("0.0009"); // Use the GAME_FEE value from contract
          console.log(`Using fallback amount: ${formatEther(requiredAmount)} ETH`);
        }
      }

      const userMessage: Message = {
        text: data.response,
        timestamp: Math.floor(Date.now() / 1000),
        isUser: true
      };
      setMessages(prev => [...prev, userMessage]);
      
      // Trigger persuasion score update with custom event
      const persuasionEvent = new CustomEvent(PERSUASION_EVENT, {
        detail: { message: data.response }
      });
      document.dispatchEvent(persuasionEvent);
      console.log("Persuasion update event dispatched with message:", data.response);

      const tx = await contract.submitGuess(
        data.response,
        {
          value: requiredAmount
        }
      );

      console.log("Transaction sent:", tx.hash);

      setMessages(prev => {
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        if (lastIdx >= 0) {
          updated[lastIdx] = {
            ...updated[lastIdx],
            transaction: {
              hash: tx.hash,
              status: 'pending',
              value: requiredAmount.toString()
            }
          };
        }
        return updated;
      });

      let trumpResponse: string | null = null;
      try {
        // Pass both the message and wallet address to enable pattern detection
        trumpResponse = await generateTrumpResponse(data.response, address);
      } catch (error) {
        console.error("Error generating response:", error);
      }

      const receipt = await tx.wait();

      setMessages(prev => {
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        if (lastIdx >= 0 && updated[lastIdx].transaction) {
          updated[lastIdx].transaction.status = receipt.status === 1 ? 'confirmed' : 'failed';
        }
        return updated;
      });

      if (receipt.status === 1) {
        // Transaction successful - updating UI with Trump's response
        if (trumpResponse) {
          setMessages(prev => [
            ...prev,
            {
              text: trumpResponse,
              timestamp: Math.floor(Date.now() / 1000),
              isUser: false
            }
          ]);
        } else {
          setMessages(prev => [
            ...prev,
            {
              text: "Interesting... Keep trying to convince me! 🤔",
              timestamp: Math.floor(Date.now() / 1000),
              isUser: false
            }
          ]);
        }

        toast({
          title: "Success!",
          description: "Your message has been processed.",
          variant: "default"
        });
        form.reset();
      } else {
        toast({
          title: "Error",
          description: "Transaction failed.",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error("Submission error:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });

      setMessages(prev => [
        ...prev,
        {
          text: "Sorry, there was an error processing your message. Please try again.",
          timestamp: Math.floor(Date.now() / 1000),
          isUser: false
        }
      ]);
    } finally {
      setIsSubmitting(false);
      setIsTyping(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-2xl shadow-lg">
        <div className="flex flex-col">
          <div className="flex flex-col items-center mb-6">
            <Avatar className="h-16 w-16 mb-2">
              <AvatarImage
                src="/donald-trump-image.jpeg"
                alt="Agent Trump"
                className="object-cover object-center"
              />
              <AvatarFallback>AT</AvatarFallback>
            </Avatar>
            <span className="font-semibold text-lg">Agent Trump</span>
          </div>

          <div className="flex flex-col h-[400px]">
            <ScrollArea className="flex-1 px-4">
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] p-3 rounded-2xl ${
                        message.isUser
                          ? 'bg-blue-500 text-white rounded-tr-sm'
                          : 'bg-gray-300 dark:bg-gray-700 rounded-tl-sm'
                      }`}
                    >
                      <p className="text-sm">{message.text}</p>
                      <p className={`text-[10px] ${
                        message.isUser ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
                      } mt-1`}>
                        {formatInTimeZone(
                          message.timestamp * 1000,
                          'America/Los_Angeles',
                          'h:mmaaa MM/dd/yyyy'
                        )}
                      </p>
                      {message.transaction && (
                        <div className="mt-2 border-t border-white/20 pt-2">
                          <TransactionVisualization {...message.transaction} />
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className="flex justify-start">
                    <div className="max-w-[70%] p-3 rounded-2xl bg-gray-300 dark:bg-gray-700 rounded-tl-sm">
                      <TypingIndicator />
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="mt-4 px-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="flex gap-2 items-end">
                  <FormField
                    control={form.control}
                    name="response"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input
                            placeholder={isGameOver ? "Game has ended" : "iMessage"}
                            className={`rounded-full bg-white dark:bg-gray-800 pl-4 pr-12 py-6 text-base border-0 shadow-sm focus-visible:ring-2 focus-visible:ring-blue-500 ${
                              isGameOver ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                            disabled={isGameOver || isSubmitting}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    disabled={isSubmitting || isGameOver}
                    className={`rounded-full p-3 text-white ${
                      isGameOver
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-blue-500 hover:bg-blue-600'
                    }`}
                    size="icon"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                  </Button>
                </form>
              </Form>
              {isGameOver && (
                <p className="text-red-500 mt-2 text-sm text-center">
                  Game has ended. No more guesses can be submitted.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}