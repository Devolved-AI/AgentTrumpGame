import { useState, useEffect } from "react";
import { ConnectWallet } from "@/components/game/ConnectWallet";
import { GameStatus } from "@/components/game/GameStatus";
import { ResponseForm } from "@/components/game/ResponseForm";
import { TransactionTimeline } from "@/components/game/TransactionTimeline";
import { TransactionLoader } from "@/components/game/TransactionLoader";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Confetti } from "@/components/game/Confetti";
import { connectWallet, disconnectWallet, restoreWalletConnection, type Web3State, initialWeb3State } from "@/lib/web3";
import { GameContract } from "@/lib/gameContract";
import { useToast } from "@/hooks/use-toast";
import { SiEthereum } from "react-icons/si";
import { getEthPriceUSD, formatUSD, formatEth } from "@/lib/utils";
import { Footer } from "@/components/Footer";
import { TrumpLoadingScreen } from "@/components/game/TrumpLoadingScreen";
import { GameOverDialog } from "@/components/game/GameOverDialog";
import {TrumpAnimation} from "@/components/game/TrumpAnimation";
import { formatInTimeZone } from 'date-fns-tz';
import { AgentTrumpDialog } from "@/components/game/AgentTrumpDialog";

function clearAllGameState() {
  // Clear all game-related localStorage items
  localStorage.clear(); // This will remove ALL localStorage items
}

const PERSUASION_SCORE_KEY = 'persuasion_scores';
const PLAYER_RESPONSES_KEY = 'player_responses';

// Format timestamp to Pacific Time
function formatPacificTime(timestamp: number): string {
  return formatInTimeZone(
    new Date(timestamp),
    'America/Los_Angeles',
    'MMM dd, yyyy HH:mm:ss zzz'
  );
}

// Updated localStorage functions with better persistence
function getStoredPersuasionScore(address: string): number {
  try {
    const stored = localStorage.getItem(PERSUASION_SCORE_KEY);
    const scores = stored ? JSON.parse(stored) : {};
    const score = scores[address.toLowerCase()];
    // Always return 50 as default score for new game
    return 50;
  } catch (error) {
    console.error('Error reading persuasion score:', error);
    return 50;
  }
}

function storePersuasionScore(address: string, score: number) {
  try {
    const scores = {};
    scores[address.toLowerCase()] = Math.max(0, Math.min(100, score));
    localStorage.setItem(PERSUASION_SCORE_KEY, JSON.stringify(scores));
  } catch (error) {
    console.error('Error storing persuasion score:', error);
  }
}

function storePlayerResponse(
  address: string, 
  response: string, 
  timestamp: number, 
  blockNumber: number, 
  hash: string | null
) {
  try {
    const responses = {};
    const normalizedAddress = address.toLowerCase();
    responses[normalizedAddress] = [{
      response,
      timestamp,
      blockNumber,
      transactionHash: hash,
      exists: true
    }];
    localStorage.setItem(PLAYER_RESPONSES_KEY, JSON.stringify(responses));
  } catch (error) {
    console.error('Error storing player response:', error);
  }
}

function getPlayerResponses(address: string): PlayerHistoryItem[] {
  try {
    // Always return empty array for new game
    return [];
  } catch (error) {
    console.error('Error getting player responses:', error);
    return [];
  }
}

interface PlayerHistoryItem {
  response: string;
  timestamp: number;
  transactionHash: string | null;
  blockNumber: number;
  exists: boolean;
}

export default function Home() {
  const [web3State, setWeb3State] = useState<Web3State>(initialWeb3State);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdatingGameData, setIsUpdatingGameData] = useState(false);
  const [gameContract, setGameContract] = useState<GameContract | null>(null);
  const [gameStatus, setGameStatus] = useState({
    timeRemaining: 0,
    currentAmount: "0.0009", // Set to initial game amount
    lastPlayer: "",
    escalationActive: false,
    gameEndBlock: 0,
    isGameWon: false,
    isGameOver: false,
    currentMultiplier: 1,
    escalationPeriodTimeRemaining: 0,
    currentPeriodIndex: 0
  });
  const [playerHistory, setPlayerHistory] = useState<PlayerHistoryItem[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [ethPrice, setEthPrice] = useState<number>(0);
  const [prizePoolEth, setPrizePoolEth] = useState<string>("0");
  const [persuasionScore, setPersuasionScore] = useState<number>(50);
  const [transactionStatus, setTransactionStatus] = useState<'pending' | 'success' | 'error'>('pending');
  const [showGameOver, setShowGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const { toast } = useToast();
  const [showTrumpDialog, setShowTrumpDialog] = useState(false);
  const [trumpMessage, setTrumpMessage] = useState("");
  const [trumpMessageVariant, setTrumpMessageVariant] = useState<'success' | 'error'>('success');

  // Clear all game state on component mount
  useEffect(() => {
    clearAllGameState();
    // Reset all game states to initial values
    setGameStatus({
      timeRemaining: 0,
      currentAmount: "0.0009",
      lastPlayer: "",
      escalationActive: false,
      gameEndBlock: 0,
      isGameWon: false,
      isGameOver: false,
      currentMultiplier: 1,
      escalationPeriodTimeRemaining: 0,
      currentPeriodIndex: 0
    });
    setPlayerHistory([]);
    setShowGameOver(false);
    setGameWon(false);
    setShowConfetti(false);
    setPrizePoolEth("0");
    setPersuasionScore(50);
  }, []);

  // Attempt to restore wallet connection on mount
  useEffect(() => {
    async function restoreConnection() {
      try {
        const restored = await restoreWalletConnection();
        if (restored) {
          setWeb3State(restored);
          const contract = new GameContract(restored.provider!, restored.signer!);
          setGameContract(contract);
          await initializeGameData(contract, restored.account!);

          contract.subscribeToEvents({
            onGuessSubmitted: async () => {
              await Promise.all([
                refreshGameStatus(),
                updatePrizePool(),
                refreshPlayerHistory()
              ]);
            },
            onGameWon: async () => {
              setShowConfetti(true);
              setGameWon(true);
              setShowGameOver(true);
              toast({
                title: "Game Won!",
                description: "Someone has won the game!",
              });
              await Promise.all([
                refreshGameStatus(),
                updatePrizePool(),
                refreshPlayerHistory()
              ]);
            },
            onEscalationStarted: async () => {
              toast({
                title: "Escalation Started",
                description: "The game has entered escalation mode!",
              });
              await Promise.all([
                refreshGameStatus(),
                updatePrizePool(),
                refreshPlayerHistory()
              ]);
            }
          });
        }
      } catch (error) {
        console.error('Failed to restore connection:', error);
      }
    }

    restoreConnection();
  }, []);

  // Load initial persuasion score when component mounts
  useEffect(() => {
    if (web3State.account) {
      const score = getStoredPersuasionScore(web3State.account);
      setPersuasionScore(score);
    }
  }, [web3State.account]);


  // Initialize game data
  const initializeGameData = async (contract: GameContract, account: string) => {
    try {
      const [status, history] = await Promise.all([
        contract.getGameStatus(),
        contract.getPlayerHistory(account)
      ]);

      setGameStatus(status);
      setGameWon(status.isGameWon);
      setPlayerHistory(history);

      if (status.timeRemaining <= 0 || status.isGameWon) {
        setShowGameOver(true);
        toast({
          title: status.isGameWon ? "Game Won!" : "Game Over",
          description: "Thanks for playing!",
        });
      } else {
        setShowGameOver(false);
      }
    } catch (error) {
      console.error("Failed to initialize game data:", error);
      toast({
        title: "Error",
        description: "Failed to load game data. Please try refreshing the page.",
        variant: "destructive"
      });
    }
  };

  async function handleConnect() {
    setIsConnecting(true);
    setIsUpdatingGameData(true);
    try {
      const state = await connectWallet();
      setWeb3State(state);

      if (state.account) {
        const storedScore = getStoredPersuasionScore(state.account);
        setPersuasionScore(storedScore);

        const storedResponses = getPlayerResponses(state.account);
        setPlayerHistory(storedResponses);
      }

      const contract = new GameContract(state.provider!, state.signer!);
      setGameContract(contract);

      if (state.account) {
        await initializeGameData(contract, state.account);
      }

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
    clearAllGameState();
    const initialState = await disconnectWallet();
    setWeb3State(initialState);
    setGameContract(null);
    setPlayerHistory([]);
    setShowGameOver(false);
    setPersuasionScore(50);
    setGameStatus({
      timeRemaining: 0,
      currentAmount: "0",
      lastPlayer: "",
      escalationActive: false,
      gameEndBlock: 0,
      isGameWon: false,
      isGameOver: false,
      currentMultiplier: 1,
      escalationPeriodTimeRemaining: 0,
      currentPeriodIndex: 0
    });
  }

  async function refreshGameStatus() {
    if (!gameContract || !web3State.account) return;

    try {
      const status = await gameContract.getGameStatus();
      setGameStatus(status);

      if (status.timeRemaining <= 0 || status.isGameWon) {
        setGameWon(status.isGameWon);
        setShowGameOver(true);
        if (status.isGameWon) {
          toast({
            title: "Game Won!",
            description: "This game has already been won!",
          });
        }
      } else {
        setShowGameOver(false);
      }

      const history = await gameContract.getPlayerHistory(web3State.account);
      setPlayerHistory(history);
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
    if (!gameContract || !web3State.account) return;

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

      const newScore = Math.max(0, Math.min(100, persuasionScore + evaluation.scoreIncrement));
      setPersuasionScore(newScore);
      storePersuasionScore(web3State.account, newScore);

      // Show transaction confirmation first
      toast({
        title: "Transaction Confirmed",
        description: "Your submission was successfully recorded on the blockchain.",
      });

      // Force refresh player history immediately
      const updatedHistory = await gameContract.getPlayerHistory(web3State.account);
      setPlayerHistory(updatedHistory);

      // Prepare Trump's message and update game state
      if (newScore >= 100) {
        try {
          await gameContract.buttonPushed(web3State.account);
          setGameWon(true);
          setShowGameOver(true);
          setShowConfetti(true);
          setTrumpMessage("🎉 Congratulations! You've successfully convinced me! The entire prize pool will be transferred to your wallet!");
          setTrumpMessageVariant('success');
        } catch (error) {
          console.error("Error pushing the button:", error);
        }
      } else {
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
        setTrumpMessage(message);
        setTrumpMessageVariant(evaluation.scoreIncrement > 0 ? 'success' : 'error');
      }

      // Show Trump's response dialog after a short delay
      setTimeout(() => {
        setShowTrumpDialog(true);
      }, 1000);

      // Final refresh of game status and player history
      await Promise.all([
        refreshGameStatus(),
        refreshPlayerHistory()
      ]);

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

  async function refreshPlayerHistory() {
    if (!gameContract || !web3State.account) return;
    try {
      const history = await gameContract.getPlayerHistory(web3State.account);
      console.log('Refreshed player history:', history);
      setPlayerHistory(history);
    } catch (error) {
      console.error('Error refreshing player history:', error);
    }
  }

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
                    <li>Base Period: .0009 ETH</li>
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
      <AgentTrumpDialog
        isOpen={showTrumpDialog}
        onClose={() => setShowTrumpDialog(false)}
        message={trumpMessage}
        variant={trumpMessageVariant}
      />
    </>
  );
}