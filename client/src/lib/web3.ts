import { ethers } from 'ethers';
import { create } from 'zustand';
import { toast } from '@/hooks/use-toast';

const CONTRACT_ADDRESS = "0x194dC1f452CE1215981D02F6F15E64c2Ac304c90";
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
                "stateMutability": "payable",
                "type": "fallback"
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
                "type": "receive"
        }
];

interface Web3State {
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  contract: ethers.Contract | null;
  address: string | null;
  balance: string | null;
  isInitialized: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  reset: () => void;
  clearMessages: () => void;
  getEscalationPrice: () => Promise<string>;
  isGameOver: () => Promise<boolean>;
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

  getEscalationPrice: async () => {
    const { contract } = get();
    if (!contract) return "0";
    try {
      const amount = await contract.currentRequiredAmount();
      return ethers.formatEther(amount);
    } catch (error) {
      console.error("Error getting escalation price:", error);
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
      return gameWon || Number(timeRemaining.toString()) <= 0;
    } catch (error) {
      console.error("Error checking game over status:", error);
      return false;
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

        set({ provider, signer, contract, address, balance, isInitialized: true });

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
    set({
      provider: null,
      signer: null,
      contract: null,
      address: null,
      balance: null,
      isInitialized: false
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
    set({
      provider: null,
      signer: null,
      contract: null,
      address: null,
      balance: null,
      isInitialized: false
    });
  },

  clearMessages: () => {
    set((state) => ({ ...state }));
  },
}));

export const formatEther = ethers.formatEther;
export const parseEther = ethers.parseEther;