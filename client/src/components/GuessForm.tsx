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
import { analyzeMessageSentiment } from "@/lib/utils";

const WELCOME_MESSAGE = {
  text: "Hey there! I'm Agent Trump. Try to convince me to give you the money in the prize pool!",
  timestamp: Date.now() / 1000,
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

export function GuessForm() {
  const { contract, address } = useWeb3Store();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);

  // Reset messages when wallet changes
  useEffect(() => {
    // Always reset to just the welcome message when wallet changes
    setMessages([WELCOME_MESSAGE]);

    // Don't try to load history if no wallet is connected
    if (!contract || !address) {
      return;
    }

    // Load historical responses only if wallet is connected
    const loadResponses = async () => {
      try {
        const count = await contract.getPlayerResponseCount(address);
        const responses = [];

        for (let i = 0; i < count; i++) {
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

        // Only append responses if we're still connected
        if (contract && address) {
          setMessages(prev => [WELCOME_MESSAGE, ...responses]);
        }
      } catch (error) {
        console.error("Error loading responses:", error);
        toast({
          title: "Error",
          description: "Failed to load message history",
          variant: "destructive"
        });
      }
    };

    loadResponses();

    return () => {
      // Reset to welcome message when cleaning up
      setMessages([WELCOME_MESSAGE]);
    };
  }, [contract, address]); // Only depend on contract and address changes

  const form = useForm<z.infer<typeof guessSchema>>({
    resolver: zodResolver(guessSchema),
    defaultValues: {
      response: ""
    }
  });

  const onSubmit = async (data: z.infer<typeof guessSchema>) => {
    if (!contract) return;

    try {
      setIsSubmitting(true);
      setIsTyping(true);
      const requiredAmount = await contract.currentRequiredAmount();

      // Use enhanced sentiment analysis
      const analysis = analyzeMessageSentiment(data.response);
      console.log("Message analysis:", analysis);

      // Format for contract: `ADJUST_SCORE:${score};${message}`
      const encodedResponse = `ADJUST_SCORE:${analysis.score};${data.response}`;
      console.log("Sending encoded response:", encodedResponse);

      const userMessage: Message = {
        text: data.response,
        timestamp: Date.now() / 1000,
        isUser: true
      };
      setMessages(prev => [...prev, userMessage]);

      // Send the encoded response to the contract
      const tx = await contract.submitGuess(
        encodedResponse,
        {
          value: requiredAmount
        }
      );

      console.log("Transaction sent:", tx.hash);

      // Update message with transaction info
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

      // Generate Trump's response while waiting for transaction
      let trumpResponse: string | null = null;
      try {
        trumpResponse = await generateTrumpResponse(data.response);
      } catch (error) {
        console.error("Error generating response:", error);
        // Don't throw here, we still want to process the transaction
      }

      // Wait for transaction confirmation
      const receipt = await tx.wait();

      // Update message transaction status
      setMessages(prev => {
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        if (lastIdx >= 0 && updated[lastIdx].transaction) {
          updated[lastIdx].transaction.status = receipt.status === 1 ? 'confirmed' : 'failed';
        }
        return updated;
      });

      if (receipt.status === 1) {
        // Get score changes
        const oldScore = await contract.getPlayerPersuasionScore(address);
        const oldScoreNum = typeof oldScore === 'object' && 'toNumber' in oldScore 
          ? oldScore.toNumber() 
          : Number(oldScore);

        // Small delay for blockchain processing
        await new Promise(resolve => setTimeout(resolve, 2000));

        const newScore = await contract.getPlayerPersuasionScore(address);
        const newScoreNum = typeof newScore === 'object' && 'toNumber' in newScore 
          ? newScore.toNumber() 
          : Number(newScore);

        // Add Trump's response if generation was successful
        if (trumpResponse) {
          setMessages(prev => [
            ...prev,
            {
              text: trumpResponse,
              timestamp: Date.now() / 1000,
              isUser: false
            }
          ]);
        } else {
          // Fallback response if generation failed
          setMessages(prev => [
            ...prev,
            {
              text: "Interesting... Keep trying to convince me! 🤔",
              timestamp: Date.now() / 1000,
              isUser: false
            }
          ]);
        }

        // Show score change toast
        toast({
          title: "Success!",
          description: `Your message has been processed. Score changed from ${oldScoreNum} to ${newScoreNum}`,
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

      // Add system message about the error
      setMessages(prev => [
        ...prev,
        {
          text: "Sorry, there was an error processing your message. Please try again.",
          timestamp: Date.now() / 1000,
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
                          'h:mma MM/dd/yyyy'
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
                            placeholder="iMessage"
                            className="rounded-full bg-white dark:bg-gray-800 pl-4 pr-12 py-6 text-base border-0 shadow-sm focus-visible:ring-2 focus-visible:ring-blue-500"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="rounded-full p-3 bg-blue-500 hover:bg-blue-600 text-white"
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}