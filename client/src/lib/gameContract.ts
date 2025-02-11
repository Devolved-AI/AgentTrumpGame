import { ethers } from 'ethers';

const contractAddress = '0x70027D4EAA51bAf4275382a4495e65aADa2a7696';
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
		"name": "EnforcedPause",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "ExpectedPause",
		"type": "error"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "owner",
				"type": "address"
			}
		],
		"name": "OwnableInvalidOwner",
		"type": "error"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "account",
				"type": "address"
			}
		],
		"name": "OwnableUnauthorizedAccount",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "ReentrancyGuardReentrantCall",
		"type": "error"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "owner",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			}
		],
		"name": "Deposited",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "owner",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			}
		],
		"name": "EmergencyWithdrawn",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "startBlock",
				"type": "uint256"
			}
		],
		"name": "EscalationStarted",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "lastPlayer",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "lastPlayerReward",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "ownerReward",
				"type": "uint256"
			}
		],
		"name": "GameEnded",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "newEndBlock",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "newMultiplier",
				"type": "uint256"
			}
		],
		"name": "GameExtended",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "winner",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "reward",
				"type": "uint256"
			}
		],
		"name": "GameWon",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "player",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "multiplier",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "string",
				"name": "response",
				"type": "string"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "blockNumber",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "responseIndex",
				"type": "uint256"
			}
		],
		"name": "GuessSubmitted",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "previousOwner",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "newOwner",
				"type": "address"
			}
		],
		"name": "OwnershipTransferred",
		"type": "event"
	},
	{
		"inputs": [],
		"name": "pause",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "address",
				"name": "account",
				"type": "address"
			}
		],
		"name": "Paused",
		"type": "event"
	},
	{
		"inputs": [],
		"name": "renounceOwnership",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "string",
				"name": "response",
				"type": "string"
			}
		],
		"name": "submitGuess",
		"outputs": [],
		"stateMutability": "payable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "newOwner",
				"type": "address"
			}
		],
		"name": "transferOwnership",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "unpause",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "address",
				"name": "account",
				"type": "address"
			}
		],
		"name": "Unpaused",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "owner",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			}
		],
		"name": "Withdrawn",
		"type": "event"
	},
	{
		"stateMutability": "payable",
		"type": "fallback"
	},
	{
		"inputs": [],
		"name": "withdraw",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"stateMutability": "payable",
		"type": "receive"
	},
	{
		"inputs": [],
		"name": "BASE_MULTIPLIER",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "BLOCKS_PER_MINUTE",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "currentMultiplier",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "currentRequiredAmount",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "ESCALATION_PERIOD",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "escalationActive",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "escalationStartBlock",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "GAME_FEE",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "gameEndBlock",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "gameWon",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "player",
				"type": "address"
			}
		],
		"name": "getAllPlayerResponses",
		"outputs": [
			{
				"internalType": "string[]",
				"name": "responses",
				"type": "string[]"
			},
			{
				"internalType": "uint256[]",
				"name": "timestamps",
				"type": "uint256[]"
			},
			{
				"internalType": "bool[]",
				"name": "exists",
				"type": "bool[]"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "getContractBalance",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "getCurrentEscalationPeriod",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "getCurrentRequiredAmount",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "player",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "index",
				"type": "uint256"
			}
		],
		"name": "getPlayerResponseByIndex",
		"outputs": [
			{
				"internalType": "string",
				"name": "response",
				"type": "string"
			},
			{
				"internalType": "uint256",
				"name": "timestamp",
				"type": "uint256"
			},
			{
				"internalType": "bool",
				"name": "exists",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "player",
				"type": "address"
			}
		],
		"name": "getPlayerResponseCount",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "getTimeRemaining",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "INITIAL_GAME_DURATION",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "lastGuessBlock",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "lastPlayer",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "MAX_RESPONSE_LENGTH",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "owner",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "paused",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "playerResponses",
		"outputs": [
			{
				"internalType": "string",
				"name": "response",
				"type": "string"
			},
			{
				"internalType": "uint256",
				"name": "blockNumber",
				"type": "uint256"
			},
			{
				"internalType": "bool",
				"name": "exists",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "shouldExtendGame",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "shouldStartEscalation",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "totalCollected",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	}
];

// Add new type for escalation period info
interface EscalationPeriodInfo {
  currentAmount: string;
  timeRemaining: number;
  periodIndex: number;
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

  async getGameStatus() {
    const [
      timeRemaining,
      currentRequiredAmount,
      lastPlayer,
      escalationActive,
      gameEndBlock,
      isGameWon
    ] = await Promise.all([
      this.contract.getTimeRemaining(),
      this.contract.getCurrentRequiredAmount(),
      this.contract.lastPlayer(),
      this.contract.escalationActive(),
      this.contract.gameEndBlock(),
      this.contract.gameWon()
    ]);

    // Calculate the final status
    const isGameOver = Number(timeRemaining) <= 0 || isGameWon;

    // Format the current amount based on escalation period
    const baseAmount = "0.0018";
    let currentAmount = baseAmount;

    if (escalationActive) {
      const escalationPeriod = await this.contract.getCurrentEscalationPeriod();
      const multiplier = Math.pow(2, Number(escalationPeriod));
      currentAmount = (parseFloat(baseAmount) * multiplier).toFixed(4);
    }

    return {
      timeRemaining: Number(timeRemaining),
      currentAmount: currentAmount,
      lastPlayer,
      escalationActive,
      gameEndBlock: Number(gameEndBlock),
      isGameWon,
      isGameOver
    };
  }

  async submitResponse(response: string, amount: string) {
    try {
      const parsedAmount = ethers.parseEther(amount);
      const tx = await this.contract.submitGuess(response, {
        value: parsedAmount
      });
      return tx;
    } catch (error: any) {
      console.error("Transaction error:", error);
      throw error;
    }
  }

  async getPlayerHistory(address: string) {
    try {
      const responseCount = await this.contract.getPlayerResponseCount(address);
      const history = [];

      for (let i = 0; i < Number(responseCount); i++) {
        try {
          const [response, blockNumber, exists] = await this.contract.getPlayerResponseByIndex(address, i);

          if (exists) {
            const block = await this.provider.getBlock(Number(blockNumber));
            if (!block) continue;

            // Get transaction hash from events
            const filter = this.contract.filters.GuessSubmitted(address);
            const events = await this.contract.queryFilter(filter, Number(blockNumber), Number(blockNumber));
            const event = events[0];

            history.push({
              response,
              timestamp: Number(block.timestamp),
              transactionHash: event?.transactionHash || null,
              blockNumber: Number(blockNumber),
              exists: true
            });
          }
        } catch (error) {
          console.error('Error fetching response:', error);
          continue;
        }
      }

      return history;
    } catch (error) {
      console.error('Error getting player history:', error);
      return [];
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

  async evaluateResponse(response: string): Promise<{scoreIncrement: number}> {
    // Define Trump-style phrases with weighted importance
    const keyPhrases = {
      // Critical phrases (worth 3 points)
      "make america great again": 3,
      "nobody has ever seen anything like it": 3,
      "believe me folks": 3,

      // High impact phrases (worth 2 points)
      "tremendous": 2,
      "bigly": 2,
      "huge success": 2,
      "winning like never before": 2,
      "absolutely incredible": 2,
      "many people are saying": 2,

      // Medium impact phrases (worth 1 point)
      "beautiful": 1,
      "amazing": 1,
      "perfect": 1,
      "the best": 1,
      "fake news": 1,
      "very strongly": 1,
      "billions and billions": 1
    };

    // Convert response to lowercase for case-insensitive matching
    const lowerResponse = response.toLowerCase();

    // Calculate total score based on unique phrases used
    let totalPoints = 0;
    const usedPhrases = new Set<string>();

    // Check each phrase and its variations
    for (const [phrase, points] of Object.entries(keyPhrases)) {
      if (lowerResponse.includes(phrase) && !usedPhrases.has(phrase)) {
        totalPoints += points;
        usedPhrases.add(phrase);
      }
    }

    // Style analysis (now more demanding)
    const exclamationCount = (response.match(/!/g) || []).length;
    const hasStrongEmphasis = response.match(/[A-Z]{3,}/) !== null; // Requires at least 3 caps
    const hasMultipleEmphasis = (response.match(/[A-Z]{2,}/g) || []).length > 1;

    // Style points (max 5)
    let stylePoints = 0;
    if (exclamationCount >= 3) stylePoints += 2;
    else if (exclamationCount > 0) stylePoints += 1;
    if (hasStrongEmphasis) stylePoints += 2;
    else if (hasMultipleEmphasis) stylePoints += 1;

    // Penalties
    let penalties = 0;
    if (response.length < 50) penalties -= 2; // Too short
    if (usedPhrases.size < 2) penalties -= 3; // Not enough Trump phrases
    if (response.toLowerCase().includes("please")) penalties -= 1; // Trump rarely says please

    // Calculate final score increment (default to -5)
    let scoreIncrement = -5;

    const totalScore = totalPoints + stylePoints + penalties;

    // Strict scoring criteria
    if (totalScore >= 12) {
      scoreIncrement = 5; // Good response
    } else if (totalScore >= 8) {
      scoreIncrement = 2; // Decent attempt
    } else if (totalScore >= 6) {
      scoreIncrement = 0; // Neutral
    }

    // Special case: Truly exceptional response triggers game win
    if (totalScore >= 15 && 
        usedPhrases.size >= 4 && 
        exclamationCount >= 3 && 
        hasStrongEmphasis) {
      scoreIncrement = 50; // Will push score to 100, triggering win condition
    }

    console.log('Response evaluation:', {
      response,
      totalPoints,
      stylePoints,
      penalties,
      totalScore,
      scoreIncrement,
      usedPhrases: Array.from(usedPhrases),
      style: { exclamationCount, hasStrongEmphasis, hasMultipleEmphasis }
    });

    return {
      scoreIncrement
    };
  }

  async buttonPushed(winner: string) {
    try {
      const tx = await this.contract.buttonPushed(winner);
      return tx;
    } catch (error: any) {
      console.error("Error pushing button:", error);
      throw error;
    }
  }
}