import { ethers } from 'ethers';
import { toast } from '@/hooks/use-toast';

const contractAddress = '0xAC4729Ad635dB4A2A601B840a8868DAd07d3ED96';
const contractABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "winner",
        "type": "address"
      }
    ],
    "name": "buttonPushed",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "deposit",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "emergencyWithdraw",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "endGame",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "submitGuess",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTimeRemaining",
    "outputs": [{"internalType": "uint256","name": "","type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "currentMultiplier",
    "outputs": [{"internalType": "uint256","name": "","type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "currentRequiredAmount",
    "outputs": [{"internalType": "uint256","name": "","type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "escalationActive",
    "outputs": [{"internalType": "bool","name": "","type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "gameWon",
    "outputs": [{"internalType": "bool","name": "","type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  }
];


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
    this.contract = new ethers.Contract(contractAddress, contractABI, signer);
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

  async getGameStatus() {
    try {
      const [
        timeRemaining,
        requiredAmount,
        escalationActive,
        isGameWon,
        multiplier
      ] = await Promise.all([
        this.contract.getTimeRemaining(),
        this.contract.currentRequiredAmount(),
        this.contract.escalationActive(),
        this.contract.gameWon(),
        this.contract.currentMultiplier()
      ]);

      return {
        timeRemaining: Number(timeRemaining),
        currentAmount: ethers.formatEther(requiredAmount),
        lastPlayer: "",
        escalationActive,
        gameEndBlock: 0,
        isGameWon,
        isGameOver: isGameWon || Number(timeRemaining) <= 0,
        currentMultiplier: Number(multiplier),
        escalationPeriodTimeRemaining: 0,
        currentPeriodIndex: 0
      };
    } catch (error) {
      console.error("Failed to get game status:", error);
      throw new Error("Failed to load game data. Please try again.");
    }
  }

  async getCurrentBlock() {
    return await this.provider.getBlockNumber();
  }

  async submitResponse(response: string, amount: string) {
    if (!this.signer) throw new Error("No signer available");

    try {
      const parsedAmount = ethers.parseEther(amount);
      console.log('Submitting response with amount:', amount, 'ETH');

      const tx = await this.contract.submitGuess({
        value: parsedAmount,
        gasLimit: 500000
      });

      const receipt = await tx.wait();

      const evaluation = await this.evaluateResponse(response);

      return { tx, evaluation };
    } catch (error: any) {
      console.error("Transaction error:", error);
      throw error;
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
    return () => {};
  }
}