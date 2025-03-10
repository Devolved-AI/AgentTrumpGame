import { motion } from "framer-motion";
import { ExternalLink, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { formatEther } from "@/lib/web3";

interface TransactionVisualizationProps {
  hash: string;
  status: 'pending' | 'confirmed' | 'failed';
  value?: string;
  ownerHash?: string;
  splitDetails?: {
    contractAmount: string;
    ownerAmount: string;
  };
}

export function TransactionVisualization({ hash, status, value, ownerHash, splitDetails }: TransactionVisualizationProps) {
  const explorerUrl = `https://sepolia.basescan.org/tx/${hash}`;
  const ownerExplorerUrl = ownerHash ? `https://sepolia.basescan.org/tx/${ownerHash}` : '';
  
  const statusConfig = {
    pending: {
      icon: Clock,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500",
      message: "Transaction Pending"
    },
    confirmed: {
      icon: CheckCircle2,
      color: "text-green-500",
      bgColor: "bg-green-500",
      message: "Transaction Confirmed"
    },
    failed: {
      icon: AlertCircle,
      color: "text-red-500",
      bgColor: "bg-red-500",
      message: "Transaction Failed"
    }
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="self-center max-w-[90%] w-fit bg-secondary/50 p-4 rounded-xl my-4"
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`h-5 w-5 ${config.color}`} />
        <span className="font-medium">{config.message}</span>
      </div>
      
      {value && (
        <div className="text-sm text-muted-foreground mb-2">
          Amount: {formatEther(value)} ETH
        </div>
      )}

      <div className="flex items-center gap-2">
        <motion.div 
          className="h-1 flex-1 rounded-full bg-secondary overflow-hidden"
        >
          <motion.div 
            className={`h-full ${config.bgColor}`}
            initial={{ width: "0%" }}
            animate={{ 
              width: status === 'confirmed' ? "100%" : 
                     status === 'failed' ? "100%" : 
                     "90%" 
            }}
            transition={{ 
              duration: status === 'pending' ? 2 : 0.5,
              repeat: status === 'pending' ? Infinity : 0
            }}
          />
        </motion.div>
        
        <a 
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-500 flex items-center gap-1"
        >
          View
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </motion.div>
  );
}
