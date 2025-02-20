import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useWeb3Store, parseEther } from "@/lib/web3";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const guessSchema = z.object({
  response: z.string()
    .min(1, "Response is required")
    .max(2000, "Response too long")
});

export function GuessForm() {
  const { contract } = useWeb3Store();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="response"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input
                  placeholder="Enter your guess..."
                  className="h-20 text-lg"
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
          className="w-full bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            'Submit Guess'
          )}
        </Button>
      </form>
    </Form>
  );
}
