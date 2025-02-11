import { ethers } from 'ethers';

const contractAddress = '0xD54EE0dA01bDdf4485F0B85CF6FeB51A1cC6D885';
const contractABI = [
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
		"name": "pause",
		"outputs": [],
		"stateMutability": "nonpayable",
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
		"name": "renounceOwnership",
		"outputs": [],
		"stateMutability": "nonpayable",
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
		"inputs": [],
		"name": "withdraw",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"stateMutability": "payable",
		"type": "fallback"
	},
	{
		"stateMutability": "payable",
		"type": "receive"
	}
];

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

    // Game is over if either time has run out or someone has won
    const isGameOver = Number(timeRemaining) <= 0 || isGameWon;

    return {
      timeRemaining: Number(timeRemaining),
      currentAmount: ethers.formatEther(currentRequiredAmount),
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
      // High impact phrases (worth 2 points)
      "make america great": 2,
      "tremendous": 2,
      "huge": 2,
      "winning": 2,
      "believe me": 2,
      "bigly": 2,
      "wall": 2,
      "great again": 2,

      // Medium impact phrases (worth 1 point)
      "beautiful": 1,
      "amazing": 1,
      "incredible": 1,
      "perfect": 1,
      "the best": 1,
      "nobody": 1,
      "fake news": 1,
      "very strongly": 1,
      "billions and billions": 1,
      "many people are saying": 1,
      "like never before": 1
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

    // Analyze sentence structure and creativity
    const hasExclamation = response.includes('!') ? 2 : 0;
    const hasEmphasis = response.toUpperCase() !== response && 
                       response.match(/[A-Z]{2,}/) ? 2 : 0;

    // Add bonus points for style
    totalPoints += hasExclamation + hasEmphasis;

    // More sophisticated scoring logic:
    // - Must use at least 2 unique Trump phrases to get any points
    // - Higher threshold for positive score increment
    // - Emphasis on combination of phrases and style

    let scoreIncrement = -5; // Default to negative score

    if (usedPhrases.size >= 2) {
      if (totalPoints >= 8) {
        scoreIncrement = 5; // Exceptional Trump-like response
      } else if (totalPoints >= 5) {
        scoreIncrement = 0; // Decent attempt, but not convincing enough
      } else {
        scoreIncrement = -5; // Not Trump-like enough
      }
    }

    // Special case: If response is exceptionally Trump-like
    // (uses 4+ unique phrases and has both emphasis and exclamation)
    if (usedPhrases.size >= 4 && hasExclamation && hasEmphasis && totalPoints >= 12) {
      scoreIncrement = 10; // Bonus points for exceptional responses
    }

    console.log('Response evaluation:', {
      response,
      totalPoints,
      scoreIncrement,
      usedPhrases: Array.from(usedPhrases),
      stylePoints: { hasExclamation, hasEmphasis }
    });

    return {
      scoreIncrement
    };
  }

  async buttonPushed(winner: string) {
    try {
      const tx = await this.contract.buttonPushed(winner);
      await tx.wait();
      return true;
    } catch (error) {
      console.error("Error pushing the button:", error);
      throw error;
    }
  }
}