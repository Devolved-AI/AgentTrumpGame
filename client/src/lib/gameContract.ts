import { ethers } from 'ethers';
import { toast } from '@/hooks/use-toast';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from './config';

export interface PlayerHistoryItem {
  response: string;
  timestamp: number;
  transactionHash: string | null;
  blockNumber: number;
  exists: boolean;
  scoreChange?: number;
}

export class GameContract {
  public contract: ethers.Contract;
  private provider: ethers.BrowserProvider;
  private signer: ethers.JsonRpcSigner;

  constructor(provider: ethers.BrowserProvider, signer: ethers.JsonRpcSigner) {
    this.provider = provider;
    this.signer = signer;
    this.contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
  }

  async evaluateResponse(response: string): Promise<{scoreIncrement: number}> {
    try {
      const { analyzeTrumpResponse } = await import('./ai/trumpAI');
      const result = await analyzeTrumpResponse(response);

      // Convert AI score (0-100) to increments of 5
      let scoreIncrement = 0;
      if (result.persuasionScore >= 95) {
        scoreIncrement = 100; // Winning condition
      } else if (result.persuasionScore > 50) {
        scoreIncrement = 5; // Good response
      } else {
        scoreIncrement = -5; // Poor response
      }

      return { scoreIncrement };
    } catch (error) {
      console.error('Error evaluating response:', error);
      return { scoreIncrement: -5 };
    }
  }

  async submitResponse(response: string, amount: string) {
    if (!this.signer) throw new Error("No signer available");

    try {
      const parsedAmount = ethers.parseEther(amount);
      console.log('Submitting response with amount:', amount, 'ETH');

      // First check if the game is still active
      const status = await this.getGameStatus();
      if (status.isGameOver) {
        throw new Error("Game is already over!");
      }

      // Check the current required amount matches
      const currentRequired = await this.contract.currentRequiredAmount();
      if (parsedAmount.toString() !== currentRequired.toString()) {
        throw new Error("Amount mismatch - please refresh and try again");
      }

      const tx = await this.contract.submitGuess(response, {
        value: parsedAmount
      });

      console.log("Transaction sent:", tx.hash);
      const receipt = await tx.wait();
      console.log("Transaction confirmed:", receipt);

      // Get AI evaluation and response
      const { analyzeTrumpResponse } = await import('./ai/trumpAI');
      const aiResult = await analyzeTrumpResponse(response);

      return { 
        tx, 
        evaluation: { scoreIncrement: aiResult.persuasionScore >= 95 ? 100 : aiResult.persuasionScore > 50 ? 5 : -5 },
        receipt,
        trumpResponse: aiResult.response,
        trumpGif: aiResult.reactionGif 
      };

    } catch (error: any) {
      console.error("Transaction error:", error);
      if (error.code === 'INSUFFICIENT_FUNDS') {
        throw new Error("Insufficient funds to complete transaction");
      } else if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
        throw new Error("Could not estimate gas. Please try again.");
      } else if (error.code === 'ACTION_REJECTED') {
        throw new Error("Transaction was rejected by user");
      } else if (error.reason) {
        throw new Error(error.reason);
      }
      throw error;
    }
  }

  async getGameStatus() {
    try {
      const [
        timeRemaining,
        requiredAmount,
        escalationActive,
        isGameWon,
        multiplier,
        currentBlock,
        lastPlayerAddress
      ] = await Promise.all([
        this.contract.getTimeRemaining(),
        this.contract.currentRequiredAmount(),
        this.contract.escalationActive(),
        this.contract.gameWon(),
        this.contract.currentMultiplier(),
        this.provider.getBlockNumber(),
        this.contract.lastPlayer()
      ]);

      // Calculate escalation period details
      const baseTimeRemaining = Number(timeRemaining);
      const escalationPeriodLength = 300; // 5 minutes in seconds
      const escalationPeriodTimeRemaining = escalationActive ?
        baseTimeRemaining % escalationPeriodLength : 0;
      const currentPeriodIndex = escalationActive ?
        Math.floor(baseTimeRemaining / escalationPeriodLength) : 0;

      return {
        timeRemaining: baseTimeRemaining,
        currentAmount: ethers.formatEther(requiredAmount),
        lastPlayer: lastPlayerAddress,
        escalationActive,
        gameEndBlock: currentBlock,
        isGameWon,
        isGameOver: isGameWon || baseTimeRemaining <= 0,
        currentMultiplier: Number(multiplier),
        escalationPeriodTimeRemaining,
        currentPeriodIndex
      };
    } catch (error) {
      console.error("Failed to get game status:", error);
      throw new Error("Failed to load game data. Please try again.");
    }
  }

  async getPlayerHistory(address: string): Promise<PlayerHistoryItem[]> {
    try {
      const [responses, timestamps, exists] = await this.contract.getAllPlayerResponses(address);

      return responses.map((response: string, index: number) => ({
        response,
        timestamp: Number(timestamps[index]),
        blockNumber: 0,
        transactionHash: null,
        exists: exists[index],
        scoreChange: 0
      }));
    } catch (error) {
      console.error('Error getting player history:', error);
      return [];
    }
  }

  async getTotalPrizePool(): Promise<string> {
    try {
      const balance = await this.provider.getBalance(this.contract.target);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error("Error getting prize pool:", error);
      return "0";
    }
  }

  async buttonPushed(winnerAddress: string) {
    try {
      const tx = await this.contract.buttonPushed(winnerAddress);
      await tx.wait();
      return tx;
    } catch (error) {
      console.error("Error pushing button:", error);
      throw error;
    }
  }

  subscribeToEvents(callbacks: {
    onGuessSubmitted?: (event: any) => void;
    onGameWon?: (event: any) => void;
    onGameEnded?: (event: any) => void;
    onEscalationStarted?: (event: any) => void;
  }) {
    // Subscribe to contract events when they're available in the ABI
    return () => {};
  }
}