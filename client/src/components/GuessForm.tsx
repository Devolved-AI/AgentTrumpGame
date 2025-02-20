import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useWeb3Store, parseEther } from "@/lib/web3";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

const guessSchema = z.object({
  response: z.string()
    .min(1, "Response is required")
    .max(2000, "Response too long")
});

export function GuessForm() {
  const { contract } = useWeb3Store();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentTime = formatInTimeZone(
    new Date(),
    'America/Los_Angeles',
    'h:mm a MM/dd/yyyy'
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
      const requiredAmount = await contract.currentRequiredAmount();
      const tx = await contract.submitGuess(data.response, {
        value: requiredAmount
      });

      toast({
        title: "Submitting guess...",
        description: "Please wait for the transaction to be confirmed."
      });

      await tx.wait();

      toast({
        title: "Success!",
        description: "Your guess has been submitted.",
        variant: "default"
      });

      form.reset();
    } catch (error: any) {
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
        <div className="flex justify-center mb-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full" />
            <div className="w-3 h-3 bg-yellow-500 rounded-full" />
            <div className="w-3 h-3 bg-green-500 rounded-full" />
          </div>
        </div>

        <div className="flex flex-col h-[400px]">
          <ScrollArea className="flex-1 px-4">
            <div className="space-y-4">
              <div className="self-start max-w-[70%] bg-gray-300 dark:bg-gray-700 p-3 rounded-2xl rounded-tl-sm">
                <p className="text-sm">Hey there! I'm Agent Trump. Try to convince me to give you the money in the prize pool!</p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">{currentTime}</p>
              </div>
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
  );
}