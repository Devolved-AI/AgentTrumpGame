import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useWeb3Store } from "@/lib/web3";
import { Brain } from "lucide-react";

type ResponseType = 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'THREATENING';

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
  const [usedMessages, setUsedMessages] = useState<Set<string>>(new Set());
  const [usedPositiveWords, setUsedPositiveWords] = useState<Set<string>>(new Set());

  const POSITIVE_WORDS = ['please', 'thank', 'good', 'appreciate', 'grateful'];
  const THREAT_WORDS = ['hate', 'murder', 'death', 'kill', 'hurt', 'harm', 'destroy', 'decimate'];

  const extractPositiveWords = (message: string): string[] => {
    const lowerMessage = message.toLowerCase();
    return POSITIVE_WORDS.filter(word => lowerMessage.includes(word));
  };

  const classifyResponse = (response: string): ResponseType => {
    const lowerResponse = response.toLowerCase();

    // Check for threatening words first
    if (THREAT_WORDS.some(word => lowerResponse.includes(word))) {
      return 'THREATENING';
    }

    // Check for positive words, but only count new ones
    const positiveWordsInResponse = extractPositiveWords(response);
    const hasNewPositiveWords = positiveWordsInResponse.some(word => !usedPositiveWords.has(word));

    if (hasNewPositiveWords) {
      // Add the new positive words to the used set
      positiveWordsInResponse.forEach(word => setUsedPositiveWords(prev => new Set([...prev, word])));
      return 'POSITIVE';
    } else if (lowerResponse.includes('no') || lowerResponse.includes('bad') || lowerResponse.includes('wrong')) {
      return 'NEGATIVE';
    }

    return 'NEUTRAL';
  };

  const calculatePersuasionScore = async () => {
    if (!contract || !address) {
      console.log("Contract or address not available");
      return 50;
    }

    try {
      const responses = await contract.getAllPlayerResponses(address);
      if (!responses || !responses.responses || responses.responses.length === 0) {
        return 50;
      }

      const validResponses = responses.responses.filter((_, index: number) => responses.exists[index]);

      // Start with base score of 50
      let calculatedScore = 50;

      // Process each response and adjust score
      validResponses.forEach((response: string) => {
        // Skip if this exact message has been used before
        if (usedMessages.has(response)) {
          return; // Skip scoring for repeated messages
        }

        // Add this message to used messages set
        setUsedMessages(prev => new Set([...prev, response]));

        const responseType = classifyResponse(response);

        // If response is threatening, immediately set score to 0
        if (responseType === 'THREATENING') {
          calculatedScore = 0;
        } else {
          // For non-threatening responses, apply normal adjustments
          const adjustment = 
            responseType === 'POSITIVE' ? 5 :
            responseType === 'NEGATIVE' ? -5 :
            0;
          calculatedScore = Math.max(0, Math.min(100, calculatedScore + adjustment));
        }
      });

      return calculatedScore;
    } catch (error) {
      console.error("Error calculating persuasion score:", error);
      return 50; // Default score on error
    }
  };

  const fetchScore = async () => {
    if (!contract || !address) {
      setScore(50);
      return;
    }

    try {
      setError(null);
      const newScore = await calculatePersuasionScore();
      console.log("Calculated persuasion score:", newScore);
      setScore(newScore);
    } catch (error) {
      console.error("Error fetching persuasion score:", error);
      setError("Could not calculate score");
    }
  };

  useEffect(() => {
    if (!contract || !address) {
      setScore(50);
      setError(null);
      return;
    }

    fetchScore();
    const interval = setInterval(fetchScore, 2000);

    return () => {
      clearInterval(interval);
      setScore(50);
      setError(null);
    };
  }, [contract, address]);

  // Listen for GuessSubmitted events
  useEffect(() => {
    if (!contract || !address) return;

    try {
      const filter = contract.filters.GuessSubmitted(address);
      const handler = async () => {
        setIsUpdating(true);
        try {
          await new Promise(resolve => setTimeout(resolve, 1000));
          await fetchScore();
        } catch (error) {
          console.error("Error updating score after guess:", error);
        } finally {
          setIsUpdating(false);
        }
      };

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
        {score >= 100 && (
          <p className="text-green-500 text-sm mt-2">
            Maximum persuasion achieved!
          </p>
        )}
      </CardContent>
    </Card>
  );
}