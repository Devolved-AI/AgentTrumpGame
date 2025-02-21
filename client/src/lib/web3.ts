import { ethers } from 'ethers';
import { create } from 'zustand';
import { toast } from '@/hooks/use-toast';

const CONTRACT_ADDRESS = "0x1fB1Fd56Ca11c69aC305Ff492712B6E03952F226";
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
  "function submitGuess(string calldata response) payable",
  "function getTimeRemaining() view returns (uint256)",
  "function lastPlayer() view returns (address)",
  "function gameWon() view returns (bool)",
  "function escalationActive() view returns (bool)",
  "function getContractBalance() view returns (uint256)",
  "function currentRequiredAmount() view returns (uint256)",
  "function currentMultiplier() view returns (uint256)",
  "function BASE_MULTIPLIER() view returns (uint256)",
  "function BLOCKS_PER_MINUTE() view returns (uint256)",
  "function ESCALATION_PERIOD() view returns (uint256)",
  "function escalationStartBlock() view returns (uint256)",
  "function gameEndBlock() view returns (uint256)",
  "function shouldExtendGame() view returns (bool)",
  "function shouldStartEscalation() view returns (bool)",
  "function totalCollected() view returns (uint256)",
  "function getPlayerResponseCount(address player) view returns (uint256)",
  "function getPlayerResponseByIndex(address player, uint256 index) view returns (string memory response, uint256 timestamp, bool exists)",
  "function getAllPlayerResponses(address player) view returns (string[] memory responses, uint256[] memory timestamps, bool[] memory exists)",
  "event GuessSubmitted(address indexed player, uint256 amount, uint256 multiplier, string response, uint256 blockNumber, uint256 responseIndex)",
  "event GameWon(address indexed winner, uint256 reward)",
  "event GameEnded(address indexed lastPlayer, uint256 lastPlayerReward, uint256 ownerReward)",
  "event EscalationStarted(uint256 startBlock)",
  "event GameExtended(uint256 newEndBlock, uint256 newMultiplier)",
  "event Deposited(address indexed owner, uint256 amount)",
  "event Withdrawn(address indexed owner, uint256 amount)",
  "event EmergencyWithdrawn(address indexed owner, uint256 amount)",
  "event Paused(address account)",
  "event Unpaused(address account)",
  "event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)"
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

      // Check if MetaMask is unlocked
      const isUnlocked = await window.ethereum._metamask?.isUnlocked();
      if (!isUnlocked) {
        toast({
          title: "Wallet Locked",
          description: "Please unlock your MetaMask wallet to connect",
          variant: "destructive",
        });
        return;
      }

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