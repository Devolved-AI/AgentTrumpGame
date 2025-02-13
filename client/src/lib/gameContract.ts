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

const PLAYER_RESPONSES_KEY = 'playerResponses';

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

  // Update the evaluateResponse method to implement the new Agent Trump behavior
  async evaluateResponse(response: string): Promise<{scoreIncrement: number}> {
    const lowerResponse = response.toLowerCase();
    let scoreIncrement = 0;

    // Define key Trump themes and phrases to look for
    const persuasiveThemes = {
      // Business success and deals
      businessAcumen: /(?:great deals?|successful business|billions|tremendous success|winning|art of the deal)/i,

      // America First messaging
      americaFirst: /(?:make america great|america first|usa|american jobs|american workers)/i,

      // Strong leadership
      leadership: /(?:strong leader|tough decisions|get things done|nobody else could|only I can)/i,

      // Common Trump speech patterns
      trumpisms: /(?:believe me|many people are saying|everybody knows|tremendous|huge|the best|like never before|very strongly)/i,

      // Appeals to his base
      baseAppeals: /(?:drain the swamp|fake news|deep state|witch hunt|no collusion)/i,

      // Personal flattery
      flattery: /(?:greatest president|smart|genius|very stable|best negotiator|true leader)/i
    };

    // Check for presence of persuasive themes
    let themesFound = 0;
    for (const [theme, pattern] of Object.entries(persuasiveThemes)) {
      if (pattern.test(lowerResponse)) {
        themesFound++;
      }
    }

    // Style analysis
    const hasEmphasis = (response.match(/[A-Z]{2,}/g) || []).length > 0;
    const hasExclamation = response.includes('!');
    const properLength = response.length >= 50 && response.length <= 280;

    // Calculate base score based on themes found (max 5 points per theme)
    scoreIncrement += themesFound * 5;

    // Add style points
    if (hasEmphasis) scoreIncrement += 2;
    if (hasExclamation) scoreIncrement += 2;
    if (properLength) scoreIncrement += 1;

    // Check for extraordinary persuasive combinations that might warrant instant win
    const isExtraordinary = 
      themesFound >= 4 && // Uses multiple Trump themes
      hasEmphasis && // Has emphasis
      hasExclamation && // Shows enthusiasm
      properLength && // Appropriate length
      /tremendous|huge|believe me|many people|the best/.test(lowerResponse); // Key Trump phrases

    if (isExtraordinary) {
      return { scoreIncrement: 100 }; // Instant win condition
    }

    // Apply resistance factor (7/10 resistance)
    // Reduce non-winning scores by 30%
    scoreIncrement = Math.floor(scoreIncrement * 0.7);

    // Ensure score increment is within bounds (-5 to +5 for normal responses)
    if (scoreIncrement > 0 && scoreIncrement < 100) {
      scoreIncrement = Math.min(scoreIncrement, 5);
    } else if (scoreIncrement <= 0) {
      scoreIncrement = -5;
    }

    return { scoreIncrement };
  }

  async getGameStatus() {
    const [
      timeRemaining,
      currentRequiredAmount,
      lastPlayer,
      escalationActive,
      gameEndBlock,
      isGameWon,
      currentMultiplier,
      escalationStartBlock,
      lastGuessBlock
    ] = await Promise.all([
      this.contract.getTimeRemaining(),
      this.contract.getCurrentRequiredAmount(),
      this.contract.lastPlayer(),
      this.contract.escalationActive(),
      this.contract.gameEndBlock(),
      this.contract.gameWon(),
      this.contract.currentMultiplier(),
      this.contract.escalationStartBlock(),
      this.contract.lastGuessBlock()
    ]);

    // Calculate escalation period information
    let currentAmount = ethers.formatEther(currentRequiredAmount);
    let escalationPeriodTimeRemaining = 0;
    let currentPeriodIndex = 0;

    // Escalation mode calculations
    if (escalationActive) {
      // Each escalation period is exactly 5 minutes (300 seconds)
      const ESCALATION_PERIOD = 300;
      const currentBlock = await this.getCurrentBlock();
      const blocksSinceEscalation = currentBlock - Number(escalationStartBlock);
      const secondsSinceEscalation = blocksSinceEscalation * 12; // Assuming 12 second block time
      currentPeriodIndex = Math.floor(secondsSinceEscalation / ESCALATION_PERIOD);

      // Calculate remaining time in current period
      escalationPeriodTimeRemaining = ESCALATION_PERIOD - (secondsSinceEscalation % ESCALATION_PERIOD);

      // Fixed prices for each escalation period (in ETH)
      const periodPrices = [
        0.0018, // 1st period: 0.0018 ETH
        0.0036, // 2nd period: 0.0036 ETH
        0.0072, // 3rd period: 0.0072 ETH
        0.0144, // 4th period: 0.0144 ETH
        0.0288  // 5th period: 0.0288 ETH
      ];

      // Get the price for current period (cap at last defined price if we go beyond)
      const periodPrice = currentPeriodIndex < periodPrices.length 
        ? periodPrices[currentPeriodIndex]
        : periodPrices[periodPrices.length - 1];

      currentAmount = periodPrice.toFixed(4);
    }

    // Calculate if the game is over
    // Game is over if:
    // 1. Time has run out AND we're not in escalation mode
    // 2. Time has run out in escalation mode AND no guesses in the last period
    // 3. Someone has won the game
    const isGameOver = isGameWon || 
      (Number(timeRemaining) <= 0 && !escalationActive) ||
      (escalationActive && escalationPeriodTimeRemaining <= 0 && !lastGuessBlock);

    return {
      timeRemaining: Number(timeRemaining),
      currentAmount,
      lastPlayer,
      escalationActive,
      gameEndBlock: Number(gameEndBlock),
      isGameWon,
      isGameOver,
      currentMultiplier: Number(currentMultiplier),
      escalationPeriodTimeRemaining: escalationActive ? escalationPeriodTimeRemaining : 0,
      currentPeriodIndex
    };
  }

  async getCurrentBlock() {
    return await this.provider.getBlockNumber();
  }

  async getPlayerHistory(address: string): Promise<PlayerHistoryItem[]> {
    try {
      const normalizedAddress = address.toLowerCase();

      // Get local storage history
      const stored = localStorage.getItem(PLAYER_RESPONSES_KEY);
      let localHistory: PlayerHistoryItem[] = [];
      if (stored) {
        const parsedStorage = JSON.parse(stored);
        localHistory = parsedStorage[normalizedAddress] || [];
      }

      // Get chain history
      const [responses, timestamps, exists] = await this.contract.getAllPlayerResponses(address);

      // Convert chain data to our format, filtering out invalid entries
      const chainHistory = responses
        .map((response: string, index: number) => ({
          response,
          timestamp: Number(timestamps[index]),
          blockNumber: 0,
          transactionHash: null,
          exists: exists[index]
        }))
        .filter(item => 
          // Filter out entries with 1970 timestamps (less than year 2000)
          item.timestamp > 946684800 && 
          item.exists
        );

      // Merge histories, preferring local storage data with valid transactions
      const validLocalHistory = localHistory.filter(item => 
        item.blockNumber !== 0 && // Must have a valid block number
        item.transactionHash !== null && // Must have a transaction hash
        item.timestamp > 946684800 && // After year 2000
        item.exists
      );

      // Combine histories, ensuring no duplicates
      const allHistory = [...validLocalHistory];

      // Only add chain items that don't exist in local storage
      chainHistory.forEach(chainItem => {
        const exists = allHistory.some(localItem => 
          localItem.response === chainItem.response && 
          localItem.timestamp === chainItem.timestamp
        );
        if (!exists) {
          allHistory.push(chainItem);
        }
      });

      // Sort by timestamp, most recent first
      return allHistory.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('Error getting player history:', error);
      // If contract call fails, return filtered local storage data
      const stored = localStorage.getItem(PLAYER_RESPONSES_KEY);
      if (stored) {
        const responses = JSON.parse(stored);
        const normalizedAddress = address.toLowerCase();
        const localHistory = responses[normalizedAddress] || [];
        return localHistory.filter(item => 
          item.blockNumber !== 0 &&
          item.transactionHash !== null &&
          item.timestamp > 946684800 &&
          item.exists
        ).sort((a, b) => b.timestamp - a.timestamp);
      }
      return [];
    }
  }

  async submitResponse(response: string, amount: string) {
    if (!this.signer) throw new Error("No signer available");

    try {
      const parsedAmount = ethers.parseEther(amount.toString());
      console.log('Submitting response with amount:', amount, 'ETH, parsed:', parsedAmount.toString());

      const tx = await this.contract.submitGuess(response, {
        value: parsedAmount,
        gasLimit: 500000
      });

      const receipt = await tx.wait();
      const address = await this.signer.getAddress();
      const normalizedAddress = address.toLowerCase();

      // Evaluate response before storing
      const evaluation = await this.evaluateResponse(response);

      // Store response in localStorage
      const stored = localStorage.getItem(PLAYER_RESPONSES_KEY) || '{}';
      const responses = JSON.parse(stored);

      if (!responses[normalizedAddress]) {
        responses[normalizedAddress] = [];
      }

      // Create new response entry
      const newResponse: PlayerHistoryItem = {
        response,
        timestamp: Math.floor(Date.now() / 1000),
        blockNumber: receipt.blockNumber,
        transactionHash: receipt.hash,
        exists: true,
        scoreChange: evaluation.scoreIncrement
      };

      // Add to beginning of array to show most recent first
      responses[normalizedAddress].unshift(newResponse);

      // Save to localStorage
      localStorage.setItem(PLAYER_RESPONSES_KEY, JSON.stringify(responses));

      return { tx, evaluation };
    } catch (error: any) {
      console.error("Transaction error:", error);
      throw error;
    }
  }

  subscribeToEvents(callbacks: {
    onGuessSubmitted?: (event: any) => void;
    onGameWon?: (event: any) => void;
    onGameEnded?: (event: any) => void;
    onEscalationStarted?: (event: any) => void;
  }) {
    if (callbacks.onGuessSubmitted) {
      this.contract.on('GuessSubmitted', callbacks.onGuessSubmitted);
    }
    if (callbacks.onGameWon) {
      this.contract.on('GameWon', callbacks.onGameWon);
    }
    if (callbacks.onGameEnded) {
      this.contract.on('GameEnded', callbacks.onGameEnded);
    }
    if (callbacks.onEscalationStarted) {
      this.contract.on('EscalationStarted', callbacks.onEscalationStarted);
    }

    return () => {
      this.contract.removeAllListeners();
    };
  }

  async getTotalPrizePool(): Promise<string> {
    const balance = await this.contract.getContractBalance();
    return ethers.formatEther(balance);
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
}