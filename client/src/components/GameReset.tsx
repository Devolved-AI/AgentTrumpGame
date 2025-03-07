import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, RefreshCw, RotateCcw } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useWeb3Store, CONTRACT_CHANGE_EVENT } from "@/lib/web3";

export function GameReset() {
  const { address, contract, currentContractAddress, resetPersuasionScores } = useWeb3Store();
  const [isResetting, setIsResetting] = useState(false);
  const [isResetingScores, setIsResettingScores] = useState(false);
  
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
      localStorage.removeItem('escalationCount');
      localStorage.removeItem('escalationPrice');
      
      // Reset the persuasion score via API - first delete existing score
      const deleteResponse = await fetch(`/api/persuasion/${address}`, {
        method: 'DELETE',
      });
      
      if (!deleteResponse.ok) {
        throw new Error("Failed to reset persuasion score");
      }
      
      // Get current contract address if available
      let contractAddress = currentContractAddress;
      if (!contractAddress && contract) {
        try {
          contractAddress = await contract.getAddress();
        } catch (e) {
          console.error("Failed to get contract address:", e);
        }
      }
      
      // Then explicitly set score to 99 for a new game
      const defaultScore = 99;
      const setResponse = await fetch(`/api/persuasion/${address}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          score: defaultScore,
          contractAddress, // Include contract address
          message: 'Game reset by user'
        })
      });
      
      if (!setResponse.ok) {
        throw new Error("Failed to set new default score");
      }
      
      console.log("Persuasion score reset to 99 for new game");
      
      toast({
        title: "Game Reset Complete",
        description: "Game state has been reset. New game will start with 5 minute timer and persuasion score of 99.",
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
  
  const handleResetScores = async () => {
    if (!address) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }
    
    setIsResettingScores(true);
    try {
      await resetPersuasionScores();
      // No need to reload, the event listener will update the UI
    } catch (error) {
      console.error("Error resetting persuasion scores:", error);
      toast({
        title: "Reset Failed",
        description: "An error occurred while resetting persuasion scores. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsResettingScores(false);
    }
  };
  
  return (
    <div className="flex flex-col md:flex-row gap-2">
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
      
      <Button
        variant="outline"
        size="sm"
        onClick={handleResetScores}
        disabled={isResetingScores || !address}
        className="flex items-center gap-1"
      >
        {isResetingScores ? (
          <RefreshCw className="h-4 w-4 animate-spin" />
        ) : (
          <RotateCcw className="h-4 w-4" />
        )}
        Reset Scores
      </Button>
    </div>
  );
}