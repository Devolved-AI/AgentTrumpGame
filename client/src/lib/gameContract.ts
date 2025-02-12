import { ethers } from 'ethers';

const contractAddress = '0xF1207CCEFd42aF2ebB269CE7Bd50A39DFE983f90';
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
				"indexed": false,
				"internalType": "uint256",
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

const PLAYER_RESPONSES_KEY = 'playerResponses';

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
      escalationStartBlock
    ] = await Promise.all([
      this.contract.getTimeRemaining(),
      this.contract.getCurrentRequiredAmount(),
      this.contract.lastPlayer(),
      this.contract.escalationActive(),
      this.contract.gameEndBlock(),
      this.contract.gameWon(),
      this.contract.currentMultiplier(),
      this.contract.escalationStartBlock()
    ]);

    // Calculate escalation period information
    let currentAmount = ethers.formatEther(currentRequiredAmount);
    let escalationPeriodTimeRemaining = 0;
    let currentPeriodIndex = 0;

    if (escalationActive) {
      // Each escalation period is 5 minutes (300 seconds)
      const ESCALATION_PERIOD = 300;
      const blocksSinceEscalation = await this.getCurrentBlock() - Number(escalationStartBlock);
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

    // Calculate the final status
    const isGameOver = Number(timeRemaining) <= 0 || isGameWon;

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

  async submitResponse(response: string, amount: string) {
    try {
      const parsedAmount = ethers.parseEther(amount.toString());
      console.log('Submitting response with amount:', amount, 'ETH, parsed:', parsedAmount.toString());

      const tx = await this.contract.submitGuess(response, {
        value: parsedAmount,
        gasLimit: 500000
      });

      // Wait for the transaction to be mined to get the block number
      const receipt = await tx.wait();
      const address = await this.signer.getAddress();

      // Store response in localStorage
      const stored = localStorage.getItem(PLAYER_RESPONSES_KEY) || '{}';
      const responses = JSON.parse(stored);
      if (!responses[address]) {
        responses[address] = [];
      }

      responses[address].push({
        response,
        timestamp: Date.now(),
        blockNumber: receipt.blockNumber,
        transactionHash: tx.hash,
        exists: true
      });

      localStorage.setItem(PLAYER_RESPONSES_KEY, JSON.stringify(responses));
      console.log('Stored response in localStorage:', responses[address]);

      return tx;
    } catch (error: any) {
      console.error("Transaction error:", error);
      throw error;
    }
  }

  async getPlayerHistory(address: string) {
    try {
      const stored = localStorage.getItem(PLAYER_RESPONSES_KEY);
      const responses = stored ? JSON.parse(stored) : {};
      return responses[address] || [];
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