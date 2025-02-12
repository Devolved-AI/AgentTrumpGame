import { useCallback, useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ABI, CONTRACT_ADDRESS } from '../config';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

export function useGameContract() {
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Initialize contract when window.ethereum is available
  useEffect(() => {
    const initContract = async () => {
      if (typeof window.ethereum !== 'undefined') {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const signer = await provider.getSigner();
          const gameContract = new ethers.Contract(
            CONTRACT_ADDRESS,
            CONTRACT_ABI,
            signer
          );
          setContract(gameContract);
        } catch (error) {
          console.error('Failed to initialize contract:', error);
          toast({
            title: 'Error',
            description: 'Failed to connect to the game contract. Please make sure you have MetaMask installed.',
            variant: 'destructive',
          });
        }
      }
    };

    initContract();
  }, [toast]);

  // Submit a response to the game
  const submitResponse = useCallback(async (response: string) => {
    if (!contract) {
      throw new Error('Contract not initialized');
    }

    try {
      const requiredAmount = await contract.currentRequiredAmount();
      const tx = await contract.submitGuess(response, { value: requiredAmount });
      await tx.wait();

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/responses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/scores'] });

      return tx.hash;
    } catch (error: any) {
      console.error('Error submitting response:', error);
      throw new Error(error.message);
    }
  }, [contract, queryClient]);

  // Get current game state
  const getGameState = useCallback(async () => {
    if (!contract) return null;

    try {
      const [multiplier, requiredAmount, isEscalationActive, timeRemaining] = await Promise.all([
        contract.currentMultiplier(),
        contract.currentRequiredAmount(),
        contract.escalationActive(),
        contract.getTimeRemaining(),
      ]);

      return {
        multiplier: Number(multiplier),
        requiredAmount: ethers.formatEther(requiredAmount),
        isEscalationActive,
        timeRemaining: Number(timeRemaining),
      };
    } catch (error) {
      console.error('Error fetching game state:', error);
      return null;
    }
  }, [contract]);

  return {
    contract,
    submitResponse,
    getGameState,
  };
}
