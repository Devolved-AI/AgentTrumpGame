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

const DEFAULT_GAME_STATE: GameState = {
  multiplier: 1,
  requiredAmount: "0.01",
  isEscalationActive: false,
  timeRemaining: 300,
  lastPlayer: null,
  persuasionScore: 50
};

export function GameProvider({ children }: { children: ReactNode }) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const { contract, getGameState, submitResponse: submitContractResponse } = useGameContract();
  const { toast } = useToast();

  const refreshGameState = async () => {
    try {
      setLoading(true);
      const state = await getGameState();
      if (state && contract) {
        // Get current persuasion score from API
        const scoreResponse = await apiRequest(`/api/scores/${await contract.signer.getAddress()}`);
        const persuasionScore = scoreResponse?.persuasionScore ?? 50;

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

      // Submit to API with blockchain data
      const result = await apiRequest('/api/responses', {
        method: 'POST',
        body: {
          address,
          response,
          blockNumber,
          transactionHash: tx.hash,
          exists: true
        }
      });

      // Refresh game state to get updated score
      await refreshGameState();

      return {
        message: result.aiResponse,
        transactionHash: tx.hash,
        score: result.score,
        gameWon: result.gameWon
      };
    } catch (error: any) {
      console.error('Error submitting response:', error);
      throw error;
    }
  };

  // Initialize game state when contract is ready
  useEffect(() => {
    if (contract) {
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