import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useWeb3Store } from "@/lib/web3";

export function GameReset() {
  const { address } = useWeb3Store();
  const [isResetting, setIsResetting] = useState(false);
  
  const resetGameState = async () => {
    if (!address) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }
    
    setIsResetting(true);
    
    try {
      // Clear local storage items related to game state
      localStorage.removeItem('gameTimerState');
      localStorage.removeItem('escalationInterval');
      localStorage.removeItem('escalationPrice');
      
      // Reset the persuasion score via API - first delete existing score
      const deleteResponse = await fetch(`/api/persuasion/${address}`, {
        method: 'DELETE',
      });
      
      if (!deleteResponse.ok) {
        throw new Error("Failed to reset persuasion score");
      }
      
      // Then explicitly set score to 50 for a new game
      const defaultScore = 50;
      const setResponse = await fetch(`/api/persuasion/${address}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          score: defaultScore,
          message: 'Game reset by user'
        })
      });
      
      if (!setResponse.ok) {
        throw new Error("Failed to set new default score");
      }
      
      console.log("Persuasion score reset to 50 for new game");
      
      toast({
        title: "Game Reset Complete",
        description: "Game state has been reset. New game will start with 30 minutes and persuasion score of 50.",
        variant: "default",
      });
      
      // Force page reload to ensure all components update with new state
      window.location.reload();
      
    } catch (error) {
      console.error("Error resetting game state:", error);
      toast({
        title: "Reset Failed",
        description: "An error occurred while resetting game state. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsResetting(false);
    }
  };
  
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={resetGameState}
      disabled={isResetting || !address}
      className="flex items-center gap-1"
    >
      {isResetting ? (
        <RefreshCw className="h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="h-4 w-4" />
      )}
      Reset Game
    </Button>
  );
}