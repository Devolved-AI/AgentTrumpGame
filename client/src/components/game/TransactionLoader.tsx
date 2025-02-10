import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

interface TransactionLoaderProps {
  message?: string;
}

const messages = [
  "Initiating blockchain transaction...",
  "Waiting for confirmation...",
  "Almost there...",
  "Transaction processing..."
];

export function TransactionLoader({ message }: TransactionLoaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col items-center justify-center p-6 space-y-4"
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        className="relative"
      >
        <Loader2 className="w-12 h-12 text-blue-500" />
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 rounded-full bg-blue-500/20"
        />
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-center space-y-2"
      >
        <p className="text-lg font-semibold text-gray-700">
          {message || messages[Math.floor(Math.random() * messages.length)]}
        </p>
        <p className="text-sm text-gray-500">
          Please don't close this window
        </p>
      </motion.div>
    </motion.div>
  );
}
