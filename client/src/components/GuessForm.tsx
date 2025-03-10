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
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  
  // Log on initial render if the game is interactive or not
  console.log("Initial message input state:", { 
    disabled: isGameOver || isSubmitting, 
    isGameOver, 
    isSubmitting, 
    hasWallet: !!address 
  });
  const [typingData, setTypingData] = useState<{
    lastKeypressTime: number;
    keypressIntervals: number[];
  }>({
    lastKeypressTime: 0,
    keypressIntervals: []
  });

  useEffect(() => {
    setMessages([WELCOME_MESSAGE]);

    if (!contract || !address) {
      console.log("Wallet not connected or contract not available:", { contract: !!contract, address });
      return;
    }
    
    console.log("Wallet connected successfully:", { address });

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
        const [gameWon, timeRemaining, escalationActive] = await Promise.all([
          contract.gameWon(),
          contract.getTimeRemaining(),
          contract.escalationActive()
        ]);
        const time = Number(timeRemaining.toString());
        const isOver = gameWon || time <= 0;
        
        console.log("Game state check:", { gameWon, time, isOver, escalationActive });

        if (isOver && !escalationActive) {
          console.log("Game is determined to be over");
          setIsGameOver(true);
          if (onTimerEnd) {
            onTimerEnd();
          }
          // Ensure we stop checking once the game is over
          clearInterval(interval);
        } else {
          console.log("Game is active and running");
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
    
    // Listen for escalation mode events
    const handleEscalationStarted = (event: Event) => {
      console.log("Escalation mode started event received in GuessForm", 
        (event as CustomEvent<{interval: number, price: string}>).detail);
      
      // Reset game over state since we're now in escalation mode
      setIsGameOver(false);
    };
    
    window.addEventListener('game-over', handleGameOver);
    document.addEventListener('escalation-started', handleEscalationStarted);

    return () => {
      clearInterval(interval);
      window.removeEventListener('game-over', handleGameOver);
      document.removeEventListener('escalation-started', handleEscalationStarted);
    };
  }, [contract, onTimerEnd]);

  const form = useForm<z.infer<typeof guessSchema>>({
    resolver: zodResolver(guessSchema),
    defaultValues: {
      response: ""
    }
  });

  // This function helps detect anomalies in typing patterns
  const detectPastedText = (text: string): boolean => {
    // Human typing typically shows more variation in typing speed and rhythm
    // For this function, we'll only detect the most obvious cases of automated input
    // to avoid false positives with genuine user typing
    
    // 1. Only check for the immediate submission after loading the page
    // This check is now much more lenient to avoid false positives
    const lastInputTimestamp = localStorage.getItem('lastInputTimestamp');
    const unusualTypingSpeed = text.length > 300 && 
      lastInputTimestamp !== null && 
      (Date.now() - parseInt(lastInputTimestamp || '0')) < 100;
    
    // 2. Rhythm detection is now more permissive 
    let suspiciousRhythm = false;
    
    // We need a significant number of keystrokes to analyze patterns accurately
    if (typingData.keypressIntervals.length >= 20) {
      // Calculate standard deviation of intervals - human typing has natural variance
      const avg = typingData.keypressIntervals.reduce((sum, val) => sum + val, 0) / typingData.keypressIntervals.length;
      const variance = typingData.keypressIntervals.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / typingData.keypressIntervals.length;
      const stdDev = Math.sqrt(variance);
      
      // Much more permissive rhythm detection - will only catch extremely robotic patterns
      if (avg > 0 && (stdDev / avg < 0.1) && avg < 20 && text.length > 200) {
        suspiciousRhythm = true;
        console.log("Suspicious typing rhythm detected", { avg, stdDev, ratio: stdDev/avg });
      }
    }
    
    // 3. Check for certain invisible characters that occur only in pasted text
    // This check is still useful as these characters don't appear in normal typing
    const hasUnusualCharacters = /[\u200B-\u200F\uFEFF]/.test(text);
    
    // 4. Length ratio check is now much more lenient
    const keystrokesToTextRatio = typingData.keypressIntervals.length > 0 ? 
      typingData.keypressIntervals.length / text.length : 0;
    const suspiciousLength = text.length > 200 && keystrokesToTextRatio < 0.1;
    
    // We now require multiple conditions to be true to reduce false positives
    // Normal typing should easily pass this check now
    return hasUnusualCharacters || (suspiciousRhythm && suspiciousLength && unusualTypingSpeed);
  };

  const onSubmit = async (data: z.infer<typeof guessSchema>) => {
    // Store the timestamp when user submits
    localStorage.setItem('lastInputTimestamp', Date.now().toString());
    
    // Check if the response appears to be pasted text
    if (detectPastedText(data.response)) {
      toast({
        title: "Automated Input Detected",
        description: "Please type your message manually. Copy-pasted text is not allowed.",
        variant: "destructive"
      });
      return;
    }
    
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
      const [gameWon, timeRemaining, escalationActive] = await Promise.all([
        contract.gameWon(),
        contract.getTimeRemaining(),
        contract.escalationActive()
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
      
      // Game is over if:
      // 1. Someone has already won the game, OR
      // 2. Timer is at 0 AND we're not in escalation mode yet (giving time for escalation to start), OR
      // 3. Player has reached maximum persuasion score
      const isOver = gameWon || (time <= 0 && !escalationActive) || maxPersuasion;
      
      console.log("Game status check before submission:", { 
        gameWon, 
        time, 
        escalationActive, 
        maxPersuasion,
        isOver
      });

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

            // Add a 10% buffer for gas price fluctuations
            // This should help prevent "insufficient payment" errors and match the UI message
            const buffer = requiredAmount * BigInt(110) / BigInt(100); // 10% buffer
            requiredAmount = buffer;
            console.log(`With 10% buffer: ${formatEther(requiredAmount)} ETH (original: ${exactPrice} ETH)`);
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
        // Add a unique timestamp to ensure we always get a unique response
        const uniqueInput = `${data.response} [Timestamp: ${new Date().toISOString()}]`;
        console.log(`Sending uniqueInput to OpenAI: ${uniqueInput.substring(0, 50)}...`);
        trumpResponse = await generateTrumpResponse(uniqueInput, address || undefined);
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
        // Display Trump's response (AI-generated or fallback)
        setMessages(prev => [
          ...prev,
          {
            text: trumpResponse || "Interesting... Keep trying to convince me! 🤔",
            timestamp: Math.floor(Date.now() / 1000),
            isUser: false
          }
        ]);
        
        // Trigger persuasion score update with custom event AFTER Trump's response
        // Use Trump's response for persuasion score calculation, not the user's message
        const persuasionEvent = new CustomEvent(PERSUASION_EVENT, {
          detail: { message: trumpResponse || "Interesting... Keep trying to convince me! 🤔" }
        });
        document.dispatchEvent(persuasionEvent);
        console.log("Persuasion update event dispatched with Trump's response:", trumpResponse);
        console.log("Persuasion update event dispatched with Trump's response:", trumpResponse);

        toast({
          title: "Success!",
          description: "Your message has been processed.",
          variant: "default"
        });
        form.reset();
        // Reset typing data on successful submission
        setTypingData({
          lastKeypressTime: 0,
          keypressIntervals: []
        });
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
                            onKeyDown={(e) => {
                              // Skip for non-printing keys like arrows, shift, etc.
                              if (e.key.length > 1 && !['Backspace', 'Delete'].includes(e.key)) {
                                return;
                              }
                              
                              const now = Date.now();
                              
                              // If this isn't the first keypress, calculate the interval
                              if (typingData.lastKeypressTime > 0) {
                                const interval = now - typingData.lastKeypressTime;
                                
                                // Store the typing interval
                                setTypingData(prev => ({
                                  lastKeypressTime: now,
                                  keypressIntervals: [...prev.keypressIntervals.slice(-20), interval]
                                }));
                              } else {
                                // First keypress, just record the time
                                setTypingData(prev => ({
                                  ...prev,
                                  lastKeypressTime: now
                                }));
                              }
                            }}
                            onPaste={(e) => {
                              // Allow pasting, but monitor for automated behavior patterns
                              const pastedText = e.clipboardData.getData('text');
                              
                              // Only block pastes that contain unusual characters or are extremely long
                              if (/[\u200B-\u200F\uFEFF]/.test(pastedText) || pastedText.length > 500) {
                                e.preventDefault();
                                toast({
                                  title: "Unusual Content Detected",
                                  description: "Your pasted content contains unusual characters or is too long.",
                                  variant: "destructive"
                                });
                                return false;
                              }
                              
                              // Record the paste action in typing data to help with rhythm analysis
                              setTypingData(prev => ({
                                lastKeypressTime: Date.now(),
                                keypressIntervals: [...prev.keypressIntervals.slice(-20), 0] // 0 interval indicates paste
                              }));
                            }}
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