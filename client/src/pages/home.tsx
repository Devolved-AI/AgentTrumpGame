import { useState, useEffect } from "react";
import { ConnectWallet } from "@/components/game/ConnectWallet";
import { GameStatus } from "@/components/game/GameStatus";
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
import { ChatContainer } from "@/components/game/ChatContainer";
import { useChat } from "@/lib/hooks/useChat";

// Only maintain persuasion score in localStorage
const PERSUASION_SCORE_KEY = 'persuasion_scores';
const CHAT_HISTORY_KEY = 'agent_trump_chat_history';

// Expose clearAllGameState to window for debugging
declare global {
  interface Window {
    clearAllGameState: () => void;
  }
}

// Modified clearAllGameState function with better console output
function clearAllGameState() {
  console.log('Clearing all game state...');
  try {
    // Clear everything from localStorage
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(CHAT_HISTORY_KEY)) {
        localStorage.removeItem(key);
        console.log('Cleared chat history:', key);
      }
    });

    // Reset persuasion scores to initial state
    localStorage.setItem(PERSUASION_SCORE_KEY, '{}');
    console.log('Reset persuasion scores');

    console.log('All game state cleared successfully');
  } catch (error) {
    console.error('Error clearing game state:', error);
  }
}

// Make it available on window object
if (typeof window !== 'undefined') {
  window.clearAllGameState = clearAllGameState;
  console.log('clearAllGameState function is now available. Type window.clearAllGameState() to use it.');
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
  const { messages, addMessage } = useChat(web3State.account);

  // Restore connection and state
  useEffect(() => {
    async function restoreConnection() {
      try {
        const restored = await restoreWalletConnection();
        if (restored) {
          setWeb3State(restored);
          const contract = new GameContract(restored.provider!, restored.signer!);
          setGameContract(contract);

          if (restored.account) {
            // Load persuasion score from localStorage
            const score = getStoredPersuasionScore(restored.account);
            setPersuasionScore(score);
            console.log('Restored persuasion score:', score);

            // Initialize game data
            await initializeGameData(contract, restored.account);
          }
        }
      } catch (error) {
        console.error('Failed to restore connection:', error);
      }
    }

    restoreConnection();
  }, []);

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

      // Add user's message to chat immediately
      addMessage(response, true);

      console.log('Submitting response with current amount:', gameStatus.currentAmount);

      try {
        // Submit transaction and wait for confirmation
        const { tx, evaluation, trumpResponse } = await gameContract.submitResponse(response, gameStatus.currentAmount);
        console.log('Transaction submitted:', tx.hash);

        // Update transaction status to success
        setTransactionStatus('success');

        // Update game state after successful transaction
        await refreshGameStatus();

        // Add Agent Trump's response using the new dynamic response system
        addMessage(trumpResponse, false, tx.hash);

        // Show success toast
        toast({
          title: "Response Submitted",
          description: "Your response has been recorded on the blockchain.",
        });

      } catch (error: any) {
        // Handle transaction failure
        setTransactionStatus('error');
        addMessage("Failed to submit response. Please try again.", false);
        throw error; // Re-throw to be caught by outer try-catch
      }

    } catch (error: any) {
      console.error("Submission error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit response. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmissionError(error: any) {
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
  }

  // Initial check for game status
  useEffect(() => {
    async function checkInitialGameStatus() {
      if (gameContract) {
        const status = await gameContract.getGameStatus();
        if (status.timeRemaining <= 0 || status.isGameWon) {
          setGameWon(status.isGameWon);
          setShowGameOver(true);
        }
      }
    }
    checkInitialGameStatus();
  }, [gameContract]);

  // Only reset game state when explicitly requested, not on every mount
  const resetGame = () => {
    clearAllGameState();
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
  };

  useEffect(() => {
    async function fetchEthPrice() {
      try {
        const price = await getEthPriceUSD();
        setEthPrice(price);
      } catch (error) {
        console.error("Failed to fetch ETH price:", error);
      }
    }
    fetchEthPrice();
  }, []);

  useEffect(() => {
    if (web3State.account) {
      const score = getStoredPersuasionScore(web3State.account);
      setPersuasionScore(score);
    }
  }, [web3State.account]);


  async function initializeGameData(contract: GameContract, account: string) {
    try {
      // Clear all game state when starting a new game
      clearAllGameState();
      console.log('Game state cleared for new game initialization');

      const [status, totalPool] = await Promise.all([
        contract.getGameStatus(),
        contract.getTotalPrizePool()
      ]);

      // Add more detailed error checking for contract calls
      if (!status || !totalPool) {
        throw new Error("Failed to fetch game data from contract");
      }

      setGameStatus({
        timeRemaining: status.timeRemaining || 0,
        currentAmount: status.currentAmount || "0.0009",
        lastPlayer: status.lastPlayer || "",
        escalationActive: status.escalationActive || false,
        gameEndBlock: status.gameEndBlock,
        isGameWon: status.isGameWon || false,
        isGameOver: false,
        currentMultiplier: status.currentMultiplier || 1,
        escalationPeriodTimeRemaining: status.escalationPeriodTimeRemaining || 0,
        currentPeriodIndex: status.currentPeriodIndex || 0
      });
      setGameWon(status.isGameWon || false);
      setShowGameOver(false);
      setPrizePoolEth(totalPool);

    } catch (error: any) {
      console.error("Failed to initialize game data:", error);

      // More specific error messages based on error type
      let errorMessage = "Failed to load game data. ";
      if (error.code === 'NETWORK_ERROR') {
        errorMessage += "Please check your internet connection.";
      } else if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
        errorMessage += "Unable to estimate gas. The contract may be paused or not responding.";
      } else if (error.code === 'CALL_EXCEPTION') {
        errorMessage += "Contract call failed. Please ensure you're connected to Base Sepolia network.";
      } else {
        errorMessage += "Please try refreshing the page.";
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });

      // Re-throw to be handled by caller
      throw error;
    }
  }

  async function handleConnect() {
    setIsConnecting(true);
    setIsUpdatingGameData(true);
    try {
      const state = await connectWallet();
      setWeb3State(state);

      if (state.account) {
        const contract = new GameContract(state.provider!, state.signer!);
        setGameContract(contract);

        // Maintain existing persuasion score instead of resetting
        const score = getStoredPersuasionScore(state.account);
        setPersuasionScore(score);

        await initializeGameData(contract, state.account);
      }
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

    // Don't reset game progress on disconnect
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
  }

  // Update the refreshGameStatus function to properly handle lastPlayer
  async function refreshGameStatus() {
    if (!gameContract || !web3State.account) return;

    try {
      const status = await gameContract.getGameStatus();
      console.log('Game status update:', status); // Add logging

      setGameStatus(prevStatus => ({
        ...prevStatus,
        timeRemaining: status.timeRemaining || 0,
        currentAmount: status.currentAmount || "0.0009",
        lastPlayer: status.lastPlayer, // Ensure lastPlayer is properly set
        escalationActive: status.escalationActive || false,
        gameEndBlock: status.gameEndBlock,
        isGameWon: status.isGameWon || false,
        isGameOver: status.isGameOver || false,
        currentMultiplier: status.currentMultiplier || 1,
        escalationPeriodTimeRemaining: status.escalationPeriodTimeRemaining || 0,
        currentPeriodIndex: status.currentPeriodIndex || 0
      }));

      if (playerHistory.length > 0 && (status.timeRemaining <= 0 || status.isGameWon)) {
        setGameWon(status.isGameWon);
        setShowGameOver(true);
        if (status.isGameWon) {
          toast({
            title: "Game Won!",
            description: "This game has already been won!",
          });
        }
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

  useEffect(() => {
    const interval = setInterval(async () => {
      if (!gameContract || !web3State.account) return;

      try {
        const status = await gameContract.getGameStatus();
        console.log('Game status interval update:', status); // Add logging

        setGameStatus(prevStatus => ({
          ...prevStatus,
          timeRemaining: status.timeRemaining,
          currentAmount: status.currentAmount,
          lastPlayer: status.lastPlayer, // Ensure lastPlayer is updated in interval
          escalationActive: status.escalationActive,
          gameEndBlock: status.gameEndBlock,
          isGameWon: status.isGameWon,
          isGameOver: status.isGameOver,
          currentMultiplier: status.currentMultiplier,
          escalationPeriodTimeRemaining: status.escalationPeriodTimeRemaining,
          currentPeriodIndex: status.currentPeriodIndex
        }));

        // Check for game over conditions and show popup only if not seen before
        if (status.timeRemaining <= 0 || status.isGameWon) {
          setGameWon(status.isGameWon);
          setShowGameOver(true);
        }
      } catch (error) {
        console.error("Failed to refresh game status:", error);
      }
    }, gameStatus.timeRemaining < 600 ? 3000 : 15000);

    return () => clearInterval(interval);
  }, [gameContract, web3State.account, gameStatus.timeRemaining]);

  useEffect(() => {
    if (!gameContract || !web3State.account) return;

    const interval = setInterval(updatePrizePool,
      gameStatus.escalationActive ? 5000 : 30000
    );
    return () => clearInterval(interval);
  }, [gameContract, web3State.account, gameStatus.escalationActive]);

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

      {/* Dark overlay when game is over */}
      {showGameOver && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" />
      )}

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

          <div className="flex flex-col">
            <div className="h-[700px]">
              <ChatContainer
                messages={messages}
                className="h-[600px]"
                onSubmit={handleSubmitResponse}
                currentAmount={gameStatus.currentAmount}
                isLoading={isLoading}
                transactionStatus={transactionStatus}
                disabled={gameStatus.isGameOver}
              />
            </div>
          </div>
        </div>

        <div className="mb-8">
          <GameStatus
            timeRemaining={gameStatus.timeRemaining}
            currentAmount={gameStatus.currentAmount}
            lastPlayer={gameStatus.lastPlayer}
            escalationActive={gameStatus.escalationActive}
            persuasionScore={persuasionScore}
            isGameWon={gameStatus.isGameWon}
          />
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
        onClose={() => {}}
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

function formatPacificTime(timestamp: number): string {
  return formatInTimeZone(
    new Date(timestamp),
    'America/Los_Angeles',
    'MMM dd, yyyy HH:mm:ss zzz'
  );
}

function getStoredPersuasionScore(address: string): number {
  try {
    const stored = localStorage.getItem(PERSUASION_SCORE_KEY);
    if (!stored) {
      console.log('No stored persuasion scores found, using default');
      return 50;
    }

    const scores = JSON.parse(stored);
    const normalizedAddress = address.toLowerCase();
    return scores[normalizedAddress] || 50;
  } catch (error) {
    console.error('Error reading persuasion score:', error);
    return 50;
  }
}

function storePersuasionScore(address: string, score: number) {
  try {
    const normalizedAddress = address.toLowerCase();
    const stored = localStorage.getItem(PERSUASION_SCORE_KEY) || '{}';
    const scores = JSON.parse(stored);
    scores[normalizedAddress] = Math.max(0, Math.min(100, score));
    localStorage.setItem(PERSUASION_SCORE_KEY, JSON.stringify(scores));
    console.log('Stored persuasion score:', scores[normalizedAddress], 'for address:', normalizedAddress);
  } catch (error) {
    console.error('Error storing persuasion score:', error);
  }
}