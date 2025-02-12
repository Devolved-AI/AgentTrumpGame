import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { motion } from "framer-motion";

interface AgentTrumpDialogProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
  variant: 'success' | 'error';
}

export function AgentTrumpDialog({ isOpen, onClose, message, variant }: AgentTrumpDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Agent Trump Says:</DialogTitle>
        </DialogHeader>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mt-4 p-6 rounded-lg ${
            variant === 'success' 
              ? 'bg-green-50 text-green-900' 
              : 'bg-red-50 text-red-900'
          }`}
        >
          <div className="relative message-bubble">
            <p className="text-lg">{message}</p>
            <div className="absolute left-[-12px] top-[15px] w-4 h-4 transform rotate-45"
              style={{
                backgroundColor: variant === 'success' ? 'rgb(240 253 244)' : 'rgb(254 242 242)'
              }}
            />
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
