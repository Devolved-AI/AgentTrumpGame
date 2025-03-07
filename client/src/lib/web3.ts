import { ethers } from 'ethers';
import { create } from 'zustand';
import { toast } from '@/hooks/use-toast';

const CONTRACT_ADDRESS = "0x13919c4F9817b3c56083ED7520365A8E0A69b343";
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

// Define the minimal ABI we need for our application
const CONTRACT_ABI = [
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
    "inputs": [],
    "name": "isGameOver",
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
    "name": "lastGuessAddress",
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
    "name": "getRemainingBlocks",
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
            console.error("Failed to add Base Sepolia network:", addError);
            return false;
          }
        } else {
          console.error("Failed to switch to Base Sepolia network:", switchError);
          return false;
        }
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
  
  connect: async () => {
    try {
      if (!window.ethereum) {
        toast({
          title: "Web3 Error",
          description: "No Web3 provider detected. Please install MetaMask.",
          variant: "destructive",
        });
        return;
      }

      const isCorrectNetwork = await checkNetwork(window.ethereum);
      if (!isCorrectNetwork) {
        toast({
          title: "Network Error",
          description: "Please connect to Base Sepolia network.",
          variant: "destructive",
        });
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const balance = ethers.formatEther(await provider.getBalance(address));
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      set({
        provider,
        signer,
        contract,
        address,
        balance,
        isInitialized: true,
      });

      toast({
        title: "Connected",
        description: `Successfully connected to ${address.slice(0, 6)}...${address.slice(-4)}`,
      });

      // Listen for account changes
      window.ethereum.on("accountsChanged", () => {
        get().reset();
        get().connect();
      });

      // Listen for chain changes
      window.ethereum.on("chainChanged", () => {
        window.location.reload();
      });

    } catch (error: any) {
      console.error("Connect error:", error);
      toast({
        title: "Connection Error",
        description: error.message || "Failed to connect wallet",
        variant: "destructive",
      });
    }
  },

  disconnect: () => {
    set({
      provider: null,
      signer: null,
      contract: null,
      address: null,
      balance: null,
      isInitialized: false,
    });
    toast({
      title: "Disconnected",
      description: "Wallet disconnected successfully",
    });
  },

  reset: () => {
    set({
      provider: null,
      signer: null,
      contract: null,
      address: null,
      balance: null,
      isInitialized: false,
    });
  },

  clearMessages: () => {
    // This method will be implemented with message history state
  },

  getEscalationPrice: async () => {
    try {
      const { contract } = get();
      if (!contract) return "0";
      
      const price = await contract.getCurrentRequiredAmount();
      return ethers.formatEther(price);
    } catch (error) {
      console.error("Error getting escalation price:", error);
      return "0";
    }
  },

  isGameOver: async () => {
    try {
      const { contract } = get();
      if (!contract) return false;
      
      const gameOver = await contract.isGameOver();
      return gameOver;
    } catch (error) {
      console.error("Error checking if game is over:", error);
      return false;
    }
  }
}));

export const formatEther = ethers.formatEther;
export const parseEther = ethers.parseEther;