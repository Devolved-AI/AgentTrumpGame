import OpenAI from 'openai';
import { toast } from '@/hooks/use-toast';

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

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

interface AIResponse {
  response: string;
  persuasionScore: number;
  sentiment: 'positive' | 'neutral' | 'negative' | 'winning';
  reactionGif?: string;
}

export async function analyzeTrumpResponse(userMessage: string): Promise<AIResponse> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are Donald Trump responding to someone trying to convince you to press a big red button. 
          Analyze their persuasion attempt and respond in your characteristic style.
          Consider these aspects:
          - Use your typical phrases and mannerisms
          - React to flattery, business acumen, and "America First" rhetoric
          - Reference your past achievements and deals
          - Use ALL CAPS for emphasis
          - Include your signature exclamations (Sad!, Tremendous!, etc.)
          
          Rate their persuasion on a scale of 0-100 based on:
          - How well they appeal to your ego and achievements
          - References to deals, business success, and winning
          - Use of your style and catchphrases
          - "America First" and patriotic themes
          
          Respond in JSON format with:
          - response: Your response in Trump style
          - persuasionScore: 0-100 score
          - sentiment: "positive", "neutral", "negative", or "winning" if they've convinced you
          - explanation: Brief explanation of the score`
        },
        {
          role: "user",
          content: userMessage
        }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content);
    
    // Select a random GIF based on sentiment
    const gifs = TRUMP_GIFS[result.sentiment];
    const reactionGif = gifs[Math.floor(Math.random() * gifs.length)];

    return {
      response: result.response,
      persuasionScore: result.persuasionScore,
      sentiment: result.sentiment,
      reactionGif
    };

  } catch (error) {
    console.error('Error analyzing response:', error);
    toast({
      title: "AI Error",
      description: "Failed to generate Trump's response. Using fallback response.",
      variant: "destructive"
    });

    // Fallback response
    return {
      response: "Look, the server's not working great right now - NOT GOOD! We'll fix it, believe me!",
      persuasionScore: 0,
      sentiment: 'negative',
      reactionGif: TRUMP_GIFS.negative[0]
    };
  }
}
