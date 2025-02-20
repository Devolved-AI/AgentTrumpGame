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
      const requiredAmount = await contract.currentRequiredAmount();

      // Use enhanced sentiment analysis
      const analysis = analyzeMessageSentiment(data.response);
      console.log("Message analysis:", analysis);

      // Format the message with score adjustment in a strict format
      // The contract looks for this exact prefix pattern
      const encodedResponse = `SCORE_${analysis.score}_${data.response}`;
      console.log("Sending encoded response:", encodedResponse);

      const userMessage: Message = {
        text: data.response,
        timestamp: Date.now() / 1000,
        isUser: true
      };
      setMessages(prev => [...prev, userMessage]);

      setIsTyping(true);

      // Send the encoded response to the contract
      const tx = await contract.submitGuess(
        encodedResponse,
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

      // Show detailed feedback about the message analysis
      const breakdownText = analysis.breakdown
        .map(b => `${b.category}: ${b.count} word(s)`)
        .join(', ');

      toast({
        title: `Message Analysis (${analysis.type})`,
        description: `Score adjustment: ${analysis.score}
                     ${breakdownText ? `\nBreakdown: ${breakdownText}` : ''}`,
        duration: 5000
      });

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
        // Verify the score was updated by explicitly fetching it
        const oldScore = await contract.getPlayerPersuasionScore(address);
        console.log("Previous score:", Number(oldScore));

        // Wait a moment for the blockchain to process the score update
        await new Promise(resolve => setTimeout(resolve, 2000));

        const newScore = await contract.getPlayerPersuasionScore(address);
        console.log("New score after update:", Number(newScore));

        const trumpResponse = await generateTrumpResponse(data.response);

        setMessages(prev => [
          ...prev,
          {
            text: trumpResponse,
            timestamp: Date.now() / 1000,
            isUser: false
          }
        ]);

        toast({
          title: "Success!",
          description: `Your message has been processed. Score changed from ${Number(oldScore)} to ${Number(newScore)}`,
          variant: "default"
        });
        form.reset();
      } else {
        setIsTyping(false);
        toast({
          title: "Error",
          description: "Transaction failed.",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error("Submission error:", error);
      setIsTyping(false);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
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