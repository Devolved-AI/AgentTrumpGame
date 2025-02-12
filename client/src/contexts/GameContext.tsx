import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useGameContract } from '@/lib/hooks/useGameContract';
import { useToast } from '@/hooks/use-toast';

interface GameState {
  multiplier: number;
  requiredAmount: string;
  isEscalationActive: boolean;
  timeRemaining: number;
}

interface GameContextType {
  gameState: GameState | null;
  refreshGameState: () => Promise<void>;
  submitResponse: (response: string) => Promise<string>;
  loading: boolean;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const { getGameState, submitResponse } = useGameContract();
  const { toast } = useToast();

  const refreshGameState = async () => {
    try {
      const state = await getGameState();
      if (state) {
        setGameState(state);
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

  // Refresh game state every 15 seconds
  useEffect(() => {
    refreshGameState();
    const interval = setInterval(refreshGameState, 15000);
    return () => clearInterval(interval);
  }, []);

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
