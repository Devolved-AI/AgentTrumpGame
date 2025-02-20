import { ethers } from 'ethers';
import { create } from 'zustand';

const CONTRACT_ADDRESS = "YOUR_CONTRACT_ADDRESS"; // Replace with actual address
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
  "function gameEndBlock() view returns (uint256)",
  "function escalationStartBlock() view returns (uint256)",
  "function lastGuessBlock() view returns (uint256)",
  "function currentMultiplier() view returns (uint256)",
  "function totalCollected() view returns (uint256)",
  "function currentRequiredAmount() view returns (uint256)",
  "function lastPlayer() view returns (address)",
  "function gameWon() view returns (bool)",
  "function escalationActive() view returns (bool)",
  "function getTimeRemaining() view returns (uint256)",
  "function submitGuess(string calldata response) payable",
  "function getPlayerResponseCount(address player) view returns (uint256)",
  "function getPlayerResponseByIndex(address player, uint256 index) view returns (string memory response, uint256 timestamp, bool exists)",
  "event GuessSubmitted(address indexed player, uint256 amount, uint256 multiplier, string response, uint256 blockNumber, uint256 responseIndex)"
];

interface Web3State {
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  contract: ethers.Contract | null;
  address: string | null;
  balance: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
}

export const useWeb3Store = create<Web3State>((set) => ({
  provider: null,
  signer: null,
  contract: null,
  address: null,
  balance: null,

  connect: async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error("MetaMask is not installed");
    }

    try {
      // Request network switch
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: CHAIN_ID }],
        });
      } catch (switchError: any) {
        // Network doesn't exist, add it
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [BASE_SEPOLIA_CONFIG],
          });
        } else {
          throw switchError;
        }
      }

      const provider = new ethers.BrowserProvider(window.ethereum, {
        network: {
          chainId: parseInt(CHAIN_ID, 16),
          name: "base-sepolia",
          ensAddress: null // Explicitly disable ENS
        }
      });

      const accounts = await provider.send("eth_requestAccounts", []);
      const address = accounts[0];
      const signer = await provider.getSigner(address);
      const balance = ethers.formatEther(await provider.getBalance(address));
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      set({ provider, signer, contract, address, balance });
    } catch (error: any) {
      console.error("Failed to connect:", error);
      throw error;
    }
  },

  disconnect: () => {
    set({ provider: null, signer: null, contract: null, address: null, balance: null });
  }
}));

export const formatEther = ethers.formatEther;
export const parseEther = ethers.parseEther;