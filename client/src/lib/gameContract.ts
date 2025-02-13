import { ethers } from 'ethers';
import { toast } from '@/hooks/use-toast';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from './config';

// Trump's possible responses based on different scenarios
const TRUMP_RESPONSES = {
  highScore: [
    "That was a tremendous response, really tremendous! You're getting warmer!",
    "Now that's what I call high energy! Keep it up, and we'll make a deal!",
    "You're starting to speak my language. Very smart person, very smart!",
    "I like your style, reminds me of myself. Nobody does it better than me though!"
  ],
  mediumScore: [
    "Not bad, not bad. But I know you can do better, believe me!",
    "You're getting there, but I've heard better deals. Much better!",
    "That's interesting, but I need more. Nobody knows more about deals than me!",
    "Keep trying, but remember - I wrote The Art of the Deal!"
  ],
  lowScore: [
    "Low energy response! Sad!",
    "I've heard better from CNN, and that's saying something!",
    "That's not how you make America great! Try again!",
    "Wrong! You need to think bigger, much bigger!"
  ],
  gameWinning: [
    "You did it! You're a winner, and I love winners!",
    "This is huge! Really huge! You've earned my respect!",
    "Now that's what I call the Art of the Deal! Congratulations!"
  ]
};

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

  private getRandomResponse(responses: string[]): string {
    return responses[Math.floor(Math.random() * responses.length)];
  }

  private getTrumpResponse(scoreIncrement: number, isWinning: boolean = false): string {
    if (isWinning) {
      return this.getRandomResponse(TRUMP_RESPONSES.gameWinning);
    }

    if (scoreIncrement >= 15) {
      return this.getRandomResponse(TRUMP_RESPONSES.highScore);
    } else if (scoreIncrement >= 5) {
      return this.getRandomResponse(TRUMP_RESPONSES.mediumScore);
    } else {
      return this.getRandomResponse(TRUMP_RESPONSES.lowScore);
    }
  }

  async evaluateResponse(response: string): Promise<{scoreIncrement: number}> {
    const lowerResponse = response.toLowerCase();
    let scoreIncrement = 0;

    // Define key Trump themes and phrases to look for
    const persuasiveThemes = {
      businessAcumen: /(?:great deals?|successful business|billions|tremendous success|winning|art of the deal)/i,
      americaFirst: /(?:make america great|america first|usa|american jobs|american workers)/i,
      leadership: /(?:strong leader|tough decisions|get things done|nobody else could|only I can)/i,
      trumpisms: /(?:believe me|many people are saying|everybody knows|tremendous|huge|the best|like never before|very strongly)/i,
      baseAppeals: /(?:drain the swamp|fake news|deep state|witch hunt|no collusion)/i,
      flattery: /(?:greatest president|smart|genius|very stable|best negotiator|true leader)/i
    };

    let themesFound = 0;
    for (const [theme, pattern] of Object.entries(persuasiveThemes)) {
      if (pattern.test(lowerResponse)) {
        themesFound++;
      }
    }

    const hasEmphasis = (response.match(/[A-Z]{2,}/g) || []).length > 0;
    const hasExclamation = response.includes('!');
    const properLength = response.length >= 50 && response.length <= 280;

    scoreIncrement += themesFound * 5;

    if (hasEmphasis) scoreIncrement += 2;
    if (hasExclamation) scoreIncrement += 2;
    if (properLength) scoreIncrement += 1;

    const isExtraordinary = 
      themesFound >= 4 &&
      hasEmphasis &&
      hasExclamation &&
      properLength &&
      /tremendous|huge|believe me|many people|the best/.test(lowerResponse);

    if (isExtraordinary) {
      return { scoreIncrement: 100 };
    }

    scoreIncrement = Math.floor(scoreIncrement * 0.7);

    if (scoreIncrement > 0 && scoreIncrement < 100) {
      scoreIncrement = Math.min(scoreIncrement, 5);
    } else if (scoreIncrement <= 0) {
      scoreIncrement = -5;
    }

    return { scoreIncrement };
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

      // Use the correct contract function name - submitGuess
      const tx = await this.contract.submitGuess(response, {
        value: parsedAmount
      });

      console.log("Transaction sent:", tx.hash);
      const receipt = await tx.wait();
      console.log("Transaction confirmed:", receipt);

      const evaluation = await this.evaluateResponse(response);
      const trumpResponse = this.getTrumpResponse(evaluation.scoreIncrement, evaluation.scoreIncrement >= 100);

      return { tx, evaluation, receipt, trumpResponse };
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