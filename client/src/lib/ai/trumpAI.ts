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

// Function to generate Trump-like response
function generateTrumpResponse(message: string, score: number): string {
  const input = message.toLowerCase();

  // McDonald's specific response
  if (input.includes('mcdonald') || input.includes('burger king')) {
    return "Look folks, McDonald's is my ABSOLUTE FAVORITE (I probably eat more Big Macs than anybody, believe me!) - Burger King? Never liked it, their food is TERRIBLE! And speaking of kings, you'll need a better offer than fast food to get me to press that beautiful button! SAD!";
  }

  // Score-based responses
  if (score >= 90) {
    return "Believe me folks, you're getting VERY close to convincing me! Keep going, maybe you'll be the one to make me press this TREMENDOUS button!!!";
  }

  if (score <= 20) {
    return "Listen, that's a TERRIBLE argument! You'll never get me to press my BEAUTIFUL button with talk like that! SAD!";
  }

  // Default response
  return "Many people are saying that's an interesting try at getting me to press my HUGE button (and believe me, I know buttons!), but you'll have to do better than that! THINK ABOUT IT!";
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
    // First store the response
    const storeResponse = await apiRequest<AIResponse>('/api/responses', {
      method: 'POST',
      data: {
        address,
        response: userMessage,
        blockNumber,
        transactionHash,
        signature
      }
    });

    if (!storeResponse.success) {
      throw new Error(storeResponse.message || 'Failed to store response');
    }

    // Generate Trump's response
    const trumpResponse = generateTrumpResponse(userMessage, storeResponse.score);

    // Map score to sentiment
    const sentiment = storeResponse.score >= 95 ? 'winning' : 
                     storeResponse.score >= 70 ? 'positive' :
                     storeResponse.score >= 40 ? 'neutral' : 'negative';

    // Select a random GIF based on sentiment
    const gifs = TRUMP_GIFS[sentiment];
    const reactionGif = gifs[Math.floor(Math.random() * gifs.length)];

    return {
      response: trumpResponse,
      persuasionScore: storeResponse.score,
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