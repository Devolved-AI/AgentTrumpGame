import { Dialog, DialogContent } from "@/components/ui/dialog";
import { motion } from "framer-motion";

interface GameOverDialogProps {
  isOpen: boolean;
  onClose: () => void;
  lastBlock: number;
  winnerAddress?: string;
  lastGuessAddress: string;
}

export function GameOverDialog({ 
  isOpen, 
  onClose, 
  lastBlock,
  winnerAddress,
  lastGuessAddress 
}: GameOverDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center space-y-6 py-6"
        >
          <motion.h2 
            className="text-3xl font-bold"
            initial={{ y: -20 }}
            animate={{ y: 0 }}
          >
            The Game Is Over
          </motion.h2>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            <p className="text-xl">Thanks For Playing!</p>

            <div className="text-left space-y-2 mt-4">
              <p className="text-sm">
                <span className="font-semibold">Last Block:</span> {lastBlock}
              </p>
              {winnerAddress && (
                <p className="text-sm">
                  <span className="font-semibold">Winner Wallet Address:</span>
                  <br />
                  <span className="font-mono">{winnerAddress}</span>
                </p>
              )}
              <p className="text-sm">
                <span className="font-semibold">Last Guess Wallet Address:</span>
                <br />
                <span className="font-mono">{lastGuessAddress}</span>
              </p>
            </div>
          </motion.div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}