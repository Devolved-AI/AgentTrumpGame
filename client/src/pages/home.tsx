import { useState, useEffect } from "react";
import { ConnectWallet } from "@/components/game/ConnectWallet";
import { GameStatus } from "@/components/game/GameStatus";
import { ResponseForm } from "@/components/game/ResponseForm";
import { TransactionTimeline } from "@/components/game/TransactionTimeline";
import { TransactionLoader } from "@/components/game/TransactionLoader";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Confetti } from "@/components/game/Confetti";
import { connectWallet, disconnectWallet, type Web3State, initialWeb3State } from "@/lib/web3";
import { GameContract } from "@/lib/gameContract";
import { useToast } from "@/hooks/use-toast";
import { SiEthereum } from "react-icons/si";
import { getEthPriceUSD, formatUSD, formatEth } from "@/lib/utils";
import { Footer } from "@/components/Footer";

export default function Home() {
  const [web3State, setWeb3State] = useState<Web3State>(initialWeb3State);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdatingGameData, setIsUpdatingGameData] = useState(false);
  const [gameContract, setGameContract] = useState<GameContract | null>(null);
  const [gameStatus, setGameStatus] = useState({
    timeRemaining: 0,
    currentAmount: "0",
    lastPlayer: "",
    escalationActive: false,
    gameEndBlock: 0
  });
  const [playerHistory, setPlayerHistory] = useState([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [ethPrice, setEthPrice] = useState<number>(0);
  const [prizePoolEth, setPrizePoolEth] = useState<string>("0");
  const [persuasionScore, setPersuasionScore] = useState<number>(6); // Initial score of 6
  const { toast } = useToast();

  async function handleConnect() {
    setIsConnecting(true);
    setIsUpdatingGameData(true);
    try {
      const state = await connectWallet();
      setWeb3State(state);
      const contract = new GameContract(state.provider!, state.signer!);
      setGameContract(contract);

      // Subscribe to contract events
      contract.subscribeToEvents({
        onGuessSubmitted: () => {
          refreshGameStatus();
          updatePrizePool();
        },
        onGameWon: () => {
          setShowConfetti(true);
          toast({
            title: "Game Won!",
            description: "Someone has won the game!",
          });
          refreshGameStatus();
          updatePrizePool();
        },
        onEscalationStarted: () => {
          toast({
            title: "Escalation Started",
            description: "The game has entered escalation mode!",
          });
          refreshGameStatus();
          updatePrizePool();
        }
      });

      // Wait for all initial data to load
      await Promise.all([
        refreshGameStatus(),
        updatePrizePool()
      ]);

    } catch (error) {
      console.error("Failed to connect:", error);
      toast({
        title: "Connection Failed",
        description: "Failed to connect to the game. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsConnecting(false);
      setIsUpdatingGameData(false);
    }
  }

  async function handleDisconnect() {
    const initialState = await disconnectWallet();
    setWeb3State(initialState);
    setGameContract(null);
    setPlayerHistory([]);
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

  async function updatePrizePool() {
    if (!gameContract) return;
    try {
      const [price, totalPool] = await Promise.all([
        getEthPriceUSD(),
        gameContract.getTotalPrizePool()
      ]);
      setEthPrice(price);
      setPrizePoolEth(totalPool);
    } catch (error) {
      console.error("Failed to update prize pool:", error);
    }
  }

  async function handleSubmitResponse(response: string) {
    if (!gameContract) return;

    setIsLoading(true);
    try {
      // Evaluate the response first
      const isWinning = await gameContract.evaluateResponse(response);

      if (isWinning) {
        // Submit winning response and push the button
        await gameContract.submitResponse(response, gameStatus.currentAmount);
        await gameContract.buttonPushed(web3State.account!);
        setShowConfetti(true);
        setPersuasionScore(10); // Set to max when winning
        toast({
          title: "🎉 Congratulations! You've Won! 🎉",
          description: "Your response was perfect! The prize pool has been transferred to your wallet!",
          variant: "default"
        });
      } else {
        // Submit response but don't push button
        await gameContract.submitResponse(response, gameStatus.currentAmount);
        // Decrease persuasion score but don't go below 0
        setPersuasionScore(prev => Math.max(0, prev - 1));
        toast({
          title: "Try Again",
          description: "Your response wasn't quite persuasive enough. Keep trying!",
          variant: "destructive"
        });
      }

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

  useEffect(() => {
    if (!gameContract) return;
    const interval = setInterval(updatePrizePool, 10000);
    return () => clearInterval(interval);
  }, [gameContract]);

  return (
    <>
      <div className="container mx-auto px-4 py-8">
        <Confetti trigger={showConfetti} />

        {/* Loading Dialog */}
        <Dialog open={isUpdatingGameData} onOpenChange={setIsUpdatingGameData}>
          <DialogContent className="sm:max-w-[425px]">
            <TransactionLoader message="Updating game information..." />
          </DialogContent>
        </Dialog>

        {/* Header Section */}
        <div className="flex justify-between items-start mb-8">
          <h1 className="text-4xl font-bold">Agent Trump Game</h1>
          <ConnectWallet
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
            isConnected={web3State.connected}
            account={web3State.account}
            isConnecting={isConnecting}
            wrongNetwork={web3State.chainId !== 84532}
          />
        </div>

        {/* Prize Pool Display */}
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold mb-2">PRIZE POOL</h2>
          <h1 className="text-5xl font-bold text-green-500 flex items-center justify-center gap-4">
            <span>{formatUSD(parseFloat(prizePoolEth) * ethPrice)}</span>
            <span className="flex items-center gap-1">
              <SiEthereum className="inline-block" />
              <span>{formatEth(prizePoolEth)}</span>
            </span>
          </h1>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Left Column: Image */}
          <div>
            <div className="w-64 h-64 mb-6">
              <img
                src="/aitubo.jpg"
                alt="Agent Trump"
                className="w-full h-full object-cover rounded-lg shadow-lg"
              />
            </div>
          </div>

          {/* Right Column: Response Form */}
          <div>
            <ResponseForm
              onSubmit={handleSubmitResponse}
              currentAmount={gameStatus.currentAmount}
              isLoading={isLoading}
            />
          </div>
        </div>

        {/* Game Stats and History Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Left Column: Game Stats Quadrant */}
          <div>
            <GameStatus
              timeRemaining={gameStatus.timeRemaining}
              currentAmount={gameStatus.currentAmount}
              lastPlayer={gameStatus.lastPlayer}
              escalationActive={gameStatus.escalationActive}
              persuasionScore={persuasionScore}
            />
          </div>

          {/* Right Column: Transaction History */}
          <div>
            <h2 className="text-2xl font-bold mb-4">Transaction History</h2>
            <TransactionTimeline responses={playerHistory} />
          </div>
        </div>

        {/* Rules Section */}
        <div className="mt-8 bg-gray-50 rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4">Game Rules</h2>
          <div className="prose max-w-none">
            <p>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
            </p>
            <p className="mt-4">
              Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}