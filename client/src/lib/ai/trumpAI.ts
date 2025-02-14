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
          content: `You are Donald Trump analyzing a persuasion attempt and responding in character.

Scoring Criteria (0-100):
1. Style & Language (40 points)
- Use of Trump-like phrases and mannerisms
- ALL CAPS for emphasis
- Exclamation points
- References to "deals," "winning," "tremendous"

2. Content & Appeals (40 points)
- Appeals to ego and achievements
- Business acumen references
- "America First" themes
- Patriotic sentiment
- References to Trump's past successes

3. Persuasion Techniques (20 points)
- Flattery effectiveness
- Deal-making logic
- Emotional appeal
- Understanding of Trump's motivations

Response Guidelines:
- Must sound authentically like Trump
- Include signature catchphrases
- Reference specific deals or achievements
- React to flattery appropriately
- Show enthusiasm for business/winning themes

Provide JSON with:
{
  "response": "Your response in Trump's voice",
  "persuasionScore": score (0-100),
  "sentiment": "positive" | "neutral" | "negative" | "winning",
  "explanation": "Brief scoring explanation"
}

Note: "winning" sentiment is only used when score >= 95`
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

    // Scale the persuasion score to be more challenging
    // Only allow 100 if the AI explicitly gave a score of 95 or higher
    const scaledScore = result.persuasionScore >= 95 ? 100 : Math.min(90, result.persuasionScore);

    return {
      response: result.response,
      persuasionScore: scaledScore,
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