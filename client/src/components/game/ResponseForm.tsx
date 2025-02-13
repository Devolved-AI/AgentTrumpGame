import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TransactionLoader } from "./TransactionLoader";
import { Send } from "lucide-react";

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
  disabled?: boolean;
  escalationActive?: boolean;
}

export function ResponseForm({ 
  onSubmit, 
  currentAmount, 
  isLoading,
  transactionStatus = 'pending',
  disabled = false,
  escalationActive = false
}: ResponseFormProps) {
  const [showLoadingDialog, setShowLoadingDialog] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      response: "",
    },
  });

  async function handleSubmit(values: z.infer<typeof formSchema>) {
    if (disabled) return;

    setShowLoadingDialog(true);
    try {
      await onSubmit(values.response);
      form.reset();
    } finally {
      if (transactionStatus === 'error') {
        setShowLoadingDialog(false);
      }
    }
  }

  const handleDialogClose = () => {
    if (transactionStatus !== 'pending') {
      setShowLoadingDialog(false);
    }
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="flex items-center gap-2 px-4 py-2 bg-[#ffffff] border-t border-gray-200">
          <FormField
            control={form.control}
            name="response"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormControl>
                  <Input
                    placeholder={disabled ? "Game is over!" : "iMessage"}
                    className="rounded-full border-gray-300 bg-gray-100 focus:ring-2 focus:ring-blue-500 text-[15px] font-[-apple-system] h-9"
                    disabled={disabled || isLoading}
                    {...field}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <Button 
            type="submit" 
            size="icon"
            disabled={disabled || isLoading || !form.getValues().response}
            className="rounded-full w-9 h-9 bg-[#007AFF] hover:bg-[#0056b3] disabled:bg-gray-300 transition-colors"
          >
            <Send className="h-4 w-4 text-white" />
          </Button>
        </form>
      </Form>

      <Dialog open={showLoadingDialog} onOpenChange={handleDialogClose}>
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
            onClose={handleDialogClose}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}