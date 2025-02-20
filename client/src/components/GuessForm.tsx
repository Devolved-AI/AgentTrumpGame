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
  exists?: boolean; // Added exists property
}

export function GuessForm() {
  const { contract, address } = useWeb3Store();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [transaction, setTransaction] = useState<TransactionState | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    if (!contract || !address) return;

    const loadResponses = async () => {
      const count = await contract.getPlayerResponseCount(address);
      const responses = [];

      for (let i = 0; i < count; i++) {
        const [text, timestamp, exists] = await contract.getPlayerResponseByIndex(address, i);
        // Safely convert timestamp to number, handling both BigNumber and regular number cases
        const timestampNum = typeof timestamp === 'object' && 'toNumber' in timestamp 
          ? timestamp.toNumber() 
          : Number(timestamp);

        responses.push({ text, timestamp: timestampNum, exists });
      }

      setMessages(responses.reverse());
    };

    loadResponses();

    // Listen for new responses
    const filter = contract.filters.GuessSubmitted(address);
    contract.on(filter, (player, amount, multiplier, response, blockNumber) => {
      setMessages(prev => [{
        text: response,
        timestamp: Date.now() / 1000, // Convert to Unix timestamp (seconds)
        isUser: true
      }, ...prev]);
    });

    return () => {
      contract.removeAllListeners(filter);
    };
  }, [contract, address]);

  const currentTime = formatInTimeZone(
    new Date(),
    'America/Los_Angeles',
    'h:mma MM/dd/yyyy'
  );

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
      setIsTyping(true);

      const requiredAmount = await contract.currentRequiredAmount();
      const tx = await contract.submitGuess(data.response, {
        value: requiredAmount
      });

      // Add user message immediately
      setMessages(prev => [...prev, {
        text: data.response,
        timestamp: Date.now() / 1000, // Convert to Unix timestamp (seconds)
        isUser: true
      }]);

      // Set initial transaction state
      setTransaction({
        hash: tx.hash,
        status: 'pending',
        value: requiredAmount.toString()
      });

      toast({
        title: "Submitting guess...",
        description: "Please wait for the transaction to be confirmed."
      });

      // Wait for transaction confirmation
      const receipt = await tx.wait();

      // Update transaction state based on receipt
      setTransaction(prev => prev ? {
        ...prev,
        status: receipt.status === 1 ? 'confirmed' : 'failed'
      } : null);

      // Simulate Agent Trump typing before showing response
      await new Promise(resolve => setTimeout(resolve, 2000));
      setIsTyping(false);

      if (receipt.status === 1) {
        toast({
          title: "Success!",
          description: "Your guess has been submitted.",
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
      setIsTyping(false);
      setTransaction(prev => prev ? {
        ...prev,
        status: 'failed'
      } : null);

      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-2xl shadow-lg">
        <div className="flex flex-col">
          {/* Avatar and name at the top */}
          <div className="flex flex-col items-center mb-6">
            <Avatar className="h-16 w-16 mb-2">
              <AvatarImage 
                src="/assets/donald-trump-image.jpeg" 
                alt="Agent Trump"
                className="object-cover object-center" 
              />
              <AvatarFallback>AT</AvatarFallback>
            </Avatar>
            <span className="font-semibold text-lg">Agent Trump</span>
          </div>

          {/* Messages container */}
          <div className="flex flex-col h-[400px]">
            <ScrollArea className="flex-1 px-4">
              <div className="space-y-4">
                <div className="self-start max-w-[70%] bg-gray-300 dark:bg-gray-700 p-3 rounded-2xl rounded-tl-sm">
                  <p className="text-sm">Hey there! I'm Agent Trump. Try to convince me to give you the money in the prize pool!</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">{currentTime}</p>
                </div>

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
                    </div>
                  </div>
                ))}

                {transaction && <TransactionVisualization {...transaction} />}
                {isTyping && <TypingIndicator />}
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