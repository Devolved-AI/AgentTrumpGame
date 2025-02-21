import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useWeb3Store } from "@/lib/web3";
import { Brain } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

type ResponseType = 'DEAL_MAKER' | 'BUSINESS_SAVVY' | 'WEAK_PROPOSITION' | 'THREATENING';

interface PlayerResponse {
  response: string;
  exists: boolean;
  timestamp: bigint;
}

// Local storage helper functions
const getLocalScore = (address: string): number | null => {
  const score = localStorage.getItem(`persuasion:${address}`);
  return score ? parseFloat(score) : null;
};

const setLocalScore = (address: string, score: number) => {
  localStorage.setItem(`persuasion:${address}`, score.toString());
};

const clearLocalScore = (address: string) => {
  localStorage.removeItem(`persuasion:${address}`);
};

const updatePersuasionScore = async (address: string, score: number) => {
  setLocalScore(address, score); // Update local storage first for immediate feedback
  const response = await fetch(`/api/persuasion/${address}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ score })
  });
  if (!response.ok) {
    throw new Error('Failed to update persuasion score');
  }
  return response.json();
};

const clearPersuasionScore = async (address: string) => {
  clearLocalScore(address); // Clear local storage first
  const response = await fetch(`/api/persuasion/${address}`, {
    method: 'DELETE'
  });
  if (!response.ok) {
    throw new Error('Failed to clear persuasion score');
  }
  return response.json();
};

export function PersuasionScore() {
  const { contract, address } = useWeb3Store();
  const [score, setScore] = useState<number>(50);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastProcessedResponse, setLastProcessedResponse] = useState<string | null>(null);
  const [updateCounter, setUpdateCounter] = useState(0);

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

  // Use React Query to fetch the score from server and sync with localStorage
  const { data: serverScore, isFetching } = useQuery({
    queryKey: ['persuasionScore', address],
    queryFn: async () => {
      if (!address) return null;
      // First check localStorage
      const localScore = getLocalScore(address);
      if (localScore !== null) {
        return localScore;
      }
      // If not in localStorage, fetch from server
      const response = await fetch(`/api/persuasion/${address}`);
      if (!response.ok) throw new Error('Failed to fetch score');
      const data = await response.json();
      // Update localStorage with server data
      if (data.score) {
        setLocalScore(address, data.score);
      }
      return data.score;
    },
    enabled: !!address,
    refetchInterval: 1000
  });

  useEffect(() => {
    if (serverScore !== undefined && serverScore !== null) {
      setScore(serverScore);
    } else if (address) {
      // If no server score, check localStorage
      const localScore = getLocalScore(address);
      if (localScore !== null) {
        setScore(localScore);
      }
    }
  }, [serverScore, address]);

  const evaluateBusinessTactics = (message: string): string[] => {
    const lowerMessage = message.toLowerCase();
    const tactics = [...DEAL_TERMS, ...POWER_TERMS].filter(term =>
      lowerMessage.includes(term) && !usedTacticsRef.current.has(term)
    );
    return tactics;
  };

  const classifyResponse = (response: string): ResponseType => {
    const lowerResponse = response.toLowerCase();

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

      return (dealTermsCount >= 2 && powerTermsCount >= 1) ? 'DEAL_MAKER' : 'BUSINESS_SAVVY';
    }

    return 'WEAK_PROPOSITION';
  };

  const resetCaches = async () => {
    usedMessagesRef.current.clear();
    usedTacticsRef.current.clear();
    setLastProcessedResponse(null);
    lastFetchTimeRef.current = 0;
    if (address) {
      await clearPersuasionScore(address);
    }
  };

  const calculatePersuasionScore = async () => {
    if (!contract || !address) {
      return 50;
    }

    try {
      const responses = await contract.getAllPlayerResponses(address);

      if (!responses || !responses.responses || responses.responses.length === 0) {
        await updatePersuasionScore(address, 50);
        return 50;
      }

      const validResponses = responses.responses.filter((response: string, index: number) =>
        responses.exists[index]
      );

      let calculatedScore = 50;

      validResponses.forEach((response: string) => {
        try {
          let text = response;
          try {
            const parsed = JSON.parse(response);
            text = parsed.response;
          } catch (e) {
            // Response is not JSON, using raw text
          }

          if (usedMessagesRef.current.has(text)) {
            return;
          }

          usedMessagesRef.current.add(text);

          const responseType = classifyResponse(text);
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
          setLastProcessedResponse(text);
        } catch (error) {
          console.error("Error processing response:", error);
        }
      });

      // Update both localStorage and server
      await updatePersuasionScore(address, calculatedScore);
      return calculatedScore;
    } catch (error) {
      console.error("Error calculating persuasion score:", error);
      return score;
    }
  };

  useEffect(() => {
    if (!contract || !address) return;

    const updateScore = async () => {
      try {
        const newScore = await calculatePersuasionScore();
        if (newScore !== score) {
          setScore(newScore);
        }
      } catch (error) {
        console.error("Error in periodic score update:", error);
      }
    };

    updateScore();
  }, [contract, address, updateCounter]);

  useEffect(() => {
    if (!contract || !address) return;

    const handler = async (player: string, amount: any, multiplier: any, response: string) => {
      if (player.toLowerCase() !== address.toLowerCase()) {
        return;
      }

      setIsUpdating(true);
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        await resetCaches();
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

      return () => {
        contract.off(filter, handler);
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
        <div className="text-2xl font-bold mb-2">
          {score}/100
          {isUpdating && <span className="text-sm text-gray-500 ml-2">(updating...)</span>}
          {isFetching && <span className="text-sm text-gray-500 ml-2">(fetching...)</span>}
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