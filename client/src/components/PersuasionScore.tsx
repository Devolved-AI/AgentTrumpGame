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

  const usedMessagesRef = useRef<Set<string>>(new Set());
  const usedTacticsRef = useRef<Set<string>>(new Set());

  // Enhanced business-focused evaluation terms
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

  // Resistance threshold (85%)
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

  const classifyResponse = (response: string): ResponseType => {
    const lowerResponse = response.toLowerCase();

    // Check for threatening terms first (immediate penalty)
    if (THREAT_TERMS.some(term => lowerResponse.includes(term))) {
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

      // More stringent requirements for positive classifications
      if (dealTermsCount >= 3 && powerTermsCount >= 2) {
        return passesResistanceCheck() ? 'DEAL_MAKER' : 'WEAK_PROPOSITION';
      } else if (dealTermsCount >= 2 || powerTermsCount >= 2) {
        return passesResistanceCheck() ? 'BUSINESS_SAVVY' : 'WEAK_PROPOSITION';
      }
    }

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

  const calculateAndUpdateScore = async () => {
    if (!contract || !address) return;

    try {
      const responses = await contract.getAllPlayerResponses(address);

      if (!responses || !responses.responses || responses.responses.length === 0) {
        setScore(50);
        return;
      }

      const validResponses = responses.responses.filter((response: string, index: number) =>
        responses.exists[index]
      );

      let calculatedScore = 50;
      let lastResponse = null;

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

          usedMessagesRef.current.add(text);
          lastResponse = text;

          const responseType = classifyResponse(text);
          switch (responseType) {
            case 'DEAL_MAKER':
              // Harder to increase score, even with DEAL_MAKER
              calculatedScore = Math.min(100, calculatedScore + 10);
              break;
            case 'BUSINESS_SAVVY':
              // Smaller increase for BUSINESS_SAVVY
              calculatedScore = Math.min(100, calculatedScore + 5);
              break;
            case 'WEAK_PROPOSITION':
              // Bigger penalty for weak propositions
              calculatedScore = Math.max(0, calculatedScore - 8);
              break;
            case 'THREATENING':
              // Severe penalty for threats
              calculatedScore = Math.max(0, calculatedScore - 30);
              break;
          }
        } catch (error) {
          console.error("Error processing response:", error);
        }
      }

      // Update UI immediately
      setScore(calculatedScore);
      if (lastResponse) {
        setLastProcessedResponse(lastResponse);
      }

      // Update server in background
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
      await resetCaches();
      await calculateAndUpdateScore();
    } catch (error) {
      console.error("Error refreshing score:", error);
      setError("Failed to refresh score");
    }
  };

  // Initialize score when component mounts or address changes
  useEffect(() => {
    if (!contract || !address) return;

    const initializeScore = async () => {
      setIsUpdating(true);
      await resetCaches();
      await calculateAndUpdateScore();
    };

    initializeScore();
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

      setLastProcessedResponse(text);

      // Small delay to ensure blockchain state is updated
      await new Promise(resolve => setTimeout(resolve, 100));

      await resetCaches();
      await calculateAndUpdateScore();
    } catch (error) {
      console.error("Error updating score after guess:", error);
      setError("Failed to update score");
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
            Maximum persuasion achieved! You've made an offer he can't refuse!
          </p>
        )}
      </CardContent>
    </Card>
  );
}