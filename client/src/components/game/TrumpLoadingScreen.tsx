import { motion } from "framer-motion";
import { SiEthereum } from "react-icons/si";

export function TrumpLoadingScreen() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-gradient-to-b from-blue-900 to-blue-950 flex flex-col items-center justify-center z-50"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="w-32 h-32 mb-8"
      >
        <img
          src="/aitubo.jpg"
          alt="Agent Trump"
          className="w-full h-full object-cover rounded-full border-4 border-red-500 shadow-lg shadow-red-500/50"
        />
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-center"
      >
        <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-red-500 via-white to-blue-500 text-transparent bg-clip-text">
          Making Blockchain Great Again
        </h1>
        
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatType: "reverse"
          }}
          className="flex items-center justify-center gap-2 text-white/80"
        >
          <SiEthereum className="w-6 h-6" />
          <span>Loading tremendous things...</span>
        </motion.div>
      </motion.div>

      <motion.div
        className="mt-8 flex gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="w-3 h-3 rounded-full bg-red-500"
            animate={{
              scale: [1, 1.5, 1],
              opacity: [1, 0.5, 1],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: i * 0.2,
            }}
          />
        ))}
      </motion.div>
    </motion.div>
  );
}
