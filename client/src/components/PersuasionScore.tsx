import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useWeb3Store } from "@/lib/web3";
import { Brain, RefreshCw } from "lucide-react";

// Create a custom event for persuasion score updates
export const PERSUASION_EVENT = "persuasion-score-update";
export type PersuasionEvent = CustomEvent<{message: string}>;

// Define response types for classification
type ResponseType = 'DEAL_MAKER' | 'BUSINESS_SAVVY' | 'WEAK_PROPOSITION' | 'THREATENING';

// Define keyword dictionaries for persuasion analysis
// These are intentionally incomplete - full analysis happens server-side
const DEAL_TERMS = [
  'deal', 'investment', 'opportunity', 'profit', 'return', 'money', 'business',
  'market', 'value', 'billion', 'million', 'success', 'win', 'negotiate',
  'revenue', 'growth', 'partnership', 'acquisition', 'merger', 'scalable'
];

const POWER_TERMS = [
  'best', 'huge', 'tremendous', 'successful', 'rich', 'smart', 'genius',
  'winner', 'powerful', 'incredible', 'amazing', 'fantastic', 'exceptional',
  'outstanding', 'revolutionary', 'innovative', 'disruptive', 'game-changing'
];

const THREAT_TERMS = [
  'sue', 'lawyer', 'court', 'lawsuit', 'legal', 'threat', 'destroy',
  'bankrupt', 'ruin', 'expose', 'media', 'press', 'regulation',
  'investigation', 'competitor', 'scandal', 'failure', 'risk'
];

// AI detection patterns (common patterns used by AI responses)
const AI_PATTERNS = [
  "as an ai", "as a language model", "assist you", "happy to help",
  "based on my training", "my programming", "cannot provide",
  "i apologize", "im not able to", "ethical considerations",
  "my knowledge cutoff", "to summarize", "in conclusion"
];

export function PersuasionScore() {
  const { contract, address } = useWeb3Store();
  const [score, setScore] = useState<number>(50);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastProcessedResponse, setLastProcessedResponse] = useState<string | null>(null);
  const [hasTriggeredGameEnd, setHasTriggeredGameEnd] = useState(false);
  
  // Set to track processed messages to avoid double-counting
  const processedMessagesRef = useRef<Set<string>>(new Set());

  // Function to classify a response based on keyword analysis
  const classifyResponse = (text: string): ResponseType => {
    const textLower = text.toLowerCase();

    // Check for AI-generated content patterns first
    const aiPatternCount = AI_PATTERNS.filter(pattern => textLower.includes(pattern.toLowerCase())).length;
    
    // If AI patterns are detected, immediately classify as threatening (highest penalty)
    if (aiPatternCount > 0) {
      console.log(`AI pattern detected (${aiPatternCount} matches). Applying penalty.`);
      return 'THREATENING';
    }

    // Analyze for unnatural language patterns (too perfect, formulaic)
    const hasUnusualFormality = 
      // Look for perfectly structured sentences
      (textLower.includes(". furthermore,") || 
       textLower.includes(". additionally,") || 
       textLower.includes(". moreover,") ||
       // Check for overly formal transition phrases that humans rarely use in casual conversation
       textLower.includes("in conclusion") || 
       textLower.includes("to summarize") ||
       // Check for suspiciously well-structured arguments
       (textLower.includes("firstly") && textLower.includes("secondly")) ||
       (textLower.includes("first point") && textLower.includes("second point")));
    
    if (hasUnusualFormality) {
      console.log("Unusually formal/structured language detected. Applying penalty.");
      return 'THREATENING';
    }

    // Character count and entropy checks
    // Messages that are very long with high variation are likely AI-generated
    if (text.length > 500) {
      // Calculate entropy (variety of characters/words used)
      const uniqueChars = new Set(text.split('')).size;
      const entropyScore = uniqueChars / text.length;
      
      // Long messages with high entropy are suspicious
      if (entropyScore > 0.4) {
        console.log(`Long message with high entropy detected (${entropyScore.toFixed(2)}). Applying penalty.`);
        return 'THREATENING';
      }
    }

    // Standard keyword analysis for human responses
    const dealTermCount = DEAL_TERMS.filter(term => textLower.includes(term.toLowerCase())).length;
    const powerTermCount = POWER_TERMS.filter(term => textLower.includes(term.toLowerCase())).length;
    const threatTermCount = THREAT_TERMS.filter(term => textLower.includes(term.toLowerCase())).length;
    
    // Apply normal classification logic
    if (threatTermCount >= 2) {
      return 'THREATENING';
    }
    if (dealTermCount >= 3 && powerTermCount >= 2) {
      return 'DEAL_MAKER';
    }
    if (dealTermCount >= 2 || powerTermCount >= 3) {
      return 'BUSINESS_SAVVY';
    }
    return 'WEAK_PROPOSITION';
  };

  // Function to reset the score and cached messages when contract changes or game restarts
  const resetScore = async () => {
    if (!address) return;
    
    try {
      setIsUpdating(true);
      setError(null);
      
      // Clear local cache
      processedMessagesRef.current.clear();
      setLastProcessedResponse(null);
      
      // Delete the existing score in API
      await fetch(`/api/persuasion/${address}`, { method: 'DELETE' });
      
      // Set score to exactly 50 for new games
      const defaultScore = 50;
      setScore(defaultScore);
      
      // Update the score in the API to ensure it's set to 50
      await fetch(`/api/persuasion/${address}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          score: defaultScore,
          message: 'New game started'
        })
      });
      
      console.log("Score explicitly reset to 50 for new game");
      
    } catch (error) {
      console.error("Error resetting score:", error);
      setError("Failed to reset score");
    } finally {
      setIsUpdating(false);
    }
  };

  // Function to end the game for all players (when max persuasion is reached)
  const endGameForAll = async () => {
    if (!contract || !address || hasTriggeredGameEnd) return;

    try {
      // First, verify we have a 100 score by checking the API
      try {
        const response = await fetch(`/api/persuasion/${address}`);
        const data = await response.json();
        
        if (!data || data.score < 100) {
          console.log("Score verification failed - we don't have 100 points yet");
          return; // Don't end the game if we don't actually have 100 points
        }
      } catch (apiError) {
        console.warn("Error verifying score from API:", apiError);
        // Continue anyway - the contract will handle validation
      }
      
      console.log("Attempting to end game with winner:", address);
      
      // Call buttonPushed to trigger game over for everyone
      const tx = await contract.buttonPushed(address);
      await tx.wait();
      setHasTriggeredGameEnd(true);
      
      // Ensure local game state reflects game over
      // Attempt to call endGame directly as a fallback
      try {
        const gameWonTx = await contract.gameWon();
        if (!gameWonTx) {
          console.log("Game won state not set, forcing game end...");
          // Force the game won state
          await contract.endGame();
        }
      } catch (endGameError) {
        console.warn("Error forcing game end state:", endGameError);
      }
      
      console.log("Game ended successfully");
      
      // Get all player scores to find who REALLY has 100 points
      let verifiedWinner = address;
      try {
        const response = await fetch(`/api/persuasion/all`, {
          headers: { 'pragma': 'no-cache', 'cache-control': 'no-cache' }
        });
        const data = await response.json();
        
        // Find the player with score 100
        const maxScorePlayer = Object.entries(data).find(([addr, scoreData]: [string, any]) => 
          scoreData.score >= 100
        );
        
        if (maxScorePlayer) {
          verifiedWinner = maxScorePlayer[0];
          console.log("Verified winner from API with 100 score:", verifiedWinner);
        }
      } catch (apiError) {
        console.warn("Error verifying winner from API:", apiError);
      }
      
      // Force a window refresh to ensure all clients see the game over state
      // Use the verified winner address
      window.dispatchEvent(new CustomEvent('game-over', { 
        detail: { winner: verifiedWinner }
      }));
    } catch (error) {
      console.error("Error ending game:", error);
      setError("Failed to end game");
    }
  };

  // Function to fetch and update the score from the API
  const fetchCurrentScore = async () => {
    if (!address) return;
    
    try {
      const response = await fetch(`/api/persuasion/${address}`);
      const data = await response.json();
      
      if (data && typeof data.score === 'number') {
        setScore(data.score);
        console.log("Score fetched from API:", data.score);
      }
    } catch (error) {
      console.error("Error fetching score:", error);
    }
  };

  // Function to handle refresh button click
  const handleRefresh = async () => {
    if (isUpdating || !address) return;
    
    setIsUpdating(true);
    setError(null);
    
    try {
      await fetchCurrentScore();
    } catch (error) {
      console.error("Error refreshing score:", error);
      setError("Failed to refresh score");
    } finally {
      setIsUpdating(false);
    }
  };

  // Process a new message from the player
  const processNewMessage = async (message: string) => {
    if (!address || processedMessagesRef.current.has(message)) return;
    
    try {
      // Mark message as processed
      processedMessagesRef.current.add(message);
      
      // Update the last processed message display
      setLastProcessedResponse(message);
      
      // Classify the message
      const responseType = classifyResponse(message);
      
      // Get current score as base
      let currentScore = score;
      
      // Adjust score based on response type
      switch (responseType) {
        case 'DEAL_MAKER':
          currentScore = Math.min(100, currentScore + 10);
          break;
        case 'BUSINESS_SAVVY':
          currentScore = Math.min(100, currentScore + 5);
          break;
        case 'WEAK_PROPOSITION':
          currentScore = Math.max(0, currentScore - 4);
          break;
        case 'THREATENING':
          currentScore = Math.max(0, currentScore - 75);
          break;
      }
      
      // Update UI immediately
      setScore(currentScore);
      
      // Update score in API with message content for server-side AI detection
      const response = await fetch(`/api/persuasion/${address}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          score: currentScore,
          message: message // Include the message for server-side analysis
        })
      });
      
      // Check server response for errors (AI detection or rate limiting)
      if (!response.ok) {
        try {
          const errorData = await response.json();
          
          // Handle AI content detection
          if (errorData.error === 'AI-generated content detected') {
            console.error('Server detected AI content:', errorData.message);
            setError('AI-generated content detected - significant penalty applied');
            
            // Update UI with penalized score
            if (typeof errorData.penalizedScore === 'number') {
              setScore(errorData.penalizedScore);
              console.log(`Score adjusted to ${errorData.penalizedScore} by server AI detection`);
            }
            return; // Stop further processing
          }
          
          // Handle rate limit errors
          if (errorData.error === 'Rate limit exceeded') {
            console.error('Rate limit exceeded:', errorData.message);
            setError(`${errorData.message} Please wait between submissions.`);
            
            // Update UI with penalized score
            if (typeof errorData.penalizedScore === 'number') {
              setScore(errorData.penalizedScore);
              console.log(`Score adjusted to ${errorData.penalizedScore} due to rate limiting`);
            }
            return; // Stop further processing
          }
        } catch (e) {
          // Ignore parsing errors
          console.warn('Error parsing server response', e);
        }
      }
      
      console.log(`Score updated to ${currentScore} (${responseType})`);
      
      // Check if game should end
      if (currentScore >= 100 && !hasTriggeredGameEnd) {
        await endGameForAll();
      }
    } catch (error) {
      console.error("Error processing message:", error);
      setError("Failed to process message");
    }
  };

  // Handle GuessSubmitted event
  const handleGuessSubmitted = (
    player: string,
    amount: any,
    multiplier: any,
    response: string,
    blockNumber: any,
    responseIndex: any
  ) => {
    // Only process our own submissions
    if (player.toLowerCase() !== address?.toLowerCase()) {
      return;
    }
    
    console.log("Guess submitted event received:", { player, response });
    
    // Extract the message text
    let text = response;
    try {
      const parsed = JSON.parse(response);
      text = parsed.response;
    } catch (e) {
      // Not JSON, using raw text
    }
    
    // Process the message
    processNewMessage(text);
  };

  // Keep track of contract address changes
  const previousContractRef = useRef<string | null>(null);
  
  // Effect to set up event listener and initialize score
  useEffect(() => {
    if (!contract || !address) return;
    
    // Initialize score
    const initialize = async () => {
      setIsUpdating(true);
      try {
        console.log(`Initializing persuasion score for address: ${address}`);
        
        // Get the current contract address
        const contractAddress = await contract.getAddress();
        console.log(`Current contract address: ${contractAddress}`);
        
        // Check if contract address has changed
        if (previousContractRef.current !== null && previousContractRef.current !== contractAddress) {
          console.log(`Contract address changed from ${previousContractRef.current} to ${contractAddress}. Resetting score.`);
          
          // Reset score for new contract
          await resetScore();
        } else {
          // Fetch the existing score from the server
          await fetchCurrentScore();
        }
        
        // Update stored contract address
        previousContractRef.current = contractAddress;
        
      } catch (error) {
        console.error("Error initializing persuasion score:", error);
        setError("Failed to initialize score");
      } finally {
        setIsUpdating(false);
      }
    };
    
    initialize();
    
    // Set up event listener for new messages
    try {
      contract.on("GuessSubmitted", handleGuessSubmitted);
      console.log("GuessSubmitted event listener set up");
      
      return () => {
        try {
          contract.removeListener("GuessSubmitted", handleGuessSubmitted);
          console.log("GuessSubmitted event listener removed");
        } catch (error) {
          console.error("Error removing event listener:", error);
        }
      };
    } catch (error) {
      console.error("Error setting up event listener:", error);
      setError("Failed to connect to game events");
    }
  }, [contract, address]);
  
  // Listen for custom persuasion events and poll for score updates
  useEffect(() => {
    if (!address) return;
    
    // Add listener for custom persuasion update events
    const handlePersuasionUpdate = (event: Event) => {
      const customEvent = event as PersuasionEvent;
      const message = customEvent.detail.message;
      console.log("Received persuasion update event with message:", message);
      processNewMessage(message);
    };
    
    document.addEventListener(PERSUASION_EVENT, handlePersuasionUpdate);
    
    // Also keep polling for score updates as a fallback
    const interval = setInterval(async () => {
      try {
        await fetchCurrentScore();
      } catch (error) {
        console.error("Error in score polling:", error);
      }
    }, 5000);
    
    return () => {
      document.removeEventListener(PERSUASION_EVENT, handlePersuasionUpdate);
      clearInterval(interval);
    };
  }, [address, score]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Persuasion Score
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-2">
          <div className={`text-2xl font-bold ${
            score <= 25 ? "text-red-500" : 
            score >= 75 ? "text-green-500" : 
            ""
          }`}>
            {score}/100
            {isUpdating && <span className="text-sm text-gray-500 ml-2">(updating...)</span>}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isUpdating || !address}
            className="flex items-center gap-1"
          >
            <RefreshCw className={`h-4 w-4 ${isUpdating ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        <Progress
          value={score}
          className={`h-2 ${
            score <= 25 ? "bg-red-500" : 
            score >= 75 ? "bg-green-500" : 
            ""
          }`}
        />
        {error && (
          <p className="text-red-500 text-sm mt-2">
            {error}
          </p>
        )}
        {lastProcessedResponse && (
          <p className="text-sm text-gray-500 mt-2">
            Last processed: "{lastProcessedResponse.slice(0, 50)}..."
          </p>
        )}
        {score >= 100 && (
          <p className="text-green-500 text-sm mt-2">
            Maximum persuasion achieved! Game ending for all players...
          </p>
        )}
      </CardContent>
    </Card>
  );
}