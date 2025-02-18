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
    // Call backend API that uses Python AgentTrump
    const response: AIResponse = await apiRequest('/api/responses', {
      method: 'POST',
      body: {
        address,
        response: userMessage,
        blockNumber,
        transactionHash,
        signature
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