import { useState, useEffect } from "react";
import { ConnectWallet } from "@/components/game/ConnectWallet";
import { GameStatus } from "@/components/game/GameStatus";
import { ResponseForm } from "@/components/game/ResponseForm";
import { TransactionTimeline } from "@/components/game/TransactionTimeline";
import { connectWallet, type Web3State, initialWeb3State } from "@/lib/web3";
import { GameContract } from "@/lib/gameContract";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const [web3State, setWeb3State] = useState<Web3State>(initialWeb3State);
  const [isConnecting, setIsConnecting] = useState(false);
  const [gameContract, setGameContract] = useState<GameContract | null>(null);
  const [gameStatus, setGameStatus] = useState({
    timeRemaining: 0,
    currentAmount: "0",
    lastPlayer: "",
    escalationActive: false
  });
  const [playerHistory, setPlayerHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  async function handleConnect() {
    setIsConnecting(true);
    try {
      const state = await connectWallet();
      setWeb3State(state);
      const contract = new GameContract(state.provider!, state.signer!);
      setGameContract(contract);

      // Subscribe to contract events
      contract.subscribeToEvents({
        onGuessSubmitted: () => refreshGameStatus(),
        onGameWon: () => {
          toast({
            title: "Game Won!",
            description: "Someone has won the game!",
          });
          refreshGameStatus();
        },
        onEscalationStarted: () => {
          toast({
            title: "Escalation Started",
            description: "The game has entered escalation mode!",
          });
          refreshGameStatus();
        }
      });
    } catch (error) {
      console.error("Failed to connect:", error);
    } finally {
      setIsConnecting(false);
    }
  }

  async function refreshGameStatus() {
    if (!gameContract) return;

    try {
      const status = await gameContract.getGameStatus();
      setGameStatus(status);

      if (web3State.account) {
        const history = await gameContract.getPlayerHistory(web3State.account);
        setPlayerHistory(history);
      }
    } catch (error) {
      console.error("Failed to refresh game status:", error);
    }
  }

  async function handleSubmitResponse(response: string) {
    if (!gameContract) return;

    setIsLoading(true);
    try {
      await gameContract.submitResponse(response, gameStatus.currentAmount);
      toast({
        title: "Response Submitted",
        description: "Your response has been successfully submitted!",
      });
      await refreshGameStatus();
    } catch (error: any) {
      toast({
        title: "Submission Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const interval = setInterval(refreshGameStatus, 15000);
    return () => clearInterval(interval);
  }, [gameContract]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-4">Agent Trump Game</h1>
          <div className="w-64 h-64 mb-6">
            <img 
              src="/aitubo.jpg" 
              alt="Agent Trump"
              className="w-full h-full object-cover rounded-lg shadow-lg"
            />
          </div>
        </div>
        <ConnectWallet
          onConnect={handleConnect}
          isConnected={web3State.connected}
          account={web3State.account}
          isConnecting={isConnecting}
          wrongNetwork={web3State.chainId !== 84532}
        />
      </div>

      <GameStatus
        timeRemaining={gameStatus.timeRemaining}
        currentAmount={gameStatus.currentAmount}
        lastPlayer={gameStatus.lastPlayer}
        escalationActive={gameStatus.escalationActive}
      />

      <div className="mt-8 grid gap-8 md:grid-cols-2">
        <div>
          <h2 className="text-2xl font-bold mb-4">Submit Response</h2>
          <ResponseForm
            onSubmit={handleSubmitResponse}
            currentAmount={gameStatus.currentAmount}
            isLoading={isLoading}
          />
        </div>
        <div>
          <h2 className="text-2xl font-bold mb-4">Transaction History</h2>
          <TransactionTimeline responses={playerHistory} />
        </div>
      </div>
    </div>
  );
}