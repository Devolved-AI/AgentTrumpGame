import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { TransactionLoader } from "./TransactionLoader";

const formSchema = z.object({
  response: z.string()
    .min(1, "Response is required")
    .max(2000, "Response must be less than 2000 characters"),
});

interface ResponseFormProps {
  onSubmit: (response: string) => Promise<void>;
  currentAmount: string;
  isLoading: boolean;
  transactionStatus?: 'pending' | 'success' | 'error';
}

export function ResponseForm({ 
  onSubmit, 
  currentAmount, 
  isLoading,
  transactionStatus = 'pending'
}: ResponseFormProps) {
  const [showLoadingDialog, setShowLoadingDialog] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      response: "",
    },
  });

  async function handleSubmit(values: z.infer<typeof formSchema>) {
    setShowLoadingDialog(true);
    try {
      await onSubmit(values.response);
      form.reset();
    } finally {
      // Dialog will be closed by the parent component
      setShowLoadingDialog(false);
    }
  }

  return (
    <>
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
              Submit Response
            </Button>
          </div>
        </form>
      </Form>

      <Dialog open={showLoadingDialog} onOpenChange={setShowLoadingDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <TransactionLoader 
            status={transactionStatus}
            message={
              transactionStatus === 'pending' 
                ? "Processing your blockchain transaction..." 
                : transactionStatus === 'success'
                ? "Transaction confirmed successfully!"
                : "Transaction failed"
            }
          />
        </DialogContent>
      </Dialog>
    </>
  );
}