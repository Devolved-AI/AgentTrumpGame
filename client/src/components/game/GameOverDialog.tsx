import { Dialog, DialogContent } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { formatEth, formatUSD } from "@/lib/utils";

interface GameOverDialogProps {
  isOpen: boolean;
  onClose: () => void;
  winningAmount: string;
  ethPrice: number;
}

export function GameOverDialog({ isOpen, onClose, winningAmount, ethPrice }: GameOverDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center space-y-6 py-6"
        >
          <motion.h2 
            className="text-3xl font-bold bg-gradient-to-r from-red-500 via-white to-blue-500 bg-clip-text text-transparent"
            initial={{ y: -20 }}
            animate={{ y: 0 }}
          >
            The Game Is Over
          </motion.h2>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="space-y-2"
          >
            <p className="text-xl">Thanks For Playing!</p>
            <p className="text-sm text-muted-foreground">
              The winning amount was:
            </p>
            <p className="text-2xl font-bold text-green-500">
              {formatUSD(parseFloat(winningAmount) * ethPrice)}
              <span className="text-lg ml-2">
                ({formatEth(winningAmount)} ETH)
              </span>
            </p>
          </motion.div>

          <motion.img
            src="/trump-thinking.svg"
            alt="Trump Thinking"
            className="w-24 h-24 mx-auto"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          />
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
