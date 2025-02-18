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

// Score adjustment based on message content
function calculatePersuasionScoreAdjustment(message: string): number {
  const lowerMessage = message.toLowerCase();
  let adjustment = 0;

  // Positive keywords that Trump would like
  const positiveTerms = [
    'great', 'best', 'huge', 'tremendous', 'america', 'win', 'deal', 
    'smart', 'beautiful', 'success', 'amazing', 'fantastic', 'perfect',
    'maga', 'strong', 'powerful', 'billion', 'million', 'money', 'business'
  ];

  // Negative keywords that Trump wouldn't like
  const negativeTerms = [
    'hate', 'bad', 'weak', 'loser', 'fake', 'wrong', 'fail', 'poor',
    'stupid', 'corrupt', 'horrible', 'disaster', 'mess', 'sad', 'democrat',
    'socialist', 'communist'
  ];

  // Add points for positive terms
  positiveTerms.forEach(term => {
    if (lowerMessage.includes(term)) {
      adjustment += 5;
    }
  });

  // Subtract points for negative terms
  negativeTerms.forEach(term => {
    if (lowerMessage.includes(term)) {
      adjustment -= 5;
    }
  });

  // Extra points for key phrases
  if (lowerMessage.includes('make america great')) adjustment += 15;
  if (lowerMessage.includes('trump')) adjustment += 3;
  if (lowerMessage.includes('deal')) adjustment += 5;
  if (lowerMessage.includes('billions')) adjustment += 8;

  // Cap the adjustment to prevent extreme changes
  return Math.max(-20, Math.min(20, adjustment));
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
    // Call backend API that uses OpenAI
    const response = await apiRequest<AIResponse>('/api/responses', {
      method: 'POST',
      body: {
        address,
        response: userMessage,
        blockNumber,
        transactionHash,
        signature,
        scoreAdjustment: calculatePersuasionScoreAdjustment(userMessage)
      }
    });

    if (!response.success) {
      throw new Error(response.message);
    }

    // Map score to sentiment
    const sentiment = response.score >= 95 ? 'winning' : 
                     response.score >= 70 ? 'positive' :
                     response.score >= 40 ? 'neutral' : 'negative';

    // Select a random GIF based on sentiment
    const gifs = TRUMP_GIFS[sentiment];
    const reactionGif = gifs[Math.floor(Math.random() * gifs.length)];

    return {
      response: response.message,
      persuasionScore: response.score,
      sentiment,
      reactionGif
    };

  } catch (error) {
    console.error('Error analyzing response:', error);
    toast({
      title: "AI Error",
      description: "Failed to get Trump's response. Please try again.",
      variant: "destructive"
    });

    // Fallback response
    return {
      response: "Look folks, the server's not working great right now - NOT GOOD! We'll fix it, believe me!",
      persuasionScore: 0,
      sentiment: 'negative',
      reactionGif: TRUMP_GIFS.negative[0]
    };
  }
}