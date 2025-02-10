import { ethers } from 'ethers';

const contractAddress = '0x1234...'; // TODO: Replace with actual contract address
const contractABI = [
  "event GuessSubmitted(address indexed player, uint256 amount, uint256 multiplier, string response, uint256 blockNumber, uint256 responseIndex)",
  "event GameWon(address indexed winner, uint256 reward)",
  "event GameEnded(address indexed lastPlayer, uint256 lastPlayerReward, uint256 ownerReward)",
  "event EscalationStarted(uint256 startBlock)",
  "event GameExtended(uint256 newEndBlock, uint256 newMultiplier)",
  "function getTimeRemaining() view returns (uint256)",
  "function getCurrentRequiredAmount() view returns (uint256)",
  "function lastPlayer() view returns (address)",
  "function escalationActive() view returns (bool)",
  "function gameEndBlock() view returns (uint256)",
  "function submitGuess(string) payable",
  "function getAllPlayerResponses(address) view returns (string[], uint256[], bool[])"
];

export class GameContract {
  private contract: ethers.Contract;
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
      gameEndBlock
    ] = await Promise.all([
      this.contract.getTimeRemaining(),
      this.contract.getCurrentRequiredAmount(),
      this.contract.lastPlayer(),
      this.contract.escalationActive(),
      this.contract.gameEndBlock()
    ]);

    return {
      timeRemaining: Number(timeRemaining),
      currentAmount: ethers.formatEther(currentRequiredAmount),
      lastPlayer,
      escalationActive,
      gameEndBlock: Number(gameEndBlock)
    };
  }

  async submitResponse(response: string, amount: string) {
    const tx = await this.contract.submitGuess(response, {
      value: ethers.parseEther(amount)
    });
    return tx.wait();
  }

  async getPlayerHistory(address: string) {
    const [responses, timestamps, exists] = await this.contract.getAllPlayerResponses(address);
    return responses.map((response: string, index: number) => ({
      response,
      timestamp: Number(timestamps[index]),
      exists: exists[index]
    })).filter((item: any) => item.exists);
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
}