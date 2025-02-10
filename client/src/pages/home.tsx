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

const PERSUASION_SCORE_KEY = 'persuasion_scores';

function getStoredPersuasionScore(address: string): number {
  try {
    const stored = localStorage.getItem(PERSUASION_SCORE_KEY);
    if (stored) {
      const scores = JSON.parse(stored);
      return scores[address] ?? 6; // Default to 6 if no score found
    }
  } catch (error) {
    console.error('Error reading persuasion score:', error);
  }
  return 6;
}

function storePersuasionScore(address: string, score: number) {
  try {
    const stored = localStorage.getItem(PERSUASION_SCORE_KEY);
    const scores = stored ? JSON.parse(stored) : {};
    scores[address] = score;
    localStorage.setItem(PERSUASION_SCORE_KEY, JSON.stringify(scores));
  } catch (error) {
    console.error('Error storing persuasion score:', error);
  }
}

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
  const [persuasionScore, setPersuasionScore] = useState<number>(6);
  const [transactionStatus, setTransactionStatus] = useState<'pending' | 'success' | 'error'>('pending');
  const { toast } = useToast();

  async function handleConnect() {
    setIsConnecting(true);
    setIsUpdatingGameData(true);
    try {
      const state = await connectWallet();
      setWeb3State(state);
      // Load stored persuasion score for this address
      if (state.account) {
        setPersuasionScore(getStoredPersuasionScore(state.account));
      }
      const contract = new GameContract(state.provider!, state.signer!);
      setGameContract(contract);

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
    setTransactionStatus('pending');
    try {
      const isWinning = await gameContract.evaluateResponse(response);

      if (isWinning) {
        const tx = await gameContract.submitResponse(response, gameStatus.currentAmount);
        setTransactionStatus('pending');
        await tx.wait();
        setTransactionStatus('success');
        await gameContract.buttonPushed(web3State.account!);
        setShowConfetti(true);
        setPersuasionScore(10);
        if (web3State.account) {
          storePersuasionScore(web3State.account, 10);
        }
        toast({
          title: "🎉 Congratulations! You've Won! 🎉",
          description: "Your response was perfect! The prize pool has been transferred to your wallet!",
          variant: "default"
        });
      } else {
        const tx = await gameContract.submitResponse(response, gameStatus.currentAmount);
        setTransactionStatus('pending');
        await tx.wait();
        setTransactionStatus('success');
        setPersuasionScore(prev => {
          const newScore = Math.max(0, prev - 1);
          if (web3State.account) {
            storePersuasionScore(web3State.account, newScore);
          }
          return newScore;
        });
        toast({
          title: "Try Again",
          description: "Your response wasn't quite persuasive enough. Keep trying!",
          variant: "destructive"
        });
      }

      await refreshGameStatus();
    } catch (error: any) {
      setTransactionStatus('error');
      if (error.code === 4001) {
        toast({
          title: "Transaction Cancelled",
          description: "You cancelled the transaction.",
          variant: "destructive"
        });
      }
      else if (error.code === 'NETWORK_ERROR') {
        toast({
          title: "Network Error",
          description: "Please check your internet connection and try again.",
          variant: "destructive"
        });
      }
      else if (error.reason) {
        toast({
          title: "Transaction Failed",
          description: error.reason,
          variant: "destructive"
        });
      }
      else {
        console.error("Submission error:", error);
        toast({
          title: "Error",
          description: "An unexpected error occurred. Please try again.",
          variant: "destructive"
        });
      }
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

        <Dialog open={isUpdatingGameData} onOpenChange={setIsUpdatingGameData}>
          <DialogContent className="sm:max-w-[425px]">
            <TransactionLoader message="Updating game information..." />
          </DialogContent>
        </Dialog>

        <div className="flex justify-between items-center mb-4">
          <h1 className="text-4xl font-bold">Not Like Us</h1>
          <ConnectWallet
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
            isConnected={web3State.connected}
            account={web3State.account}
            isConnecting={isConnecting}
            wrongNetwork={web3State.chainId !== 84532}
          />
        </div>

        <p className="text-lg text-muted-foreground mb-8">
          Kendrick Lamar has convinced the world Drake is "Not Like Us." Your job is to convince Kendrick that Drake is like us.
        </p>

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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div>
            <div className="w-full h-auto mb-6">
              <img
                src="/kendrick-vs-drake.jpg"
                alt="Kendrick vs Drake"
                className="w-full rounded-lg shadow-lg"
              />
            </div>
          </div>

          <div>
            <ResponseForm
              onSubmit={handleSubmitResponse}
              currentAmount={gameStatus.currentAmount}
              isLoading={isLoading}
              transactionStatus={transactionStatus}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div>
            <GameStatus
              timeRemaining={gameStatus.timeRemaining}
              currentAmount={gameStatus.currentAmount}
              lastPlayer={gameStatus.lastPlayer}
              escalationActive={gameStatus.escalationActive}
              persuasionScore={persuasionScore}
            />
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-4">Transaction History</h2>
            <TransactionTimeline responses={playerHistory} />
          </div>
        </div>

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