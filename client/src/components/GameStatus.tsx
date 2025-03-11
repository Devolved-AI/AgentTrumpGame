import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useWeb3Store, formatEther } from "@/lib/web3";
import { Clock, User, Banknote } from "lucide-react";
import { SiEthereum } from "react-icons/si";
import { useEthPrice } from "@/lib/ethPrice";

interface GameStatusProps {
  showPrizePoolOnly?: boolean;
  showTimeRemainingOnly?: boolean;
  showLastGuessOnly?: boolean;
  onTimerEnd?: () => void;
}

interface ServerTimerState {
  contractAddress: string;
  startTime: number;
  gameStarted: boolean;
  gameId: string;
  elapsedTime?: number;
  remainingTime?: number;
  gameLength?: number;
}

export function GameStatus({ showPrizePoolOnly, showTimeRemainingOnly, showLastGuessOnly, onTimerEnd }: GameStatusProps) {
  const { contract, isGameOver, isInEscalationPeriod, getEscalationTimeRemaining, prizePool, updatePrizePool, currentContractAddress } = useWeb3Store();
  const [status, setStatus] = useState({
    timeRemaining: 0,
    lastPlayer: "",
    totalBalance: "0",
    won: false,
    requiredAmount: "0.0018",
    lastGuessTimestamp: 0,
    isGameOver: false,
    inEscalationPeriod: false,
    escalationTimeRemaining: 0,
    escalationPeriod: 0
  });
  
  // Update local state with prize pool from Web3Store
  useEffect(() => {
    if (prizePool) {
      setStatus(prev => ({
        ...prev,
        totalBalance: prizePool
      }));
      console.log("Updated prize pool from Web3Store:", prizePool);
    }
  }, [prizePool]);
  
  // Using null for initial state to indicate loading
  const [displayTime, setDisplayTime] = useState<number | null>(null);
  const [baseTime, setBaseTime] = useState<number | null>(null);
  const [serverTimerState, setServerTimerState] = useState<ServerTimerState | null>(null);
  const [lastServerRefresh, setLastServerRefresh] = useState(0);
  const [timerLoadingState, setTimerLoadingState] = useState(true);

  const { data: ethPrice } = useEthPrice();

  // Initial timer initialization from server - happens once on component mount and when contract changes
  useEffect(() => {
    if (!currentContractAddress) return;
    
    setTimerLoadingState(true); // Start in loading state
    
    // Function to fetch game timer state from server
    const fetchGameTimerState = async () => {
      try {
        const response = await fetch(`/api/game/timer/${currentContractAddress}`);
        
        if (!response.ok) {
          console.error("Failed to fetch game timer state:", response.statusText);
          return;
        }
        
        const timerState = await response.json();
        setServerTimerState(timerState);
        setLastServerRefresh(Date.now());
        
        console.log("Server timer state:", timerState);
        
        // Set the display time based on server's remaining time calculation
        if (timerState.remainingTime !== undefined) {
          setDisplayTime(timerState.remainingTime);
          setBaseTime(timerState.remainingTime);
          
          // Update status with the time from server
          setStatus(prev => ({
            ...prev,
            timeRemaining: timerState.remainingTime || 0
          }));
          
          // Timer has loaded successfully
          setTimerLoadingState(false);
        }
      } catch (e) {
        console.error("Error fetching game timer state:", e);
        // On error, if we don't have time yet, use default 5 min time
        if (displayTime === null) {
          setDisplayTime(300);
          setBaseTime(300);
          setTimerLoadingState(false);
        }
      }
    };
    
    // Fetch game timer state on mount and when contract changes
    fetchGameTimerState();
    
    // Set up interval to periodically refresh the server timer state (every 30 seconds)
    const refreshInterval = setInterval(fetchGameTimerState, 30000);
    
    return () => {
      clearInterval(refreshInterval);
    };
  }, [currentContractAddress, displayTime]);

  // Timer initialization after contract connection
  useEffect(() => {
    if (!contract) return;

    const initializeTime = async () => {
      try {
        const [timeRemaining, won, gameOver] = await Promise.all([
          contract.getTimeRemaining(),
          contract.gameWon(),
          isGameOver()
        ]);

        const time = Number(timeRemaining.toString());
        const MAX_GAME_TIME = 600; // 10 minutes (600 seconds)
        
        // Log time from contract for debugging
        console.log("Contract returned time:", time);
        
        // Cap the contract time to our max game time
        const cappedContractTime = Math.min(time, MAX_GAME_TIME);
        
        if (time > MAX_GAME_TIME) {
          console.log(`Contract time ${time}s capped to ${MAX_GAME_TIME}s`);
        }

        // Get the current game ID (if supported by contract)
        let gameId = "default";
        try {
          if (contract.gameId) {
            gameId = (await contract.gameId()).toString();
          } else {
            console.log("Contract does not have gameId method");
          }
        } catch (err) {
          console.log("Could not get gameId:", err);
        }

        // First try to get time from localStorage
        let finalTime = cappedContractTime;
        const savedState = localStorage.getItem('gameTimerState');

        if (savedState && !gameOver) {
          try {
            const parsedState = JSON.parse(savedState);
            const { savedTime, timestamp, savedGameId } = parsedState;
            
            // Calculate elapsed time since last save
            const elapsedSeconds = Math.floor((Date.now() - timestamp) / 1000);
            const adjustedSavedTime = Math.max(0, savedTime - elapsedSeconds);
            
            console.log("Timer state found:", { 
              savedTime, 
              elapsed: elapsedSeconds, 
              adjustedTime: adjustedSavedTime, 
              savedGameId,
              currentGameId: gameId
            });
            
            // If game IDs match, or we don't have game IDs, use saved time
            // IMPORTANT: This always prioritizes the saved time from localStorage 
            // as long as it's for the same game, which ensures timer continuity
            if (!savedGameId || savedGameId === gameId) {
              finalTime = adjustedSavedTime;
              console.log("Using saved time (prioritizing continuity):", finalTime);
              
              // Only if contract time is significantly lower, use it instead
              // This handles cases where game might have been reset on chain
              if (cappedContractTime < adjustedSavedTime - 30) {
                finalTime = cappedContractTime;
                console.log("Contract time much lower, possible game reset. Using:", finalTime);
              }
            } else {
              // Different game IDs - use contract time
              finalTime = cappedContractTime;
              console.log("Different game ID detected, using contract time:", finalTime);
            }
          } catch (e) {
            // If parsing fails, use contract time
            finalTime = cappedContractTime;
            console.error("Error parsing saved time:", e);
          }
        } else {
          // No saved state, use contract time
          finalTime = cappedContractTime;
          console.log("Using contract time (no saved state):", finalTime);
        }

        // Make sure we have a valid time
        finalTime = Math.max(finalTime, 0);
        
        console.log("Final time set to:", finalTime);

        // Update status with new values from contract
        setStatus(prev => {
          const updatedStatus = {
            ...prev,
            timeRemaining: finalTime,
            isGameOver: gameOver,
            won: won
          };
          return updatedStatus;
        });

        // Update the display time
        setDisplayTime(finalTime);
        setBaseTime(finalTime);
        
        // Update local storage with current time
        if (!gameOver) {
          localStorage.setItem('gameTimerState', JSON.stringify({
            savedTime: finalTime,
            timestamp: Date.now(),
            gameId
          }));
        }
      } catch (error) {
        console.error("Error fetching initial time:", error);
      }
    };

    initializeTime();
  }, [contract, isGameOver]);

  useEffect(() => {
    if (!contract) return;

    const updateStatus = async () => {
      try {
        // Update prize pool first, to ensure it's accurate
        await updatePrizePool();
        
        const [
          timeRemaining,
          lastPlayer,
          won,
          gameOver,
          requiredAmount,
          inEscalation,
          escalationTime,
          escalationPeriod
        ] = await Promise.all([
          contract.getTimeRemaining(),
          contract.lastPlayer(),
          contract.gameWon(),
          isGameOver(),
          contract.getCurrentRequiredAmount(),
          isInEscalationPeriod(),
          getEscalationTimeRemaining(),
          contract.getCurrentEscalationPeriod ? contract.getCurrentEscalationPeriod() : Promise.resolve(0)
        ]);
        
        // Robust extraction of the lastPlayer address with specific validation
        let lastPlayerAddress = '';
        
        try {
          console.log("Raw lastPlayer value:", lastPlayer);
          console.log("lastPlayer type:", typeof lastPlayer);
          
          // First check if it's a direct string (already an address)
          if (typeof lastPlayer === 'string') {
            // Validate it's an Ethereum address (0x followed by 40 hex chars)
            if (/^0x[a-fA-F0-9]{40}$/.test(lastPlayer)) {
              lastPlayerAddress = lastPlayer;
              console.log("lastPlayer is valid address string:", lastPlayerAddress);
            } else {
              console.warn("lastPlayer is string but not valid address format:", lastPlayer);
              lastPlayerAddress = lastPlayer; // Still use it but flag the issue
            }
          } 
          // Object handling with careful extraction
          else if (lastPlayer && typeof lastPlayer === 'object') {
            const lastPlayerObj = lastPlayer as any;
            
            // Debug what's in the object
            console.log("lastPlayer object properties:", Object.keys(lastPlayerObj));
            
            // Check common properties returned by different contract implementations
            if (lastPlayerObj.address && typeof lastPlayerObj.address === 'string') {
              lastPlayerAddress = lastPlayerObj.address;
              console.log("Using .address property:", lastPlayerAddress);
            }
            else if (typeof lastPlayerObj.toString === 'function') {
              const strValue = lastPlayerObj.toString();
              if (/^0x[a-fA-F0-9]{40}$/.test(strValue)) {
                lastPlayerAddress = strValue;
                console.log("Using toString() method:", lastPlayerAddress);
              } else {
                console.warn("toString() didn't return valid address:", strValue);
              }
            }
            // Handle new contract property format
            else if (lastPlayerObj._address) {
              lastPlayerAddress = lastPlayerObj._address;
              console.log("Using ._address property:", lastPlayerAddress);
            }
            // Try common properties for addresses
            else if (lastPlayerObj.addr) {
              lastPlayerAddress = lastPlayerObj.addr;
              console.log("Using .addr property:", lastPlayerAddress);
            }
            // Last resort - try to extract from stringified object
            else {
              const objStr = JSON.stringify(lastPlayerObj);
              console.log("Full lastPlayer object as string:", objStr);
              
              // Try to find an address pattern in the string
              const addressMatch = objStr.match(/0x[a-fA-F0-9]{40}/);
              if (addressMatch) {
                lastPlayerAddress = addressMatch[0];
                console.log("Extracted address from object string:", lastPlayerAddress);
              } else {
                console.warn("Could not extract address from object");
                lastPlayerAddress = objStr;
              }
            }
          }
          // Value is null/undefined
          else if (!lastPlayer) {
            console.warn("lastPlayer is null or undefined");
            
            // Try to get last player from localStorage as fallback
            try {
              const savedState = localStorage.getItem('gameState');
              if (savedState) {
                const { lastPlayer: savedPlayer } = JSON.parse(savedState);
                if (savedPlayer && typeof savedPlayer === 'string' && /^0x[a-fA-F0-9]{40}$/.test(savedPlayer)) {
                  lastPlayerAddress = savedPlayer;
                  console.log("Using saved lastPlayer from localStorage:", lastPlayerAddress);
                }
              }
            } catch (e) {
              console.error("Error reading saved player from localStorage:", e);
            }
            
            if (!lastPlayerAddress) {
              lastPlayerAddress = "No player yet";
            }
          }
          // Everything else - try to convert to string
          else {
            console.warn("Unexpected lastPlayer type:", typeof lastPlayer);
            lastPlayerAddress = String(lastPlayer) || "Unknown player";
          }
        } catch (err) {
          console.error("Error processing lastPlayer address:", err);
          lastPlayerAddress = String(lastPlayer) || "Error processing address";
        }
        
        console.log("Final processed lastPlayer address:", lastPlayerAddress);

        const time = Number(timeRemaining.toString());
        // Cap the time to 10 minutes (600 seconds)
        const MAX_GAME_TIME = 600; // 10 minutes (600 seconds)
        const cappedTime = Math.min(time, MAX_GAME_TIME);
        
        if (time > MAX_GAME_TIME) {
          console.log(`Contract returned ${time} seconds, capping to ${MAX_GAME_TIME} seconds`);
        }

        // Add debug logging with safer toString handling
        console.log("GameStatus - Contract State:", {
          timeRemaining: time,
          cappedTimeRemaining: cappedTime,
          won,
          gameOver,
          lastPlayer,
          lastPlayerType: typeof lastPlayer,
          lastPlayerToString: lastPlayer ? String(lastPlayer) : null,
          // Now using prizePool from Web3Store
          prizePool
        });

        // Update the baseTime with capped value
        setBaseTime(cappedTime);

        // Calculate the escalation period number (1-10)
        const periodNumber = Number(escalationPeriod.toString());
        
        // Enhanced debug logging with escalation info
        console.log("GameStatus - Escalation Info:", {
          inEscalation,
          escalationTime: Number(escalationTime.toString()),
          escalationPeriod: periodNumber
        });
        
        setStatus(prev => ({
          ...prev,
          timeRemaining: cappedTime, // Use the capped time value
          lastPlayer: lastPlayerAddress, // Use the converted address
          // totalBalance is now updated via the prizePool useEffect
          won,
          isGameOver: gameOver,
          requiredAmount: formatEther(requiredAmount),
          inEscalationPeriod: inEscalation,
          escalationTimeRemaining: Number(escalationTime.toString()),
          escalationPeriod: periodNumber
        }));

      } catch (error) {
        console.error("Error fetching game status:", error);
      }
    };

    // More frequent updates of contract state (every 5 seconds)
    const statusInterval = setInterval(updateStatus, 5000);
    updateStatus();

    // Setup event listeners for both GuessSubmitted and Deposited events to update prize pool
    
    // Handle contract balance changes from guesses - use Web3Store updatePrizePool
    const handleGuessEvent = () => {
      console.log("GuessSubmitted event detected, updating prize pool");
      updatePrizePool();
    };

    // Handle contract balance changes from deposits - use Web3Store updatePrizePool
    const handleDepositEvent = () => {
      console.log("Deposited event detected, updating prize pool");
      updatePrizePool();
    };

    try {
      // Listen for GuessSubmitted events
      contract.on(
        contract.getEvent("GuessSubmitted"),
        handleGuessEvent
      );

      // Listen for Deposited events
      contract.on(
        contract.getEvent("Deposited"),
        handleDepositEvent
      );

      return () => {
        clearInterval(statusInterval);
        try {
          contract.removeListener(
            contract.getEvent("GuessSubmitted"),
            handleGuessEvent
          );
          contract.removeListener(
            contract.getEvent("Deposited"),
            handleDepositEvent
          );
        } catch (error) {
          console.error("Error removing event listeners:", error);
        }
      };
    } catch (error) {
      console.error("Error setting up event listeners:", error);
      return () => clearInterval(statusInterval);
    }
  }, [contract, updatePrizePool]);

  useEffect(() => {
    if (!contract) return;
    
    // Handle fresh contract detection
    const handleFreshContract = (event: Event) => {
      const customEvent = event as CustomEvent<{
        contractAddress: string, 
        reason?: 'new-address' | 'full-time' | 'block-difference',
        gameId?: string
      }>;
      
      console.log("Fresh contract detected in GameStatus:", customEvent.detail);
      
      // Use the provided gameId from the event or generate a new one
      const newGameId = customEvent.detail.gameId || `game_${Date.now()}`;
      
      // Reset the game timer to 15 minutes (900 seconds) for the new game
      setDisplayTime(900);
      setBaseTime(900);
      
      // Reset game over state
      setStatus(prev => ({
        ...prev,
        isGameOver: false,
        won: false,
        timeRemaining: 900,
        lastGuessTimestamp: Date.now(),
        inEscalationPeriod: false,
        escalationPeriod: 0
      }));
      
      // Save the new state to localStorage with a new game ID to ensure fresh state
      localStorage.setItem('gameTimerState', JSON.stringify({ 
        displayTime: 600,
        savedTime: 600,
        timestamp: Date.now(),
        lastUpdated: Date.now(),
        baseTime: 600,
        gameId: newGameId,
        isGameOver: false,
        inEscalation: false,
        escalationPeriod: 0
      }));
      
      // Additional freshness indicators for other components
      localStorage.setItem('freshContractDetected', 'true');
      localStorage.setItem('current_game_id', newGameId);
      localStorage.setItem('contract_fresh_timestamp', Date.now().toString());
      localStorage.setItem('contract_detection_reason', customEvent.detail.reason || 'unknown');
      
      // Also reset the game state in localStorage
      localStorage.setItem('gameState', JSON.stringify({
        lastPlayer: "",
        lastBlock: "",
        lastTimestamp: Date.now(),
        timeRemaining: 600,
        gameId: newGameId,
        isNewGame: true
      }));
      
      // Force a status update with fresh game data
      if (contract) {
        try {
          // Update prize pool using the Web3Store method
          updatePrizePool();
          
          // Log the reset operation with relevant details
          console.log("Reset game state for fresh contract:", {
            contractAddress: customEvent.detail.contractAddress,
            reason: customEvent.detail.reason,
            newGameId,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          console.error("Error updating game state for fresh contract:", error);
        }
      }
    };
    
    // Listen for fresh contract event
    window.addEventListener('fresh-contract-detected', handleFreshContract);
    document.addEventListener('fresh-contract-detected', handleFreshContract);
    
    // Also listen for window messages as an additional channel
    const handleWindowMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'fresh-contract-detected') {
        console.log('GameStatus: Received window message for fresh contract:', event.data);
        // Create an equivalent custom event to reuse our handler
        const customEvent = new CustomEvent('fresh-contract-detected', {
          detail: event.data.detail
        });
        handleFreshContract(customEvent);
      }
    };
    
    window.addEventListener('message', handleWindowMessage);
    
    // Return cleanup function
    return () => {
      window.removeEventListener('fresh-contract-detected', handleFreshContract);
      document.removeEventListener('fresh-contract-detected', handleFreshContract);
      window.removeEventListener('message', handleWindowMessage);
    };
  }, [contract]);
  
  useEffect(() => {
    if (!contract) return;

    // Listener for GuessSubmitted that handles game state and last player updates
    const handleGuessEvent = async (
      player: any, // Using 'any' type for player to handle different contract return formats
      amount: any,
      multiplier: any,
      response: string,
      blockNumber: any,
      responseIndex: any
    ) => {
      try {
        // Get the updated time remaining from the contract
        const timeRemaining = await contract.getTimeRemaining();
        const time = Number(timeRemaining.toString());
        
        // Cap the time to 10 minutes (600 seconds)
        const MAX_GAME_TIME = 600; // 10 minutes (600 seconds)
        const cappedTime = Math.min(time, MAX_GAME_TIME);
        
        if (time > MAX_GAME_TIME) {
          console.log(`GuessEvent: Contract returned ${time} seconds, capping to ${MAX_GAME_TIME} seconds`);
        }
        
        // Update the prize pool using the centralized Web3Store method
        await updatePrizePool();

        // Process player address using the same robust method as lastPlayer extraction
        let processedAddress = '';
        
        try {
          console.log("GuessEvent - Raw player value:", player);
          console.log("GuessEvent - player type:", typeof player);
          
          // First check if it's a direct string (already an address)
          if (typeof player === 'string') {
            // Validate it's an Ethereum address (0x followed by 40 hex chars)
            if (/^0x[a-fA-F0-9]{40}$/.test(player)) {
              processedAddress = player;
              console.log("GuessEvent - player is valid address string:", processedAddress);
            } else {
              console.warn("GuessEvent - player is string but not valid address format:", player);
              processedAddress = player; // Still use it but flag the issue
            }
          } 
          // Object handling with careful extraction
          else if (player && typeof player === 'object') {
            const playerObj = player as any;
            
            // Debug what's in the object
            console.log("GuessEvent - player object properties:", Object.keys(playerObj));
            
            // Check common properties returned by different contract implementations
            if (playerObj.address && typeof playerObj.address === 'string') {
              processedAddress = playerObj.address;
              console.log("GuessEvent - Using .address property:", processedAddress);
            }
            else if (typeof playerObj.toString === 'function') {
              const strValue = playerObj.toString();
              if (/^0x[a-fA-F0-9]{40}$/.test(strValue)) {
                processedAddress = strValue;
                console.log("GuessEvent - Using toString() method:", processedAddress);
              } else {
                console.warn("GuessEvent - toString() didn't return valid address:", strValue);
              }
            }
            // Handle new contract property format
            else if (playerObj._address) {
              processedAddress = playerObj._address;
              console.log("GuessEvent - Using ._address property:", processedAddress);
            }
            // Try common properties for addresses
            else if (playerObj.addr) {
              processedAddress = playerObj.addr;
              console.log("GuessEvent - Using .addr property:", processedAddress);
            }
            // Last resort - try to extract from stringified object
            else {
              const objStr = JSON.stringify(playerObj);
              console.log("GuessEvent - Full player object as string:", objStr);
              
              // Try to find an address pattern in the string
              const addressMatch = objStr.match(/0x[a-fA-F0-9]{40}/);
              if (addressMatch) {
                processedAddress = addressMatch[0];
                console.log("GuessEvent - Extracted address from object string:", processedAddress);
              } else {
                console.warn("GuessEvent - Could not extract address from object");
                processedAddress = objStr;
              }
            }
          }
          // Everything else - try to convert to string
          else {
            console.warn("GuessEvent - Unexpected player type:", typeof player);
            processedAddress = String(player) || "Unknown player";
          }
        } catch (err) {
          console.error("GuessEvent - Error processing player address:", err);
          processedAddress = String(player) || "Error processing address";
        }
        
        console.log("GuessEvent - Final processed player address:", processedAddress);
        
        // Save the game state to localStorage with the last block number
        const gameState = {
          lastPlayer: processedAddress,
          lastBlock: blockNumber ? blockNumber.toString() : "Unknown block",
          lastTimestamp: Date.now(),
          timeRemaining: cappedTime // Use the capped time value
        };
        
        localStorage.setItem('gameState', JSON.stringify(gameState));
        console.log("Saved game state to localStorage:", gameState);
        
        // Update all relevant state in one go
        setStatus(prev => ({
          ...prev,
          lastGuessTimestamp: Date.now(),
          lastPlayer: processedAddress,
          lastBlock: blockNumber ? blockNumber.toString() : "Unknown block",
          timeRemaining: time,
          // Prize pool is updated via the prizePool useEffect
        }));
        
        console.log("Updated status after guess event:", {
          player,
          timeRemaining: time,
          prizePool // Use the Web3Store prize pool value
        });
      } catch (error) {
        console.error("Error updating state after guess:", error);
      }
    };

    try {
      // Listen for GuessSubmitted events with a unique named handler
      contract.on(
        contract.getEvent("GuessSubmitted"),
        handleGuessEvent
      );

      return () => {
        try {
          // Clean up event listener
          contract.removeListener(
            contract.getEvent("GuessSubmitted"),
            handleGuessEvent
          );
        } catch (error) {
          console.error("Error removing event listener:", error);
        }
      };
    } catch (error) {
      console.error("Error setting up game state event listener:", error);
    }
  }, [contract, updatePrizePool]);

  // This effect sets up the countdown timer logic
  // It now uses server-side timer state to ensure consistency across all clients
  useEffect(() => {
    if (status.isGameOver) return;
    
    // Wait until we have a valid timer value from server before starting countdown
    if (displayTime === null) return;

    // Get the current game ID from server timer state if available
    const currentGameId = serverTimerState?.gameId || "default";
    
    console.log("Setting up countdown timer with gameId:", currentGameId);

    // Set up a single timer for consistent countdown
    const timer = setInterval(() => {
      setDisplayTime(prev => {
        // If still loading, don't update
        if (prev === null) return prev;
        
        // Calculate time elapsed since last server refresh
        let newTime = prev;
        
        if (serverTimerState?.remainingTime !== undefined && lastServerRefresh > 0) {
          // Calculate elapsed time since last server update
          const elapsedSinceRefresh = Math.floor((Date.now() - lastServerRefresh) / 1000);
          
          // Calculate current time based on server time minus elapsed time
          newTime = Math.max(0, serverTimerState.remainingTime - elapsedSinceRefresh);
          
          // Log every 5 seconds for debugging
          if (elapsedSinceRefresh % 5 === 0) {
            console.log(`Timer update: ${newTime}s remaining (${elapsedSinceRefresh}s since last server refresh)`);
          }
        } else {
          // Fallback to simple countdown if server state isn't available
          newTime = Math.max(0, prev - 1);
        }

        // When timer reaches zero, end the game for everyone
        if (newTime <= 0) {
          console.log("Timer reached zero, game over for everyone");
          
          // Set game over state
          setStatus(prev => ({ 
            ...prev, 
            isGameOver: true
          }));

          // Clear the timer
          clearInterval(timer);
          
          // Store end state in localStorage as a backup
          localStorage.setItem('gameTimerState', JSON.stringify({
            savedTime: 0,
            timestamp: Date.now(),
            gameId: currentGameId,
            isGameOver: true,
            fromServer: !!serverTimerState
          }));
          
          // Trigger the game over callback
          if (onTimerEnd) {
            console.log("Calling onTimerEnd callback");
            onTimerEnd();
          }

          // Create and dispatch a custom game-over event
          // This will trigger the GameOverDialog to show
          const gameOverEvent = new CustomEvent('game-over', {
            detail: { 
              winner: undefined, 
              reason: 'timer-expired',
              timestamp: Date.now()
            }
          });
          
          document.dispatchEvent(gameOverEvent);
          window.dispatchEvent(gameOverEvent);
          console.log("Dispatched game-over event with timer expired reason");
          
          return 0;
        }

        return newTime;
      });

      // Update baseTime in sync with displayTime
      if (displayTime !== null) {
        setBaseTime(displayTime);
      }
    }, 1000);

    // Cleanup on unmount
    return () => {
      console.log("Cleaning up timer - current displayTime:", displayTime !== null ? displayTime : 'loading');
      clearInterval(timer);
    };
  }, [
    status.isGameOver, 
    onTimerEnd, 
    displayTime, 
    serverTimerState, 
    lastServerRefresh
  ]); // Depends on server timer state

  const usdValue = ethPrice ? (parseFloat(status.totalBalance) * ethPrice).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD'
  }) : '...';

  // Handle null displayTime with default values
  const timeValue = displayTime ?? 600; // Default to 10 minutes if still loading
  const hours = Math.floor(timeValue / 3600);
  const minutes = Math.floor((timeValue % 3600) / 60);
  const seconds = timeValue % 60;
  const isNearEnd = timeValue <= 120; // 2 minutes remaining
  
  // Show loading indicator if timer hasn't initialized yet
  const isTimerLoading = displayTime === null;
  
  // Make sure the text is clearly red when near the end
  const textColorClass = status.isGameOver 
    ? 'text-red-600 font-bold' 
    : (isNearEnd 
      ? 'text-red-500' 
      : 'text-black dark:text-white');

  if (showPrizePoolOnly) {
    return (
      <Card className="border-green-500 h-48 flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center justify-center gap-2 text-green-500 text-2xl">
            <Banknote className="h-7 w-7" />
            Prize Pool
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col justify-center items-center">
          <div className="flex flex-col gap-2 items-center">
            <div className="text-4xl font-bold text-green-500 flex items-center gap-2">
              <SiEthereum className="h-8 w-8" /> {status.totalBalance}
            </div>
            <div className="text-xl text-muted-foreground font-bold">
              {usdValue}
            </div>
          </div>
          {status.won && (
            <div className="text-green-500 mt-2 text-xl">Game Won!</div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (showTimeRemainingOnly) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${textColorClass}`}>
            <Clock className="h-5 w-5" />
            {status.isGameOver ? 'GAME OVER' : (status.inEscalationPeriod ? 'ESCALATION PERIOD' : 'Time Remaining')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!status.isGameOver ? (
            <>
              <div className={`text-2xl font-bold ${textColorClass}`}>
                {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
              </div>
              
              {status.inEscalationPeriod ? (
                <>
                  <div className="mt-2 text-sm text-amber-500 font-bold">
                    Escalation Period {status.escalationPeriod}/10
                  </div>
                  <Progress
                    value={(timeValue / 600) * 100} // 10 minutes (600 seconds) for escalation period
                    className={`mt-2 bg-amber-100 ${status.escalationPeriod > 5 ? 'bg-red-100' : ''}`}
                  />
                </>
              ) : (
                <>
                  <Progress
                    value={(timeValue / 600) * 100} // 10 minutes (600 seconds)
                    className={`mt-2 ${isNearEnd ? 'bg-red-200' : ''}`}
                  />
                  {isNearEnd ? (
                    <div className="mt-2 text-sm text-red-500">
                      Game ending soon!
                    </div>
                  ) : null}
                </>
              )}
            </>
          ) : (
            <div className="text-2xl font-bold text-red-500">
              GAME OVER
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (showLastGuessOnly) {
    // Return null to remove the Last Guess Address card from the UI
    // Backend functionality remains intact
    return null;
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${textColorClass}`}>
            <Clock className="h-5 w-5" />
            {status.isGameOver ? 'GAME OVER' : (status.inEscalationPeriod ? 'ESCALATION PERIOD' : 'Time Remaining')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!status.isGameOver ? (
            <>
              <div className={`text-3xl font-bold ${textColorClass}`}>
                {hours > 0 ? `${hours}:` : ''}{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
              </div>
              
              {status.inEscalationPeriod ? (
                <div className="mt-2 text-sm text-amber-500 font-bold">
                  Escalation Period {status.escalationPeriod}/10
                  <div className="text-xs mt-1">
                    Entry cost: {status.requiredAmount} ETH
                  </div>
                </div>
              ) : isNearEnd ? (
                <div className="mt-2 text-sm text-red-500">
                  Game ending soon!
                </div>
              ) : null}
              
              {status.inEscalationPeriod && (
                <Progress
                  value={(timeValue / 600) * 100} // 10 minutes (600 seconds) for escalation period
                  className={`mt-2 bg-amber-100 ${status.escalationPeriod > 5 ? 'bg-red-100' : ''}`}
                />
              )}
              
              {!status.inEscalationPeriod && (
                <Progress
                  value={(timeValue / 600) * 100} // 10 minutes (600 seconds)
                  className={`mt-2 ${isNearEnd ? 'bg-red-200' : ''}`}
                />
              )}
            </>
          ) : (
            <div className="text-2xl font-bold text-red-500">
              GAME OVER
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-green-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-500">
            <Banknote className="h-5 w-5" />
            Prize Pool
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-1">
            <div className="text-2xl font-bold text-green-500 flex items-center gap-2">
              <SiEthereum className="h-5 w-5" /> {status.totalBalance}
            </div>
            <div className="text-sm text-muted-foreground font-bold">
              {usdValue}
            </div>
          </div>
          {status.won && (
            <div className="text-green-500 mt-2">Game Won!</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Last Guess Address
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm font-mono break-all">
            {status.lastPlayer || "No guesses yet"}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}