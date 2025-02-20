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

  const fetchScore = async () => {
    if (!contract || !address) {
      console.log("Contract or address not available");
      return;
    }

    try {
      setError(null);
      // First check if the method exists on the contract
      if (typeof contract.getPlayerPersuasionScore !== 'function') {
        console.error("getPlayerPersuasionScore method not found on contract");
        setError("Contract method not available");
        return;
      }

      const newScore = await contract.getPlayerPersuasionScore(address);
      console.log("Raw score from contract:", newScore);

      // Handle the case where the score might be undefined, null, or empty
      if (newScore === undefined || newScore === null || newScore === "0x") {
        console.log("No score found, using default");
        setScore(50);
        return;
      }

      // Properly handle BigNumber conversion with more detailed error logging
      let scoreValue: number;
      try {
        if (typeof newScore === 'object' && 'toNumber' in newScore) {
          scoreValue = newScore.toNumber();
          console.log("Converted BigNumber score:", scoreValue);
        } else {
          scoreValue = Number(newScore);
          console.log("Converted number score:", scoreValue);
        }

        // Validate the converted score
        if (isNaN(scoreValue)) {
          console.log("Invalid score value, using default");
          scoreValue = 50;
        }

        // Ensure score is within valid range
        scoreValue = Math.max(0, Math.min(100, scoreValue));
      } catch (conversionError) {
        console.error("Score conversion error:", conversionError);
        scoreValue = 50;
      }

      console.log("Final persuasion score:", scoreValue);
      setScore(scoreValue);
    } catch (error: any) {
      console.error("Error fetching persuasion score:", error);
      setError("Could not fetch score");
      // Keep the current score instead of resetting
    }
  };

  useEffect(() => {
    if (!contract || !address) {
      setScore(50); // Reset to default when disconnected
      setError(null);
      return;
    }

    // Initial fetch
    fetchScore();

    // Poll every 2 seconds instead of 500ms to reduce load
    const interval = setInterval(fetchScore, 2000);

    return () => {
      clearInterval(interval);
      setScore(50); // Reset on cleanup
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
          // Add a small delay to ensure the contract state is updated
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