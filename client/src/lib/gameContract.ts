import { ethers } from 'ethers';

const contractAddress = '0x1234...'; // Replace with actual contract address
const contractABI = [/* Insert ABI here */];

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
      currentRequiredAmount: ethers.formatEther(currentRequiredAmount),
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
    const responses = await this.contract.getAllPlayerResponses(address);
    return {
      responses: responses[0],
      timestamps: responses[1].map((t: bigint) => Number(t)),
      exists: responses[2]
    };
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
