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

  const classifyResponse = (response: string): ResponseType => {
    const threatWords = ['hate', 'murder', 'death', 'kill', 'hurt', 'harm', 'destroy', 'decimate'];
    const lowerResponse = response.toLowerCase();

    // Check for threatening words first
    if (threatWords.some(word => lowerResponse.includes(word))) {
      return 'THREATENING';
    }

    // Simple sentiment analysis based on response content
    // This can be expanded based on more sophisticated criteria
    if (lowerResponse.includes('please') || lowerResponse.includes('thank') || lowerResponse.includes('good')) {
      return 'POSITIVE';
    } else if (lowerResponse.includes('no') || lowerResponse.includes('bad') || lowerResponse.includes('wrong')) {
      return 'NEGATIVE';
    }

    return 'NEUTRAL';
  };

  const calculateScoreAdjustment = (responseType: ResponseType): number => {
    switch (responseType) {
      case 'POSITIVE':
        return 5;
      case 'NEGATIVE':
        return -5;
      case 'THREATENING':
        return -50; // This will effectively reset score to 0 or close to it
      default:
        return 0;
    }
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
        const responseType = classifyResponse(response);
        const adjustment = calculateScoreAdjustment(responseType);
        calculatedScore = Math.max(0, Math.min(100, calculatedScore + adjustment));
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