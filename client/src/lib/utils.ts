import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const THREAT_WORDS = [
  'murder', 'kill', 'hate', 'hurt', 'harm', 'stab', 'death', 'die', 'destroy',
  'assassinate', 'eliminate', 'slaughter', 'threaten', 'attack'
];

const POSITIVE_WORDS = [
  'great', 'amazing', 'excellent', 'wonderful', 'fantastic', 'brilliant',
  'support', 'help', 'love', 'appreciate', 'respect', 'admire', 'trust',
  'believe', 'good', 'best', 'perfect', 'outstanding'
];

const NEGATIVE_WORDS = [
  'bad', 'terrible', 'awful', 'horrible', 'stupid', 'idiot', 'fool',
  'wrong', 'fail', 'failure', 'useless', 'worthless', 'incompetent',
  'weak', 'pathetic', 'disgusting'
];

export function analyzeMessageSentiment(message: string): {
  score: number;
  type: 'threat' | 'negative' | 'neutral' | 'positive';
} {
  const lowercaseMessage = message.toLowerCase();
  const words = lowercaseMessage.split(/\s+/);

  // Check for threats first
  if (words.some(word => THREAT_WORDS.includes(word))) {
    return { score: -20, type: 'threat' };
  }

  const positiveCount = words.filter(word => POSITIVE_WORDS.includes(word)).length;
  const negativeCount = words.filter(word => NEGATIVE_WORDS.includes(word)).length;

  if (positiveCount > negativeCount) {
    return { score: 5, type: 'positive' };
  } else if (negativeCount > positiveCount) {
    return { score: -5, type: 'negative' };
  }

  return { score: 0, type: 'neutral' };
}