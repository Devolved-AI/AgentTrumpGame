import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  response: z.string()
    .min(1, "Response is required")
    .max(2000, "Response must be less than 2000 characters"),
});

interface ResponseFormProps {
  onSubmit: (response: string) => Promise<void>;
  currentAmount: string;
  isLoading: boolean;
}

export function ResponseForm({ onSubmit, currentAmount, isLoading }: ResponseFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      response: "",
    },
  });

  async function handleSubmit(values: z.infer<typeof formSchema>) {
    await onSubmit(values.response);
    form.reset();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="response"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Your Response</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter your response..."
                  className="h-32"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Required Amount: <span className="font-bold">{currentAmount} ETH</span>
          </p>
          <Button 
            type="submit" 
            disabled={isLoading}
            className="bg-gradient-to-r from-blue-600 to-blue-700"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Response
          </Button>
        </div>
      </form>
    </Form>
  );
}
