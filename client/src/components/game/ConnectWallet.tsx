import { Button } from "@/components/ui/button";
import { Wallet, Loader2 } from "lucide-react";

interface ConnectWalletProps {
  onConnect: () => void;
  isConnected: boolean;
  account: string | null;
  isConnecting: boolean;
  wrongNetwork: boolean;
}

export function ConnectWallet({ 
  onConnect, 
  isConnected, 
  account, 
  isConnecting,
  wrongNetwork 
}: ConnectWalletProps) {
  if (isConnecting) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-yellow-500 shadow-yellow-500/50 shadow-lg animate-pulse" />
          <span className="text-sm text-muted-foreground">Connecting...</span>
        </div>
        <Button variant="outline" disabled className="font-mono">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Connecting
        </Button>
      </div>
    );
  }

  if (wrongNetwork) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-red-500 shadow-red-500/50 shadow-lg" />
          <span className="text-sm text-muted-foreground">Wrong Network</span>
        </div>
        <Button 
          variant="outline" 
          onClick={onConnect}
          className="text-red-500 border-red-500 hover:bg-red-500/10"
        >
          <Wallet className="mr-2 h-4 w-4" />
          Switch to Base Sepolia
        </Button>
      </div>
    );
  }

  if (isConnected && account) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-green-500 shadow-green-500/50 shadow-lg" />
          <span className="text-sm text-muted-foreground">Connected</span>
        </div>
        <Button variant="outline" className="font-mono">
          <Wallet className="mr-2 h-4 w-4" />
          {account.slice(0, 6)}...{account.slice(-4)}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2">
        <span className="flex h-2 w-2 rounded-full bg-red-500 shadow-red-500/50 shadow-lg" />
        <span className="text-sm text-muted-foreground">Not Connected</span>
      </div>
      <Button onClick={onConnect} className="bg-gradient-to-r from-blue-600 to-blue-700">
        <Wallet className="mr-2 h-4 w-4" />
        Connect Wallet
      </Button>
    </div>
  );
}