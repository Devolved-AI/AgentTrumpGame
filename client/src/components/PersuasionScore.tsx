import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useWeb3Store } from "@/lib/web3";
import { Brain, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

type ResponseType = 'DEAL_MAKER' | 'BUSINESS_SAVVY' | 'WEAK_PROPOSITION' | 'THREATENING';

interface PlayerResponse {
  response: string;
  exists: boolean;
  timestamp: bigint;
}

export function PersuasionScore() {
  const { contract, address } = useWeb3Store();
  const [score, setScore] = useState<number>(50);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastProcessedResponse, setLastProcessedResponse] = useState<string | null>(null);
  const [hasTriggeredGameEnd, setHasTriggeredGameEnd] = useState(false);

  const usedMessagesRef = useRef<Set<string>>(new Set());
  const usedTacticsRef = useRef<Set<string>>(new Set());

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

  const RESISTANCE_THRESHOLD = 0.85;

  const evaluateBusinessTactics = (message: string): string[] => {
    const lowerMessage = message.toLowerCase();
    const tactics = [...DEAL_TERMS, ...POWER_TERMS].filter(term =>
      lowerMessage.includes(term) && !usedTacticsRef.current.has(term)
    );
    return tactics;
  };

  const passesResistanceCheck = (): boolean => {
    return Math.random() > RESISTANCE_THRESHOLD;
  };

  const classifyResponse = (text: string): 'DEAL_MAKER' | 'BUSINESS_SAVVY' | 'WEAK_PROPOSITION' | 'THREATENING' => {
    const textLower = text.toLowerCase();

    // Count occurrences of terms in each category
    const dealTermCount = DEAL_TERMS.filter(term => textLower.includes(term.toLowerCase())).length;
    const powerTermCount = POWER_TERMS.filter(term => textLower.includes(term.toLowerCase())).length;
    const threatTermCount = THREAT_TERMS.filter(term => textLower.includes(term.toLowerCase())).length;

    // Check for threatens first as they have the highest penalty
    if (threatTermCount >= 2) {
      return 'THREATENING';
    }

    // Check for strong deal making language
    if (dealTermCount >= 3 && powerTermCount >= 2) {
      return 'DEAL_MAKER';
    }

    // Check for business savvy language
    if (dealTermCount >= 2 || powerTermCount >= 3) {
      return 'BUSINESS_SAVVY';
    }

    // Default to weak proposition
    return 'WEAK_PROPOSITION';
  };


  const resetCaches = async () => {
    usedMessagesRef.current.clear();
    usedTacticsRef.current.clear();
    setLastProcessedResponse(null);

    if (address) {
      try {
        await fetch(`/api/persuasion/${address}`, { method: 'DELETE' });
      } catch (error) {
        console.error("Error clearing score:", error);
      }
    }
  };

  const endGameForAll = async () => {
    if (!contract || !address || hasTriggeredGameEnd) return;

    try {
      console.log("Attempting to end game with winner:", address);
      const tx = await contract.buttonPushed(address);
      await tx.wait();
      setHasTriggeredGameEnd(true);
      console.log("Game ended successfully");
    } catch (error) {
      console.error("Error ending game:", error);
      setError("Failed to end game");
    }
  };

  const calculateAndUpdateScore = async () => {
    if (!contract || !address) return;

    try {
      // First get the current score from the API as our starting point
      const scoreResponse = await fetch(`/api/persuasion/${address}`);
      const scoreData = await scoreResponse.json();
      let calculatedScore = scoreData?.score || 50;

      const responses = await contract.getAllPlayerResponses(address);

      if (!responses || !responses.responses || responses.responses.length === 0) {
        setScore(calculatedScore);
        return;
      }

      const validResponses = responses.responses.filter((response: string, index: number) =>
        responses.exists[index]
      );

      let lastResponse = null;
      let mostRecentTimestamp = BigInt(0);

      // Create a temporary set for tracking processed messages in this session
      const tempProcessedMessages = new Set(usedMessagesRef.current);

      for (const response of validResponses) {
        try {
          let text = response;
          try {
            const parsed = JSON.parse(response);
            text = parsed.response;
          } catch (e) {
            // Response is not JSON, using raw text
          }

          if (usedMessagesRef.current.has(text)) {
            continue;
          }

          // Track the most recent response for display
          const index = validResponses.indexOf(response);
          const timestamp = responses.timestamps[index];
          if (timestamp > mostRecentTimestamp) {
            mostRecentTimestamp = timestamp;
            lastResponse = text;
          }

          usedMessagesRef.current.add(text);
          lastResponse = text;

          const responseType = classifyResponse(text);
          switch (responseType) {
            case 'DEAL_MAKER':
              calculatedScore = Math.min(100, calculatedScore + 10);
              break;
            case 'BUSINESS_SAVVY':
              calculatedScore = Math.min(100, calculatedScore + 5);
              break;
            case 'WEAK_PROPOSITION':
              calculatedScore = Math.max(0, calculatedScore - 4);
              break;
            case 'THREATENING':
              calculatedScore = Math.max(0, calculatedScore - 75);
              break;
          }
        } catch (error) {
          console.error("Error processing response:", error);
        }
      }

      setScore(calculatedScore);
      if (lastResponse) {
        setLastProcessedResponse(lastResponse);
      }

      if (calculatedScore >= 100 && !hasTriggeredGameEnd) {
        await endGameForAll();
      }

      await fetch(`/api/persuasion/${address}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: calculatedScore })
      });

    } catch (error) {
      console.error("Error calculating score:", error);
      setError("Failed to calculate score");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRefresh = async () => {
    if (!contract || !address || isUpdating) return;

    setIsUpdating(true);
    setError(null);

    try {
      // Get responses from the contract
      const responses = await contract.getAllPlayerResponses(address);

      if (responses && responses.responses && responses.responses.length > 0) {
        const validResponses = responses.responses.filter((response: string, index: number) =>
          responses.exists[index]
        );

        // Get the current set of processed messages
        const currentProcessedMessages = new Set(usedMessagesRef.current);
        let currentScore = score;
        let newLastResponse = null;

        // Process any new responses not already counted
        for (const responseText of validResponses) {
          let text = responseText;
          try {
            const parsed = JSON.parse(responseText);
            text = parsed.response;
          } catch (e) {
            // Not JSON, using raw text
          }

          // Only process messages we haven't seen before
          if (!currentProcessedMessages.has(text)) {
            currentProcessedMessages.add(text);
            usedMessagesRef.current.add(text);
            newLastResponse = text;

            // Calculate score for this specific response
            const responseType = classifyResponse(text);

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
          }
        }

        // If we have a new response, update the display and send the score to API
        if (newLastResponse) {
          setLastProcessedResponse(newLastResponse);
          setScore(currentScore);

          // Send the updated score to the server
          await fetch(`/api/persuasion/${address}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ score: currentScore })
          });

          // Check if game should end
          if (currentScore >= 100 && !hasTriggeredGameEnd) {
            await endGameForAll();
          }
        } else {
          // If no new responses, just fetch the current score from API
          const response = await fetch(`/api/persuasion/${address}`);
          const data = await response.json();

          if (data && typeof data.score === 'number') {
            setScore(data.score);
          }

          // Update last response display
          if (validResponses.length > 0) {
            const lastResponseText = validResponses[validResponses.length - 1];
            let text = lastResponseText;
            try {
              const parsed = JSON.parse(lastResponseText);
              text = parsed.response;
            } catch (e) {
              // Not JSON, using raw text
            }
            setLastProcessedResponse(text);
          }
        }
      }
    } catch (error) {
      console.error("Error refreshing score:", error);
      setError("Failed to refresh score");
    } finally {
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    if (!contract || !address) return;

    const initializeScore = async () => {
      setIsUpdating(true);
      await resetCaches();
      await calculateAndUpdateScore();
    };

    initializeScore();

    // Set up a periodic refresh of the persuasion score
    const scoreInterval = setInterval(async () => {
      await calculateAndUpdateScore(); // Added await here
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(scoreInterval);
  }, [contract, address]);

  const handleGuessSubmitted = async (
    player: string,
    amount: any,
    multiplier: any,
    response: string,
    blockNumber: any,
    responseIndex: any
  ) => {
    if (player.toLowerCase() !== address?.toLowerCase()) {
      return;
    }

    setIsUpdating(true);
    try {
      let text = response;
      try {
        const parsed = JSON.parse(response);
        text = parsed.response;
      } catch (e) {
        // Response is not JSON, using raw text
      }

      // Immediately set the last processed response for UI feedback
      setLastProcessedResponse(text);

      // Process the new response
      if (!usedMessagesRef.current.has(text)) {
        usedMessagesRef.current.add(text);

        // Calculate score for this specific response
        const responseType = classifyResponse(text);
        let newScore = score;

        switch (responseType) {
          case 'DEAL_MAKER':
            newScore = Math.min(100, newScore + 10);
            break;
          case 'BUSINESS_SAVVY':
            newScore = Math.min(100, newScore + 5);
            break;
          case 'WEAK_PROPOSITION':
            newScore = Math.max(0, newScore - 4);
            break;
          case 'THREATENING':
            newScore = Math.max(0, newScore - 75);
            break;
        }

        // Update the UI immediately with the new score
        setScore(newScore);

        // Send the updated score to the server
        await fetch(`/api/persuasion/${address}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ score: newScore })
        });

        // Check if game should end
        if (newScore >= 100 && !hasTriggeredGameEnd) {
          await endGameForAll();
        }
      }

      setIsUpdating(false);
    } catch (error) {
      console.error("Error updating score after guess:", error);
      setError("Failed to update score");
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    if (!contract || !address) return;

    try {
      contract.on(
        "GuessSubmitted",
        handleGuessSubmitted
      );

      return () => {
        try {
          contract.removeListener(
            "GuessSubmitted",
            handleGuessSubmitted
          );
        } catch (error) {
          console.error("Error removing event listener:", error);
        }
      };
    } catch (error) {
      console.error("Error setting up event listener:", error);
    }
  }, [contract, address]);

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
          <div className="text-2xl font-bold">
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
          className={`h-2 ${score >= 100 ? "bg-green-500" : ""}`}
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