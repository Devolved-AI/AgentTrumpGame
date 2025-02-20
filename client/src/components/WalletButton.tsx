import { Button } from "@/components/ui/button";
import { useWeb3Store } from "@/lib/web3";
import { Wallet } from "lucide-react";

export function WalletButton() {
  const { address, balance, connect, disconnect } = useWeb3Store();

  if (!address) {
    return (
      <Button 
        onClick={() => connect()}
        className="bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900"
      >
        <Wallet className="mr-2 h-4 w-4" />
        Connect Wallet
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      onClick={() => disconnect()}
      className="font-mono"
    >
      {address.slice(0, 6)}...{address.slice(-4)} ({balance?.slice(0, 6)} ETH)
    </Button>
  );
}
