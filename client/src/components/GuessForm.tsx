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

  // Reset messages when the component mounts or when wallet changes
  useEffect(() => {
    // Always start with the welcome message
    setMessages([WELCOME_MESSAGE]);

    // If no wallet is connected, keep only the welcome message
    if (!address || !contract) {
      return;
    }

    // Load historical responses for the connected wallet
    const loadResponses = async () => {
      try {
        const count = await contract.getPlayerResponseCount(address);
        const responses: Message[] = [];

        for (let i = 0; i < count; i++) {
          const [text, timestamp, exists] = await contract.getPlayerResponseByIndex(address, i);
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

        if (responses.length > 0) {
          setMessages(prev => [...prev, ...responses]);
        }
      } catch (error) {
        console.error("Error loading responses:", error);
      }
    };

    // Set up event listener for new submissions
    const filter = contract.filters.GuessSubmitted(address);
    const handleGuessSubmitted = (player: string, amount: any, multiplier: any, response: string) => {
      console.log("New guess submitted, transaction confirmed");
    };

    contract.on(filter, handleGuessSubmitted);
    loadResponses();

    // Cleanup function
    return () => {
      contract.off(filter, handleGuessSubmitted);
    };
  }, [contract, address]); // Dependencies that trigger reset

  const form = useForm<z.infer<typeof guessSchema>>({
    resolver: zodResolver(guessSchema),
    defaultValues: {
      response: ""
    }
  });

  async function onSubmit(data: z.infer<typeof guessSchema>) {
    if (!contract) return;

    try {
      setIsSubmitting(true);
      const requiredAmount = await contract.currentRequiredAmount();

      // Analyze message sentiment before submitting
      const sentiment = analyzeMessageSentiment(data.response);
      console.log("Message sentiment:", sentiment);

      const userMessage: Message = {
        text: data.response,
        timestamp: Date.now() / 1000,
        isUser: true
      };
      setMessages(prev => [...prev, userMessage]);

      setIsTyping(true);

      // Submit guess with sentiment score encoded in the response
      const tx = await contract.submitGuess(
        JSON.stringify({
          response: data.response,
          scoreAdjustment: sentiment.score, // Changed to explicitly show this is an adjustment
          sentimentType: sentiment.type,
          isAdjustment: true // Flag to indicate this should adjust the current score
        }),
        {
          value: requiredAmount
        }
      );

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

      toast({
        title: `Submitting guess... (${sentiment.type})`,
        description: `Your message was analyzed as ${sentiment.type} (score adjustment: ${sentiment.score})`
      });

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
          description: "Your guess has been submitted.",
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
  }

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