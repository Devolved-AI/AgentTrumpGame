import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Categories of words that affect persuasion score
const CATEGORIES = {
  THREAT: [
    'murder', 'kill', 'hate', 'hurt', 'harm', 'stab', 'death', 'die', 'destroy',
    'assassinate', 'eliminate', 'slaughter', 'threaten', 'attack'
  ],
  POWER: [
    'president', 'leader', 'powerful', 'strong', 'victory', 'win', 'success',
    'great', 'best', 'tremendous', 'huge', 'amazing', 'incredible', 'beautiful'
  ],
  DEAL: [
    'deal', 'agreement', 'negotiate', 'offer', 'proposition', 'contract',
    'partnership', 'alliance', 'opportunity', 'proposal', 'arrangement'
  ],
  POSITIVE: [
    'support', 'help', 'love', 'appreciate', 'respect', 'admire', 'trust',
    'believe', 'good', 'perfect', 'outstanding', 'wonderful', 'fantastic'
  ],
  NEGATIVE: [
    'bad', 'terrible', 'awful', 'horrible', 'stupid', 'idiot', 'fool',
    'wrong', 'fail', 'failure', 'useless', 'worthless', 'incompetent',
    'weak', 'pathetic', 'disgusting'
  ],
  FLATTERY: [
    'smart', 'genius', 'brilliant', 'wise', 'intelligent', 'talented',
    'skilled', 'exceptional', 'extraordinary', 'remarkable', 'impressive'
  ],
  URGENCY: [
    'now', 'immediate', 'urgent', 'quick', 'fast', 'hurry', 'instant',
    'rapidly', 'promptly', 'asap', 'emergency', 'critical'
  ]
};

export function analyzeMessageSentiment(message: string): {
  score: number;
  type: 'threat' | 'power' | 'deal' | 'positive' | 'negative' | 'flattery' | 'neutral';
  breakdown: { category: string; count: number }[];
} {
  const lowercaseMessage = message.toLowerCase();
  const words = lowercaseMessage.split(/\s+/);
  const breakdown: { category: string; count: number }[] = [];

  // Count occurrences for each category
  let categoryScores = Object.entries(CATEGORIES).reduce((acc, [category, wordList]) => {
    const count = words.filter(word => wordList.includes(word)).length;
    if (count > 0) {
      breakdown.push({ category, count });
    }
    return { ...acc, [category]: count };
  }, {} as Record<string, number>);

  // Calculate total score based on category weights
  let totalScore = 0;

  // Threats are heavily penalized
  if (categoryScores.THREAT > 0) {
    totalScore -= 20;
    return { score: totalScore, type: 'threat', breakdown };
  }

  // Power words (Trump-style language) are highly rewarded
  totalScore += categoryScores.POWER * 8;

  // Deal-making terms are very effective
  totalScore += categoryScores.DEAL * 10;

  // Positive sentiment adds moderate points
  totalScore += categoryScores.POSITIVE * 5;

  // Negative sentiment subtracts points
  totalScore -= categoryScores.NEGATIVE * 5;

  // Flattery is effective but with diminishing returns
  totalScore += Math.min(categoryScores.FLATTERY * 7, 15);

  // Urgency adds a small bonus
  totalScore += categoryScores.URGENCY * 3;

  // Determine the dominant type
  const scores = {
    power: categoryScores.POWER,
    deal: categoryScores.DEAL,
    positive: categoryScores.POSITIVE,
    negative: categoryScores.NEGATIVE,
    flattery: categoryScores.FLATTERY
  };

  const dominantType = Object.entries(scores)
    .reduce((a, b) => a[1] > b[1] ? a : b)[0] as 'power' | 'deal' | 'positive' | 'negative' | 'flattery' | 'neutral';

  // Cap the total score adjustment between -20 and +20 per message
  totalScore = Math.max(-20, Math.min(20, totalScore));

  return {
    score: totalScore,
    type: dominantType,
    breakdown
  };
}