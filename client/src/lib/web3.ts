import { ethers } from 'ethers';
import { create } from 'zustand';
import { toast } from '@/hooks/use-toast';
import { PERSUASION_EVENT } from '@/components/PersuasionScore';

const CONTRACT_ADDRESS = "0x6d0bf16b9b0F865DDdE569313DE54896d244981F"; // Updated contract address
const CHAIN_ID = "0x14a34"; // Base Sepolia: 84532 in hex
const BASE_SEPOLIA_CONFIG = {
  chainId: CHAIN_ID,
  chainName: "Base Sepolia",
  nativeCurrency: {
    name: "Ethereum",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: ["https://sepolia.base.org"],
  blockExplorerUrls: ["https://sepolia.basescan.org"],
};

const CONTRACT_ABI = [
        {
                "inputs": [
                        {
                                "internalType": "address",
                                "name": "playerAddress",
                                "type": "address"
                        }
                ],
                "name": "getAllPlayerResponses",
                "outputs": [
                        {
                                "components": [
                                        {
                                                "internalType": "string[]",
                                                "name": "responses",
                                                "type": "string[]"
                                        },
                                        {
                                                "internalType": "bool[]",
                                                "name": "exists",
                                                "type": "bool[]"
                                        },
                                        {
                                                "internalType": "uint256[]",
                                                "name": "timestamps",
                                                "type": "uint256[]"
                                        }
                                ],
                                "internalType": "struct AgentTrumpGame.PlayerResponses",
                                "name": "",
                                "type": "tuple"
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
                "name": "forceEndGame",
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
                                "name": "owner",
                                "type": "address"
                        },
                        {
                                "indexed": false,
                                "internalType": "uint256",
                                "name": "ownerReward",
                                "type": "uint256"
                        }
                ],
                "name": "GameForciblyEnded",
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
                "inputs": [
                        {
                                "internalType": "uint256",
                                "name": "",
                                "type": "uint256"
                        }
                ],
                "name": "escalationPrices",
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
                "name": "gameStartBlock",
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
                "name": "getCurrentEscalationInterval",
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
                        }
                ],
                "name": "getPlayerResponses",
                "outputs": [
                        {
                                "components": [
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
                                "internalType": "struct TrumpGuessGame.PlayerResponse[]",
                                "name": "",
                                "type": "tuple[]"
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

// Define a custom event for contract changes
export const CONTRACT_CHANGE_EVENT = "contract-address-changed";
export type ContractChangeEvent = CustomEvent<{
  previousAddress: string | null;
  newAddress: string;
}>;

interface Web3State {
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  contract: ethers.Contract | null;
  address: string | null;
  balance: string | null;
  isInitialized: boolean;
  currentContractAddress: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  reset: () => void;
  clearMessages: () => void;
  resetPersuasionScores: () => Promise<void>;
  getRequiredAmount: () => Promise<string>;
  isGameOver: () => Promise<boolean>;
  isInEscalationPeriod: () => Promise<boolean>;
  getEscalationTimeRemaining: () => Promise<number>;
  getContractBalance: () => Promise<string>;
  prizePool: string;
  updatePrizePool: () => Promise<void>;
}

const checkNetwork = async (ethereum: any) => {
  try {
    const chainId = await ethereum.request({ method: 'eth_chainId' });
    if (chainId !== CHAIN_ID) {
      try {
        await ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: CHAIN_ID }],
        });
        return true;
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          try {
            await ethereum.request({
              method: "wallet_addEthereumChain",
              params: [BASE_SEPOLIA_CONFIG],
            });
            return true;
          } catch (addError) {
            console.error("Failed to add network:", addError);
            toast({
              title: "Network Error",
              description: "Failed to add Base Sepolia network. Please add it manually in MetaMask.",
              variant: "destructive",
            });
            return false;
          }
        }
        console.error("Failed to switch network:", switchError);
        toast({
          title: "Network Error",
          description: "Please switch to Base Sepolia network manually in MetaMask.",
          variant: "destructive",
        });
        return false;
      }
    }
    return true;
  } catch (error) {
    console.error("Error checking network:", error);
    return false;
  }
};

export const useWeb3Store = create<Web3State>((set, get) => ({
  provider: null,
  signer: null,
  contract: null,
  address: null,
  balance: null,
  isInitialized: false,
  currentContractAddress: null,
  prizePool: "0",
  
  getContractBalance: async () => {
    const { contract } = get();
    if (!contract) return "0";
    
    try {
      const balance = await contract.getContractBalance();
      return ethers.formatEther(balance);
    } catch (error) {
      console.error("Error getting contract balance:", error);
      return "0";
    }
  },
  
  updatePrizePool: async () => {
    try {
      const balance = await get().getContractBalance();
      set({ prizePool: balance });
      console.log("Updated prize pool balance:", balance);
      return;
    } catch (error) {
      console.error("Error updating prize pool:", error);
    }
  },

  getRequiredAmount: async () => {
    const { contract } = get();
    if (!contract) return "0";
    try {
      const amount = await contract.currentRequiredAmount();
      return ethers.formatEther(amount);
    } catch (error) {
      console.error("Error getting required amount:", error);
      return "0";
    }
  },

  isGameOver: async () => {
    const { contract } = get();
    if (!contract) return false;
    try {
      const [gameWon, timeRemaining] = await Promise.all([
        contract.gameWon(),
        contract.getTimeRemaining()
      ]);
      
      const time = Number(timeRemaining.toString());
      
      // Game is over when:
      // 1. Someone has won the game
      if (gameWon) {
        return true;
      }
      
      // 2. Time is up (5 minutes have passed)
      if (time <= 0) {
        return true;
      }
      
      // Otherwise, game is still running
      return false;
    } catch (error) {
      console.error("Error checking game over status:", error);
      return false;
    }
  },
  
  isInEscalationPeriod: async () => {
    const { contract } = get();
    if (!contract) return false;
    try {
      // Check if escalation is active
      const escalationActive = await contract.escalationActive();
      
      return escalationActive;
    } catch (error) {
      console.error("Error checking escalation period:", error);
      return false;
    }
  },
  
  getEscalationTimeRemaining: async () => {
    const { contract } = get();
    if (!contract) return 0;
    try {
      // Check if escalation is active
      const escalationActive = await contract.escalationActive();
      
      // If escalation is not active, return 0
      if (!escalationActive) {
        return 0;
      }
      
      // Use the contract's getTimeRemaining function which handles escalation periods
      const timeRemaining = await contract.getTimeRemaining();
      return Number(timeRemaining.toString());
    } catch (error) {
      console.error("Error getting escalation time remaining:", error);
      return 0;
    }
  },

  connect: async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      toast({
        title: "MetaMask Required",
        description: "Please install MetaMask to connect your wallet",
        variant: "destructive",
      });
      return;
    }

    try {
      set((state) => {
        state.clearMessages();
        return state;
      });


      // Verify network and switch if needed
      const networkValid = await checkNetwork(window.ethereum);
      if (!networkValid) return;

      const provider = new ethers.BrowserProvider(window.ethereum);

      try {
        const accounts = await provider.send("eth_requestAccounts", []);
        if (!accounts || accounts.length === 0) {
          toast({
            title: "Connection Error",
            description: "No accounts found. Please check MetaMask and try again.",
            variant: "destructive",
          });
          return;
        }

        const address = accounts[0];
        const signer = await provider.getSigner(address);
        const balance = ethers.formatEther(await provider.getBalance(address));
        const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

        // Verify contract connection
        try {
          await contract.gameWon();
        } catch (error: any) {
          console.error("Contract connection error:", error);
          toast({
            title: "Contract Error",
            description: "Failed to connect to game contract. Please try again later.",
            variant: "destructive",
          });
          return;
        }
        
        // Check if contract address has changed
        const previousContractAddress = get().currentContractAddress;
        
        // If this is a different contract address than before, dispatch an event
        if (previousContractAddress !== CONTRACT_ADDRESS) {
          // Dispatch custom event for contract address change
          window.dispatchEvent(
            new CustomEvent<{previousAddress: string | null; newAddress: string}>(
              CONTRACT_CHANGE_EVENT, 
              { 
                detail: {
                  previousAddress: previousContractAddress,
                  newAddress: CONTRACT_ADDRESS
                }
              }
            )
          );
          
          console.log(`Contract address changed from ${previousContractAddress || 'none'} to ${CONTRACT_ADDRESS}`);
        }

        // Get initial prize pool balance
        let initialPrizePool = "0";
        try {
          const contractBalance = await contract.getContractBalance();
          initialPrizePool = ethers.formatEther(contractBalance);
          console.log("Initial prize pool balance:", initialPrizePool);
        } catch (error) {
          console.error("Error getting initial prize pool balance:", error);
        }
        
        set({ 
          provider, 
          signer, 
          contract, 
          address, 
          balance, 
          isInitialized: true,
          currentContractAddress: CONTRACT_ADDRESS,
          prizePool: initialPrizePool
        });
        
        // Setup event listeners for contract balance updates
        try {
          contract.on(contract.getEvent("GuessSubmitted"), async () => {
            // Wait a moment for the transaction to be processed
            setTimeout(async () => {
              get().updatePrizePool();
            }, 1000);
          });
          
          contract.on(contract.getEvent("Deposited"), async () => {
            // Wait a moment for the transaction to be processed
            setTimeout(async () => {
              get().updatePrizePool();
            }, 1000);
          });
          
          console.log("Set up contract event listeners for balance updates");
        } catch (error) {
          console.error("Error setting up contract event listeners:", error);
        }

        toast({
          title: "Wallet Connected",
          description: "Successfully connected to Base Sepolia network",
        });

        // Setup event listeners
        window.ethereum.on('accountsChanged', async (accounts: string[]) => {
          if (accounts.length === 0) {
            set({ provider: null, signer: null, contract: null, address: null, balance: null, isInitialized: false });
          } else {
            const newAddress = accounts[0];
            const newBalance = ethers.formatEther(await provider.getBalance(newAddress));
            set((state) => ({ ...state, address: newAddress, balance: newBalance }));
          }
        });

        window.ethereum.on('chainChanged', () => {
          window.location.reload();
        });

      } catch (error: any) {
        console.error("Account access error:", error);
        toast({
          title: "Connection Error",
          description: "Failed to access account. Please check MetaMask permissions.",
          variant: "destructive",
        });
      }

    } catch (error: any) {
      console.error("Failed to connect:", error);
      toast({
        title: "Connection Error",
        description: error.message || "Failed to connect wallet",
        variant: "destructive",
      });
    }
  },

  disconnect: () => {
    if (window.ethereum) {
      window.ethereum.removeAllListeners('accountsChanged');
    }
    
    // Keep track of contract address and prize pool even when disconnected
    const currentContractAddress = get().currentContractAddress;
    const prizePool = get().prizePool;
    
    set({
      provider: null,
      signer: null,
      contract: null,
      address: null,
      balance: null,
      isInitialized: false,
      currentContractAddress, // Preserve contract address
      prizePool // Preserve prize pool
    });
    set((state) => {
      state.clearMessages();
      return state;
    });
    toast({
      title: "Wallet Disconnected",
      description: "Successfully disconnected wallet",
    });
  },

  reset: () => {
    if (window.ethereum) {
      window.ethereum.removeAllListeners('accountsChanged');
    }
    
    // When fully resetting, we also clear the contract address and prize pool
    set({
      provider: null,
      signer: null,
      contract: null,
      address: null,
      balance: null,
      isInitialized: false,
      currentContractAddress: null,
      prizePool: "0"
    });
  },

  clearMessages: () => {
    set((state) => ({ ...state }));
  },
  
  resetPersuasionScores: async () => {
    const { address, currentContractAddress } = get();
    if (!address) {
      toast({
        title: "Not Connected",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Use reset-all endpoint to reset all scores to 25 for new contract
      const defaultScore = 25; // Set all scores to 25
      
      if (currentContractAddress) {
        // Reset all scores for the current contract to 25
        const resetAllResponse = await fetch('/api/persuasion/reset-all', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            contractAddress: currentContractAddress,
            defaultScore 
          })
        });
        
        if (!resetAllResponse.ok) {
          console.warn('Failed to reset all persuasion scores, falling back to individual reset');
        } else {
          console.log(`Successfully reset all persuasion scores to ${defaultScore}`);
        }
      }
      
      // Also reset the individual user's score
      const response = await fetch('/api/persuasion/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          address,
          defaultScore
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to reset persuasion scores');
      }
      
      // Dispatch event to notify components about the reset
      window.dispatchEvent(
        new CustomEvent(PERSUASION_EVENT, { 
          detail: { message: `Persuasion scores reset to ${defaultScore}` }
        })
      );
      
      toast({
        title: "Scores Reset",
        description: `Your persuasion scores have been reset to ${defaultScore}`,
      });
    } catch (error: any) {
      console.error("Error resetting persuasion scores:", error);
      toast({
        title: "Reset Error",
        description: error.message || "Failed to reset persuasion scores",
        variant: "destructive",
      });
    }
  },
}));

export const formatEther = ethers.formatEther;
export const parseEther = ethers.parseEther;