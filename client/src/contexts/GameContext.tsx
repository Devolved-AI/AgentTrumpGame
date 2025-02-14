import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useGameContract } from '@/lib/hooks/useGameContract';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface GameState {
  multiplier: number;
  requiredAmount: string;
  isEscalationActive: boolean;
  timeRemaining: number;
  lastPlayer: string | null;
  persuasionScore: number;
}

interface GameContextType {
  gameState: GameState | null;
  refreshGameState: () => Promise<void>;
  submitResponse: (response: string) => Promise<{
    message: string;
    transactionHash?: string;
    score: number;
    gameWon: boolean;
  }>;
  loading: boolean;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const { contract, getGameState, submitResponse: submitContractResponse } = useGameContract();
  const { toast } = useToast();

  const refreshGameState = async () => {
    try {
      if (!contract) {
        console.log('Contract not initialized, skipping refresh');
        return;
      }

      setLoading(true);
      const state = await getGameState();

      if (state) {
        // Get current persuasion score from API
        const address = await contract.signer.getAddress();
        console.log('Fetching score for address:', address);

        const scoreResponse = await fetch(`/api/scores/${address}`);
        const scoreData = await scoreResponse.json();
        console.log('Score data received:', scoreData);

        const persuasionScore = scoreData?.persuasionScore ?? 50;

        setGameState({
          multiplier: state.multiplier,
          requiredAmount: state.requiredAmount,
          isEscalationActive: state.isEscalationActive,
          timeRemaining: state.timeRemaining,
          lastPlayer: state.lastPlayer,
          persuasionScore
        });
      }
    } catch (error) {
      console.error('Error refreshing game state:', error);
      toast({
        title: 'Error',
        description: 'Failed to refresh game state',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Submit response to both contract and API
  const submitResponse = async (response: string) => {
    if (!contract) {
      throw new Error('Contract not initialized');
    }

    try {
      // Submit to blockchain first
      const { tx, blockNumber } = await submitContractResponse(response);

      // Wait for transaction confirmation
      await tx.wait();

      // Get signer address
      const address = await contract.signer.getAddress();

      // Generate signature for the message
      const signature = await contract.signer.signMessage(response);

      // Submit to API with blockchain data
      const result = await fetch('/api/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address,
          response,
          blockNumber,
          transactionHash: tx.hash,
          signature,
          exists: true
        })
      });

      if (!result.ok) {
        throw new Error('Failed to submit response to API');
      }

      const data = await result.json();
      console.log('API response:', data);

      // Refresh game state to get updated score
      await refreshGameState();

      return {
        message: data.message,
        transactionHash: tx.hash,
        score: data.score,
        gameWon: data.gameWon
      };
    } catch (error: any) {
      console.error('Error submitting response:', error);
      throw error;
    }
  };

  // Initialize game state when contract is ready
  useEffect(() => {
    if (contract) {
      console.log('Contract initialized, refreshing game state');
      refreshGameState();
      // Refresh state periodically
      const interval = setInterval(refreshGameState, 15000);
      return () => clearInterval(interval);
    }
  }, [contract]);

  return (
    <GameContext.Provider value={{
      gameState,
      refreshGameState,
      submitResponse,
      loading,
    }}>
      {children}
    </GameContext.Provider>
  );
}

export const useGame = () => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};