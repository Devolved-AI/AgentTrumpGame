import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useWeb3Store } from "@/lib/web3";
import { Brain } from "lucide-react";

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
  const [updateCounter, setUpdateCounter] = useState(0);

  // Use refs to maintain state across renders
  const usedMessagesRef = useRef<Set<string>>(new Set());
  const usedTacticsRef = useRef<Set<string>>(new Set());
  const lastFetchTimeRef = useRef<number>(0);

  // Business-focused evaluation terms
  const DEAL_TERMS = [
    'deal', 'investment', 'opportunity', 'profit', 'return', 'money', 'business',
    'market', 'value', 'billion', 'million', 'success', 'win', 'negotiate'
  ];

  const POWER_TERMS = [
    'best', 'huge', 'tremendous', 'successful', 'rich', 'smart', 'genius',
    'winner', 'powerful', 'incredible', 'amazing', 'fantastic'
  ];

  const THREAT_TERMS = [
    'sue', 'lawyer', 'court', 'lawsuit', 'legal', 'threat', 'destroy',
    'bankrupt', 'ruin', 'expose', 'media', 'press'
  ];

  const evaluateBusinessTactics = (message: string): string[] => {
    const lowerMessage = message.toLowerCase();
    const tactics = [...DEAL_TERMS, ...POWER_TERMS].filter(term => 
      lowerMessage.includes(term) && !usedTacticsRef.current.has(term)
    );
    console.log("Found business tactics:", tactics);
    return tactics;
  };

  const classifyResponse = (response: string): ResponseType => {
    console.log("Classifying response:", response);
    const lowerResponse = response.toLowerCase();

    if (THREAT_TERMS.some(term => lowerResponse.includes(term))) {
      console.log("Response classified as THREATENING");
      return 'THREATENING';
    }

    const businessTactics = evaluateBusinessTactics(response);
    const hasNewTactics = businessTactics.length > 0;

    if (hasNewTactics) {
      businessTactics.forEach(tactic => {
        usedTacticsRef.current.add(tactic);
      });

      const dealTermsCount = DEAL_TERMS.filter(term => 
        lowerResponse.includes(term)).length;
      const powerTermsCount = POWER_TERMS.filter(term => 
        lowerResponse.includes(term)).length;

      const responseType = (dealTermsCount >= 2 && powerTermsCount >= 1) ? 'DEAL_MAKER' : 'BUSINESS_SAVVY';
      console.log("Response classified as:", responseType);
      return responseType;
    }

    return 'WEAK_PROPOSITION';
  };

  const resetCaches = () => {
    console.log("Resetting all caches and state");
    usedMessagesRef.current.clear();
    usedTacticsRef.current.clear();
    setLastProcessedResponse(null);
    lastFetchTimeRef.current = 0;
  };

  const calculatePersuasionScore = async () => {
    if (!contract || !address) {
      console.log("Contract or address not available");
      return 50;
    }

    try {
      console.log("Fetching player responses from contract");
      const responses = await contract.getAllPlayerResponses(address);
      console.log("Got responses from contract:", responses);

      if (!responses || !responses.responses || responses.responses.length === 0) {
        console.log("No responses found");
        return 50;
      }

      const validResponses = responses.responses.filter((response: string, index: number) => 
        responses.exists[index]
      );

      console.log("Valid responses:", validResponses);

      let calculatedScore = 50;

      validResponses.forEach((response: string) => {
        try {
          let text = response;
          try {
            const parsed = JSON.parse(response);
            text = parsed.response;
          } catch (e) {
            console.log("Response is not JSON, using raw text");
          }

          if (usedMessagesRef.current.has(text)) {
            console.log("Skipping repeated message:", text);
            return;
          }

          usedMessagesRef.current.add(text);
          console.log("New message evaluated:", text);

          const responseType = classifyResponse(text);
          console.log("Response classified as:", responseType);

          const previousScore = calculatedScore;
          switch (responseType) {
            case 'DEAL_MAKER':
              calculatedScore = Math.min(100, calculatedScore + 15);
              break;
            case 'BUSINESS_SAVVY':
              calculatedScore = Math.min(100, calculatedScore + 8);
              break;
            case 'WEAK_PROPOSITION':
              calculatedScore = Math.max(0, calculatedScore - 5);
              break;
            case 'THREATENING':
              calculatedScore = Math.max(0, calculatedScore - 25);
              break;
          }
          console.log(`Score adjusted from ${previousScore} to ${calculatedScore}`);
          setLastProcessedResponse(text);
        } catch (error) {
          console.error("Error processing response:", error);
        }
      });

      return calculatedScore;
    } catch (error) {
      console.error("Error calculating persuasion score:", error);
      return score;
    }
  };

  // Update score every second
  useEffect(() => {
    if (!contract || !address) return;

    const updateScore = async () => {
      try {
        const newScore = await calculatePersuasionScore();
        if (newScore !== score) {
          console.log("Updating score from", score, "to", newScore);
          setScore(newScore);
        }
      } catch (error) {
        console.error("Error in periodic score update:", error);
      }
    };

    console.log("Setting up periodic score updates");
    updateScore();

    const interval = setInterval(updateScore, 1000);

    return () => {
      console.log("Cleaning up periodic updates");
      clearInterval(interval);
    };
  }, [contract, address, updateCounter]);

  // Listen for GuessSubmitted events
  useEffect(() => {
    if (!contract || !address) return;

    const handler = async (player: string, amount: any, multiplier: any, response: string, blockNumber: any) => {
      console.log("GuessSubmitted event received:", { player, amount, multiplier, response, blockNumber });

      if (player.toLowerCase() !== address.toLowerCase()) {
        console.log("Event is for a different player, ignoring");
        return;
      }

      setIsUpdating(true);
      try {
        // Wait for the transaction to be confirmed
        await new Promise(resolve => setTimeout(resolve, 2000));

        console.log("Updating score after transaction confirmation");
        // Reset caches and force a fresh calculation
        resetCaches();
        // Increment counter to force a refresh
        setUpdateCounter(prev => prev + 1);
      } catch (error) {
        console.error("Error updating score after guess:", error);
        setError("Failed to update score");
      } finally {
        setIsUpdating(false);
      }
    };

    try {
      const filter = contract.filters.GuessSubmitted(address);
      contract.on(filter, handler);
      console.log("Listening for GuessSubmitted events");

      return () => {
        contract.off(filter, handler);
        console.log("Stopped listening for GuessSubmitted events");
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
          Business Persuasion Score
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold mb-2">
          {score}/100 
          {isUpdating && <span className="text-sm text-gray-500 ml-2">(updating...)</span>}
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
            Maximum persuasion achieved! You've made an offer he can't refuse!
          </p>
        )}
      </CardContent>
    </Card>
  );
}