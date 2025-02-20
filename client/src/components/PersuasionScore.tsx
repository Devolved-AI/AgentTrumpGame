import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useWeb3Store } from "@/lib/web3";
import { Brain } from "lucide-react";

export function PersuasionScore() {
  const { contract, address } = useWeb3Store();
  const [score, setScore] = useState(50); // Start with 50 as base score

  useEffect(() => {
    if (!contract || !address) return;

    const updateScore = async () => {
      try {
        const score = await contract.getPlayerPersuasionScore(address);
        setScore(Number(score)); // Ensure we're getting a number
      } catch (error) {
        console.error("Error fetching persuasion score:", error);
      }
    };

    updateScore();
    // Update more frequently to catch score changes
    const interval = setInterval(updateScore, 1000);
    return () => clearInterval(interval);
  }, [contract, address]);

  // Listen for GuessSubmitted events to update score immediately
  useEffect(() => {
    if (!contract || !address) return;

    const filter = contract.filters.GuessSubmitted(address);
    const handler = () => {
      // Update score immediately after a guess
      contract.getPlayerPersuasionScore(address)
        .then(newScore => setScore(Number(newScore)))
        .catch(console.error);
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
        <div className="text-2xl font-bold mb-2">{score}/100</div>
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