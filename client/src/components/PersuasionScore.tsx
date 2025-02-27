import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useWeb3Store } from "@/lib/web3";
import { Brain, RefreshCw } from "lucide-react";

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
  const [trumpMessage, setTrumpMessage] = useState<string | null>(null);

  const usedMessagesRef = useRef<Set<string>>(new Set());

  const processResponse = async (response: string) => {
    if (!address) return;

    try {
      const result = await fetch('/api/trump/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: response, address })
      });

      if (!result.ok) {
        throw new Error('Failed to process message');
      }

      const data = await result.json();
      setTrumpMessage(data.response);

      const evaluation = data.evaluation;
      setScore(evaluation.current_score);
      setLastProcessedResponse(response);

      if (evaluation.message) {
        console.log("Trump's evaluation:", evaluation.message);
      }

    } catch (error) {
      console.error("Error processing response:", error);
      setError("Failed to process response");
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
          await processResponse(text);
        } catch (error) {
          console.error("Error processing response:", error);
        }
      }

    } catch (error) {
      console.error("Error calculating score:", error);
      setError("Failed to calculate score");
    } finally {
      setIsUpdating(false);
    }
  };

  const resetCaches = async () => {
    if (!address) return;

    try {
      await fetch(`/api/trump/reset/${address}`, { method: 'POST' });
      usedMessagesRef.current.clear();
      setLastProcessedResponse(null);
      setTrumpMessage(null);
    } catch (error) {
      console.error("Error resetting:", error);
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

  useEffect(() => {
    if (!contract || !address) return;

    const initializeScore = async () => {
      setIsUpdating(true);
      await resetCaches();
      await calculateAndUpdateScore();
    };

    initializeScore();
  }, [contract, address]);

  useEffect(() => {
    if (!contract || !address) return;

    const handleGuessSubmitted = async (
      player: string,
      amount: any,
      multiplier: any,
      response: string,
      blockNumber: any,
      responseIndex: any
    ) => {
      if (player.toLowerCase() !== address?.toLowerCase()) return;

      setIsUpdating(true);
      try {
        let text = response;
        try {
          const parsed = JSON.parse(response);
          text = parsed.response;
        } catch (e) {
          // Response is not JSON, using raw text
        }

        await processResponse(text);
      } catch (error) {
        console.error("Error updating score after guess:", error);
        setError("Failed to update score");
      } finally {
        setIsUpdating(false);
      }
    };

    try {
      contract.on(
        contract.getEvent("GuessSubmitted"),
        handleGuessSubmitted
      );

      return () => {
        try {
          contract.removeListener(
            contract.getEvent("GuessSubmitted"),
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
            Your last message: "{lastProcessedResponse.slice(0, 50)}..."
          </p>
        )}
        {trumpMessage && (
          <p className="text-sm font-medium mt-2 p-2 bg-gray-100 rounded-md">
            Trump's response: "{trumpMessage}"
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