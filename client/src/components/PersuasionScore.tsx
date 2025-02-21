import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useWeb3Store } from "@/lib/web3";
import { Brain } from "lucide-react";

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

  // Use refs to maintain state across renders
  const usedMessagesRef = useRef<Set<string>>(new Set());
  const usedTacticsRef = useRef<Set<string>>(new Set());

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

  const evaluateBusinessTactics = (message: string): string[] => {
    const lowerMessage = message.toLowerCase();
    return [...DEAL_TERMS, ...POWER_TERMS].filter(term => 
      lowerMessage.includes(term) && !usedTacticsRef.current.has(term)
    );
  };

  const classifyResponse = (response: string): ResponseType => {
    const lowerResponse = response.toLowerCase();

    // Check for threatening or legal pressure first
    if (THREAT_TERMS.some(term => lowerResponse.includes(term))) {
      return 'THREATENING';
    }

    // Evaluate business tactics
    const businessTactics = evaluateBusinessTactics(response);
    const hasNewTactics = businessTactics.length > 0;

    if (hasNewTactics) {
      // Track used tactics
      businessTactics.forEach(tactic => {
        usedTacticsRef.current.add(tactic);
      });

      // Determine if it's a strong business proposition
      const dealTermsCount = DEAL_TERMS.filter(term => 
        lowerResponse.includes(term)).length;
      const powerTermsCount = POWER_TERMS.filter(term => 
        lowerResponse.includes(term)).length;

      // If the response includes both deal terms and power terms, it's considered a strong deal maker approach
      return (dealTermsCount >= 2 && powerTermsCount >= 1) ? 'DEAL_MAKER' : 'BUSINESS_SAVVY';
    }

    return 'WEAK_PROPOSITION';
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

      const validResponses = responses.responses.filter((response: string, index: number) => 
        responses.exists[index]
      );

      // Start with base score of 50
      let calculatedScore = 50;

      // Process each response and adjust score
      validResponses.forEach((response: string) => {
        // Skip if this exact message has been used before
        if (usedMessagesRef.current.has(response)) {
          console.log("Skipping repeated message:", response);
          return;
        }

        // Add this message to used messages set
        usedMessagesRef.current.add(response);
        console.log("New message evaluated:", response);

        const responseType = classifyResponse(response);
        console.log("Response classified as:", responseType);

        // Score adjustments based on business negotiation effectiveness
        switch (responseType) {
          case 'DEAL_MAKER':
            // Significant boost for strong business propositions
            calculatedScore = Math.min(100, calculatedScore + 15);
            break;
          case 'BUSINESS_SAVVY':
            // Moderate increase for business-focused language
            calculatedScore = Math.min(100, calculatedScore + 8);
            break;
          case 'WEAK_PROPOSITION':
            // Small penalty for weak business arguments
            calculatedScore = Math.max(0, calculatedScore - 5);
            break;
          case 'THREATENING':
            // Severe penalty for threats or legal pressure
            calculatedScore = Math.max(0, calculatedScore - 25);
            break;
        }
      });

      return calculatedScore;
    } catch (error) {
      console.error("Error calculating persuasion score:", error);
      return 50;
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
      // Clear the sets when disconnecting
      usedMessagesRef.current = new Set();
      usedTacticsRef.current = new Set();
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
          Business Persuasion Score
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
            Maximum persuasion achieved! You've made an offer he can't refuse!
          </p>
        )}
      </CardContent>
    </Card>
  );
}