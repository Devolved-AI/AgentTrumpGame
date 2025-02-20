import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useWeb3Store } from "@/lib/web3";
import { Brain } from "lucide-react";

export function PersuasionScore() {
  const { contract, address } = useWeb3Store();
  const [score, setScore] = useState(0);

  useEffect(() => {
    if (!contract || !address) return;

    const updateScore = async () => {
      try {
        const score = await contract.getPlayerPersuasionScore(address);
        setScore(score.toNumber());
      } catch (error) {
        console.error("Error fetching persuasion score:", error);
      }
    };

    updateScore();
    const interval = setInterval(updateScore, 2000);
    return () => clearInterval(interval);
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
          className="h-2"
          indicatorClassName={score >= 100 ? "bg-green-500" : ""}
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
