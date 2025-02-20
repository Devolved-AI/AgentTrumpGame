import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useWeb3Store } from "@/lib/web3";
import { Brain } from "lucide-react";

export function PersuasionScore() {
  const { contract, address } = useWeb3Store();
  const [score, setScore] = useState<number>(50);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchScore = async () => {
    if (!contract || !address) return;

    try {
      const newScore = await contract.getPlayerPersuasionScore(address);
      console.log("Fetched persuasion score:", Number(newScore));
      setScore(Number(newScore));
    } catch (error) {
      console.error("Error fetching persuasion score:", error);
    }
  };

  useEffect(() => {
    if (!contract || !address) {
      setScore(50); // Reset to default when disconnected
      return;
    }

    // Initial fetch
    fetchScore();

    // Poll every 500ms to catch score changes quickly
    const interval = setInterval(fetchScore, 500);

    return () => {
      clearInterval(interval);
      setScore(50); // Reset on cleanup
    };
  }, [contract, address]);

  // Listen for GuessSubmitted events
  useEffect(() => {
    if (!contract || !address) return;

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
        {score >= 100 && (
          <p className="text-green-500 text-sm mt-2">
            Maximum persuasion achieved!
          </p>
        )}
      </CardContent>
    </Card>
  );
}