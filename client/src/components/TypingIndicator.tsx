import { motion } from "framer-motion";

export function TypingIndicator() {
  return (
    <div className="self-start max-w-[70px] bg-gray-300 dark:bg-gray-700 p-2 rounded-2xl rounded-tl-sm mt-2">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.4, 1, 0.4],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: i * 0.2,
            }}
          />
        ))}
      </div>
    </div>
  );
}
