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

        {/* Chain of blocks */}
        <div className="absolute -top-6 -left-6 -right-6 -bottom-6">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-3 h-3 bg-blue-500 rounded-sm"
              initial={{ scale: 0 }}
              animate={{
                scale: [0, 1, 1, 0],
                rotate: [0, 90, 180, 270],
                opacity: [0, 1, 1, 0],
                x: [0, 20, 0, -20],
                y: [0, -20, 0, 20],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                delay: i * 0.5,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>

        {/* Data flow particles */}
        <div className="absolute inset-0">
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-blue-400 rounded-full"
              initial={{ scale: 0, x: -20, y: -20 }}
              animate={{
                scale: [0, 1, 0],
                x: [0, 20, 0],
                y: [0, 20, 0],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.25,
                ease: "linear",
              }}
            />
          ))}
        </div>
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