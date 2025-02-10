import { Button } from "@/components/ui/button";
import { Wallet } from "lucide-react";

interface ConnectWalletProps {
  onConnect: () => void;
  isConnected: boolean;
  account: string | null;
}

export function ConnectWallet({ onConnect, isConnected, account }: ConnectWalletProps) {
  if (isConnected && account) {
    return (
      <Button variant="outline" className="font-mono">
        <Wallet className="mr-2 h-4 w-4" />
        {account.slice(0, 6)}...{account.slice(-4)}
      </Button>
    );
  }

  return (
    <Button onClick={onConnect} className="bg-gradient-to-r from-blue-600 to-blue-700">
      <Wallet className="mr-2 h-4 w-4" />
      Connect Wallet
    </Button>
  );
}
