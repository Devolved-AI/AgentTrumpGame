import { motion } from "framer-motion";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TransactionLoaderProps {
  message?: string;
  status?: 'pending' | 'success' | 'error';
  onClose?: () => void;
}

const messages = [
  "Initiating blockchain transaction...",
  "Waiting for confirmation...",
  "Almost there...",
  "Transaction processing..."
];

const successMessages = [
  "Transaction confirmed!",
  "Block created successfully!",
  "Your transaction is now on-chain!"
];

const trumpResponses = [
  "Folks, that response wasn't tremendous enough. Many people say you need more winning energy. Try again!",
  "Not a perfect response, believe me. We need something much stronger, much more beautiful!",
  "That was low energy! We need high energy responses to make blockchain great again!"
];

export function TransactionLoader({ message, status = 'pending', onClose }: TransactionLoaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col items-center justify-center p-6 space-y-4"
    >
      {status === 'error' && (
        <div className="w-24 h-24 mb-2">
          <img
            src="/trump-thinking.svg"
            alt="Trump Thinking"
            className="w-full h-full object-contain"
          />
        </div>
      )}

      {status === 'pending' && (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 className="h-12 w-12 text-blue-500" />
        </motion.div>
      )}

      {status === 'success' && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 10 }}
        >
          <CheckCircle2 className="h-16 w-16 text-green-500" />
        </motion.div>
      )}

      {status === 'error' && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 10 }}
        >
          <XCircle className="h-16 w-16 text-red-500" />
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-center space-y-2"
      >
        <p className="text-lg font-semibold text-gray-700">
          {status === 'success'
            ? successMessages[Math.floor(Math.random() * successMessages.length)]
            : status === 'error'
            ? trumpResponses[Math.floor(Math.random() * trumpResponses.length)]
            : message || messages[Math.floor(Math.random() * messages.length)]
          }
        </p>
        <p className="text-sm text-gray-500">
          {status === 'pending' && "Please don't close this window"}
        </p>
      </motion.div>

      {status === 'success' && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-4 space-y-4"
        >
          <div className="px-4 py-2 bg-green-100 text-green-800 rounded-md text-sm">
            Transaction has been confirmed on the blockchain
          </div>
          {onClose && (
            <Button
              onClick={onClose}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700"
            >
              Close
            </Button>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}