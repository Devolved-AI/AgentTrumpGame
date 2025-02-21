import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useWeb3Store } from "@/lib/web3";
import { Brain } from "lucide-react";

export function PersuasionScore() {
  const { contract, address } = useWeb3Store();
  const [score, setScore] = useState<number>(50);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculatePersuasionScore = async () => {
    if (!contract || !address) {
      console.log("Contract or address not available");
      return 50;
    }

    try {
      // Get all player responses and calculate score based on response count and timing
      const responses = await contract.getAllPlayerResponses(address);
      if (!responses || !responses.responses || responses.responses.length === 0) {
        return 50;
      }

      const validResponses = responses.responses.filter((_, index) => responses.exists[index]);
      const responseCount = validResponses.length;

      // Base score calculation
      let calculatedScore = Math.min(50 + (responseCount * 10), 100);

      // If there are timestamps, factor in response frequency
      if (responses.timestamps && responses.timestamps.length > 0) {
        const validTimestamps = responses.timestamps
          .filter((_, index) => responses.exists[index])
          .map(ts => Number(ts));

        if (validTimestamps.length > 1) {
          // Calculate average time between responses
          const avgTimeBetweenResponses = validTimestamps
            .slice(1)
            .reduce((acc, curr, idx) => 
              acc + (curr - validTimestamps[idx]), 0) / (validTimestamps.length - 1);

          // Bonus points for consistent responses (lower average time)
          const timeBonus = Math.min(10, Math.floor(300 / avgTimeBetweenResponses));
          calculatedScore = Math.min(calculatedScore + timeBonus, 100);
        }
      }

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