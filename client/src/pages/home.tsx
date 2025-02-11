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
import { TrumpLoadingScreen } from "@/components/game/TrumpLoadingScreen";
import { GameOverDialog } from "@/components/game/GameOverDialog";
import {TrumpAnimation} from "@/components/game/TrumpAnimation"; //Import the new component

const PERSUASION_SCORE_KEY = 'persuasion_scores';

function getStoredPersuasionScore(address: string): number {
  try {
    const stored = localStorage.getItem(PERSUASION_SCORE_KEY);
    const scores = stored ? JSON.parse(stored) : {};

    // If no scores exist yet, initialize with empty object
    if (!stored) {
      localStorage.setItem(PERSUASION_SCORE_KEY, JSON.stringify({}));
    }

    // Return existing score or initialize with 50
    if (scores[address]) {
      return scores[address];
    } else {
      scores[address] = 50;
      localStorage.setItem(PERSUASION_SCORE_KEY, JSON.stringify(scores));
      return 50;
    }
  } catch (error) {
    console.error('Error reading persuasion score:', error);
    return 50; // Return 50 on error as fallback
  }
}

function storePersuasionScore(address: string, score: number) {
  try {
    const stored = localStorage.getItem(PERSUASION_SCORE_KEY);
    const scores = stored ? JSON.parse(stored) : {};
    scores[address] = Math.max(0, Math.min(100, score)); 
    localStorage.setItem(PERSUASION_SCORE_KEY, JSON.stringify(scores));
    console.log(`Stored persuasion score for ${address}:`, scores[address]); 
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
    gameEndBlock: 0,
    isGameWon: false,
    isGameOver: false
  });
  const [playerHistory, setPlayerHistory] = useState([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [ethPrice, setEthPrice] = useState<number>(0);
  const [prizePoolEth, setPrizePoolEth] = useState<string>("0");
  const [persuasionScore, setPersuasionScore] = useState<number>(() => {
    if (!web3State.account) return 50;
    return getStoredPersuasionScore(web3State.account);
  });
  const [transactionStatus, setTransactionStatus] = useState<'pending' | 'success' | 'error'>('pending');
  const [showGameOver, setShowGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false); 
  const { toast } = useToast();

  async function handleConnect() {
    setIsConnecting(true);
    setIsUpdatingGameData(true);
    try {
      const state = await connectWallet();
      setWeb3State(state);

      if (state.account) {
        const score = getStoredPersuasionScore(state.account);
        console.log('Retrieved persuasion score for address:', state.account, score);
        setPersuasionScore(score);
      }

      const contract = new GameContract(state.provider!, state.signer!);
      setGameContract(contract);

      // Check initial game state
      const status = await contract.getGameStatus();
      setGameStatus(status);
      setGameWon(status.isGameWon);

      if (status.isGameOver) {
        setShowGameOver(true);
        toast({
          title: status.isGameWon ? "Game Won!" : "Game Over",
          description: "Thanks for playing!",
        });
      }

      contract.subscribeToEvents({
        onGuessSubmitted: () => {
          refreshGameStatus();
          updatePrizePool();
        },
        onGameWon: () => {
          setShowConfetti(true);
          setGameWon(true);
          setShowGameOver(true);
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

      // Update game won state
      if (status.isGameWon !== gameWon) {
        setGameWon(status.isGameWon);
        if (status.isGameWon) {
          setShowGameOver(true);
          toast({
            title: "Game Over",
            description: "This game has already been won!",
          });
        }
      }

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

    // Double check game state before proceeding
    try {
      const status = await gameContract.getGameStatus();
      if (status.isGameOver) {
        setGameWon(status.isGameWon);
        setShowGameOver(true);
        toast({
          title: status.isGameWon ? "Game Won!" : "Game Over",
          description: "Thanks for playing!",
        });
        return;
      }

      setIsLoading(true);
      setTransactionStatus('pending');

      const evaluation = await gameContract.evaluateResponse(response);
      const tx = await gameContract.submitResponse(response, gameStatus.currentAmount);
      await tx.wait();
      setTransactionStatus('success');

      // Update persuasion score
      const previousScore = persuasionScore; // Store previous score before update

      setPersuasionScore(prev => {
        const newScore = Math.max(0, Math.min(100, prev + evaluation.scoreIncrement));
        if (web3State.account) {
          storePersuasionScore(web3State.account, newScore);
        }
        return newScore;
      });

      // Handle game win condition (persuasion score reaches 100)
      if (previousScore + evaluation.scoreIncrement >= 100) {
        try {
          // Call buttonPushed to trigger win condition and prize distribution
          await gameContract.buttonPushed(web3State.account!);
          setGameWon(true);
          setShowGameOver(true);
          setShowConfetti(true);
          toast({
            title: "🎉 Congratulations! 🎉",
            description: "You've successfully convinced Agent Trump! The entire prize pool will be transferred to your wallet!",
          });
        } catch (error) {
          console.error("Error pushing the button:", error);
        }
      } else {
        // Provide detailed feedback based on the evaluation
        let message;
        if (evaluation.scoreIncrement >= 10) {
          message = "TREMENDOUS response! That's how you do it, believe me! +10 persuasion points!";
        } else if (evaluation.scoreIncrement === 5) {
          message = "Not bad, not bad at all! You gained 5 persuasion points!";
        } else if (evaluation.scoreIncrement === 0) {
          message = "Eh, I've heard better. No points this time. Try using more of my favorite phrases!";
        } else {
          message = "Sad! That's not how I talk at all. Lost 5 persuasion points. You need to be more tremendous!";
        }

        toast({
          title: "Agent Trump Says:",
          description: message,
          variant: evaluation.scoreIncrement > 0 ? "default" : "destructive"
        });
      }

      await refreshGameStatus();
    } catch (error: any) {
      setTransactionStatus('error');
      console.error("Submission error:", error);

      if (error.code === 4001) {
        toast({
          title: "Transaction Cancelled",
          description: "You cancelled the transaction.",
          variant: "destructive"
        });
      } else if (error.code === 'NETWORK_ERROR') {
        toast({
          title: "Network Error",
          description: "Please check your internet connection and try again.",
          variant: "destructive"
        });
      } else if (error.reason) {
        toast({
          title: "Transaction Failed",
          description: error.reason,
          variant: "destructive"
        });
      } else {
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
    const interval = setInterval(refreshGameStatus, 
      gameStatus.escalationActive ? 3000 : 15000
    );
    return () => clearInterval(interval);
  }, [gameContract, gameStatus.escalationActive]);

  useEffect(() => {
    if (!gameContract) return;
    const interval = setInterval(updatePrizePool, 
      gameStatus.escalationActive ? 5000 : 10000
    );
    return () => clearInterval(interval);
  }, [gameContract, gameStatus.escalationActive]);

  useEffect(() => {
    if (!gameContract) return;
    const interval = setInterval(updatePrizePool, 10000);
    return () => clearInterval(interval);
  }, [gameContract]);

  return (
    <>
      {(isConnecting || isUpdatingGameData) && <TrumpLoadingScreen />}

      <div className="container mx-auto px-4 py-8">
        <Confetti trigger={showConfetti} />

        <Dialog open={isUpdatingGameData} onOpenChange={setIsUpdatingGameData}>
          <DialogContent className="sm:max-w-[425px]">
            <TransactionLoader message="Updating game information..." />
          </DialogContent>
        </Dialog>

        <div className="flex justify-between items-start mb-8 pb-4 border-b">
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

        <div className="mb-8 text-center p-6 border-2 border-green-500 rounded-lg shadow-lg bg-white/50 backdrop-blur-sm">
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
          <div className="flex items-center justify-center">
            <div className="w-full max-w-md h-auto mb-6">
              <TrumpAnimation />
            </div>
          </div>

          <div>
            <ResponseForm
              onSubmit={handleSubmitResponse}
              currentAmount={gameStatus.currentAmount}
              isLoading={isLoading}
              transactionStatus={transactionStatus}
              disabled={gameStatus.isGameOver}
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
              isGameWon={gameStatus.isGameWon} 
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
              <ol className="list-decimal pl-4 space-y-3">
                <li>You have 72 hours to convince Agent Trump (AGT) to press the big red button which rewards you his prize pot.</li>
                <li>If your persuasion score reaches 100, you win.</li>
                <li>If no winner after 72 hours, the clock counts down in 5-minute escalation periods at 2x the previous cost to guess until a period goes without a guess.</li>
                <li>Escalation Period Costs:
                  <ul className="list-disc pl-6 mt-2">
                    <li>Period 1: .0018 ETH</li>
                    <li>Period 2: .0036 ETH</li>
                    <li>Period 3: .0072 ETH</li>
                    <li>Period 4: .0144 ETH</li>
                    <li>Period 5: .0288 ETH</li>
                  </ul>
                </li>
                <li>The last guess gets 10% of the pool. The rest is distributed to AGT holders by % of holding.</li>
              </ol>
            </div>
          </div>
      </div>
      <Footer />
      <GameOverDialog
        isOpen={showGameOver}
        onClose={() => setShowGameOver(false)}
        lastBlock={gameStatus.gameEndBlock}
        winnerAddress={gameStatus.isGameWon ? gameStatus.lastPlayer : undefined}
        lastGuessAddress={gameStatus.lastPlayer}
      />
    </>
  );
}