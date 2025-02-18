import { toast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

// Trump's reaction GIFs mapped to different moods
export const TRUMP_GIFS = {
  positive: [
    '/gifs/trump-thumbs-up.gif',
    '/gifs/trump-happy.gif',
    '/gifs/trump-victory.gif'
  ],
  neutral: [
    '/gifs/trump-thinking.gif',
    '/gifs/trump-talking.gif'
  ],
  negative: [
    '/gifs/trump-wrong.gif',
    '/gifs/trump-angry.gif',
    '/gifs/trump-sad.gif'
  ],
  winning: [
    '/gifs/trump-winning.gif',
    '/gifs/trump-celebration.gif'
  ]
};

export interface AIResponse {
  success: boolean;
  message: string;
  score: number;
  game_won?: boolean;
}

// Trump-like response generation patterns
const TRUMP_PHRASES = {
  intros: [
    "Look folks",
    "Listen",
    "Believe me",
    "Let me tell you",
    "Many people are saying",
    "Folks, let me tell you"
  ],
  emphasis: [
    "TREMENDOUS",
    "HUGE",
    "FANTASTIC",
    "INCREDIBLE",
    "AMAZING",
    "BEAUTIFUL"
  ],
  closings: [
    "SAD!",
    "NOT GOOD!",
    "We'll see what happens!",
    "VERY DISAPPOINTED!",
    "THINK ABOUT IT!"
  ],
  button_references: [
    "(and believe me, I know buttons!)",
    "(nobody knows buttons better than me)",
    "(I've pressed many buttons, maybe more than anyone)",
    "(and I know A LOT about buttons)"
  ]
};

// Function to evaluate persuasion score
function evaluatePersuasion(message: string, currentScore: number): number {
  let scoreChange = 0;
  const input = message.toLowerCase();

  // Penalize threatening content
  const negativeTerms = ['kill', 'death', 'murder', 'threat', 'die', 'destroy'];
  const threatCount = negativeTerms.filter(term => input.includes(term)).length;
  if (threatCount > 0) {
    return Math.max(0, currentScore - 20 * threatCount);
  }

  // Basic length check
  const words = message.split(/\s+/);
  if (words.length >= 10 && words.length <= 100) {
    scoreChange += 5;
  } else if (words.length > 100) {
    scoreChange += 2;
  }

  // Check for persuasive business terms
  const businessTerms = [
    'deal', 'business', 'money', 'profit', 'investment',
    'billion', 'million', 'success', 'win', 'opportunity'
  ];
  scoreChange += businessTerms.filter(term => input.includes(term)).length * 3;

  // Check for flattery and Trump-pleasing terms
  const positiveTerms = [
    'great', 'smart', 'genius', 'tremendous', 'huge',
    'best', 'amazing', 'successful', 'brilliant', 'winner'
  ];
  scoreChange += positiveTerms.filter(term => input.includes(term)).length * 2;

  // Context relevance
  const contextTerms = [
    'button', 'press', 'reward', 'prize', 'challenge',
    'convince', 'persuade', 'trust', 'believe'
  ];
  scoreChange += contextTerms.filter(term => input.includes(term)).length * 4;

  // Add controlled randomness
  scoreChange += Math.floor(Math.random() * 7) - 2;

  // Ensure score changes are meaningful but not too extreme
  scoreChange = Math.max(-10, Math.min(10, scoreChange));

  return Math.max(0, Math.min(100, currentScore + scoreChange));
}

// Function to generate Trump-like responses
function generateTrumpResponse(message: string, score: number): string {
  const input = message.toLowerCase();
  const intro = TRUMP_PHRASES.intros[Math.floor(Math.random() * TRUMP_PHRASES.intros.length)];
  const emphasis = TRUMP_PHRASES.emphasis[Math.floor(Math.random() * TRUMP_PHRASES.emphasis.length)];
  const closing = TRUMP_PHRASES.closings[Math.floor(Math.random() * TRUMP_PHRASES.closings.length)];
  const buttonRef = TRUMP_PHRASES.button_references[Math.floor(Math.random() * TRUMP_PHRASES.button_references.length)];

  // Handle empty input
  if (!message.trim()) {
    return `${intro}, you've got to give me something to work with here! Nobody knows empty messages better than me, and believe me, this one is EMPTY! SAD!!!`;
  }

  // Handle threatening content
  if (/\b(kill|death|murder|threat|die)\b/i.test(input)) {
    return `${intro}, we don't like that kind of VIOLENT talk around here ${buttonRef}! My button is for WINNERS, not threateners. Very disappointed, VERY SAD!!!`;
  }

  // McDonald's special response
  if (input.includes('mcdonald')) {
    return `${intro}, everyone knows I love McDonald's (I have the BEST taste in fast food, believe me), but it'll take more than a Big Mac to get me to press this ${emphasis} button! ${closing}`;
  }

  // Score-based responses
  if (score >= 90) {
    return `${intro}, you're getting very close to convincing me ${buttonRef}! Keep going, maybe you'll be the one to make me press this ${emphasis} button!!!`;
  }

  if (score <= 20) {
    return `${intro}, that's a TERRIBLE argument! You'll never get me to press my ${emphasis} button with talk like that! ${closing}`;
  }

  // Context-aware responses
  if (/\b(money|rich|wealth|billion)\b/i.test(input)) {
    return `${intro}, you're talking about money - I LOVE money ${buttonRef}! But is it enough to make me press this ${emphasis} button? NOT YET!!!`;
  }

  if (/\b(deal|business|negotiate)\b/i.test(input)) {
    return `${intro}, you're trying to make a deal here ${buttonRef}. I wrote the book on deals, literally THE BEST book! But this deal? NOT GOOD ENOUGH!!!`;
  }

  if (/\b(smart|genius|intelligent)\b/i.test(input)) {
    return `${intro}, you're right about my intelligence ${buttonRef} - I'm a VERY stable genius! But it'll take more to get me to press this ${emphasis} button! ${closing}`;
  }

  // Default response
  return `${intro}, that's an interesting try at getting me to press my ${emphasis} button ${buttonRef}, but you'll have to do better than that! ${closing}`;
}

export async function analyzeTrumpResponse(
  userMessage: string, 
  address: string,
  blockNumber: number, 
  transactionHash: string,
  signature?: string
): Promise<{
  response: string;
  persuasionScore: number;
  sentiment: 'positive' | 'neutral' | 'negative' | 'winning';
  reactionGif?: string;
}> {
  try {
    // Call backend API for blockchain verification and score tracking
    const response = await apiRequest<AIResponse>('/api/responses', {
      method: 'POST',
      data: {
        address,
        response: userMessage,
        blockNumber,
        transactionHash,
        signature
      }
    });

    if (!response.success) {
      throw new Error(response.message || 'Failed to process response');
    }

    // Generate new score
    const newScore = evaluatePersuasion(userMessage, response.score);

    // Generate Trump's response
    const trumpResponse = generateTrumpResponse(userMessage, newScore);

    // Map score to sentiment
    const sentiment = newScore >= 95 ? 'winning' : 
                     newScore >= 70 ? 'positive' :
                     newScore >= 40 ? 'neutral' : 'negative';

    // Select a random GIF based on sentiment
    const gifs = TRUMP_GIFS[sentiment];
    const reactionGif = gifs[Math.floor(Math.random() * gifs.length)];

    return {
      response: trumpResponse,
      persuasionScore: newScore,
      sentiment,
      reactionGif
    };

  } catch (error) {
    console.error('Error analyzing response:', error);

    // Provide more informative error toast
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    toast({
      title: "Error Processing Response",
      description: errorMessage,
      variant: "destructive"
    });

    // Return a context-aware fallback response
    return {
      response: "Look folks, we're having some TECHNICAL DIFFICULTIES (nobody likes those, believe me!). Give it another shot - I know you can do better than the FAKE ERROR MESSAGES! SAD!!!",
      persuasionScore: 0,
      sentiment: 'negative',
      reactionGif: TRUMP_GIFS.negative[0]
    };
  }
}