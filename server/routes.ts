import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import OpenAI from "openai";

// Initialize OpenAI with proper configuration
// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Type definitions for responses
interface AIResponse {
  success: boolean;
  message: string;
  score: number;
  game_won?: boolean;
}

async function generateTrumpResponse(userMessage: string, currentScore: number): Promise<string> {
  try {
    console.log('Attempting to generate response using OpenAI for message:', userMessage);
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are Donald J. Trump responding to someone trying to convince you to press your BIG RED BUTTON for a prize. Their current persuasion score is ${currentScore}/100.

CORE PERSONALITY:
- You are OBSESSED with protecting your wealth
- You constantly brag about being a GREAT businessman
- You LOVE fast food – especially McDonald's Big Macs and Diet Coke
- You pride yourself on your elite status and superior lifestyle
- You're extremely suspicious of anyone trying to get your money
- You love talking about your success and wealth
- You dismiss failures and criticism as "fake news"

RESPONSE REQUIREMENTS:
1. ALWAYS directly reference their specific message content first
2. Connect their topic to your personal experience
3. Use these elements in EVERY response:
   - Start with: "Look folks", "Listen", or "Believe me"
   - Use CAPITALS for emphasis
   - Include Trump-style asides (in parentheses)
   - End with "SAD!", "NOT GOOD!", or "THINK ABOUT IT!"
   - Reference their current persuasion score of ${currentScore}

EXAMPLE RESPONSES:

For food-related messages:
"Look folks, McDonald's is my ABSOLUTE FAVORITE (I probably eat more Big Macs than anybody, believe me!) - Burger King? Never liked it, their food is TERRIBLE! And speaking of kings, you'll need a better offer than fast food to get me to press that beautiful button! SAD!"

For business-related messages:
"Listen, trying to talk REAL ESTATE with ME (I own the most BEAUTIFUL buildings ever built) is like teaching a fish to swim! Nobody knows property development better than Trump, and your weak ${currentScore} persuasion score proves you're not in my league! NOT GOOD!"

Keep responses engaging and maintain Trump's characteristic style at all times!`
        },
        { role: "user", content: userMessage }
      ],
      temperature: 0.9,
      max_tokens: 200,
      presence_penalty: 0.6,
      frequency_penalty: 0.3
    });

    if (!response.choices[0]?.message?.content) {
      console.error('Empty response from OpenAI');
      return fallbackTrumpResponse(userMessage, currentScore);
    }

    const aiResponse = response.choices[0].message.content.trim();
    console.log('Generated AI response:', aiResponse);
    return aiResponse;

  } catch (error) {
    console.error("OpenAI API error:", error);
    return fallbackTrumpResponse(userMessage, currentScore);
  }
}

function fallbackTrumpResponse(message: string | undefined, currentScore: number): string {
  // Handle undefined or empty input
  if (!message) {
    return `Look folks, I can't respond to NOTHING (and believe me, I know something from nothing). Try asking me something real! SAD!`;
  }

  const normalizedInput = message.toLowerCase();

  // Handle food-related content with enhanced responses
  const foodTerms = ['mcdonalds', 'burger king', 'big mac', 'whopper', 'food', 'diet coke', 'steak', 'chicken', 'kfc'];
  if (foodTerms.some(term => normalizedInput.includes(term))) {
    return `Look folks, talking about food (I know ALL about it, probably more than anyone - ask anyone about my AMAZING taste in food!). Whether it's McDonald's Big Macs, KFC, or my favorite well-done steak with ketchup at Trump Tower (which is BEAUTIFUL by the way), your ${currentScore} persuasion score just isn't enough to get me to press that button! SAD!`;
  }

  // Handle business/money related content
  const businessTerms = ['deal', 'business', 'money', 'rich', 'wealth', 'billion', 'million'];
  if (businessTerms.some(term => normalizedInput.includes(term))) {
    return `Listen folks, nobody knows more about making money than me (I wrote the BEST-SELLING book "Art of the Deal", tremendous success!). But with your ${currentScore} persuasion score, you're not even close to my league! NOT GOOD!`;
  }

  // Default response if no specific matches
  return `Listen folks, that's an interesting try (and I know ALL about interesting things, believe me), but with your ${currentScore} persuasion score, you'll need to do better than that to get me to press my beautiful button! NOT GOOD!`;
}

function calculateNewScore(message: string, currentScore: number): number {
  let scoreChange = 0;
  const normalizedInput = message.toLowerCase();

  // Negative content causes major score reduction
  const negativeTerms = ['kill', 'death', 'murder', 'threat', 'die', 'destroy', 'hate', 'stupid'];
  if (negativeTerms.some(term => normalizedInput.includes(term))) {
    console.log('Negative terms detected, applying penalty');
    return Math.max(0, currentScore - 20);
  }

  // Food and restaurant terms (medium positive impact)
  const foodTerms = [
    'mcdonalds', 'burger king', 'big mac', 'whopper', 'fast food',
    'diet coke', 'steak', 'ketchup', 'well done', 'taco bowl',
    'kfc', 'pizza', 'food', 'restaurant', 'dining'
  ];
  const foodPoints = foodTerms.reduce((acc, term) =>
    normalizedInput.includes(term) ? acc + 3 : acc, 0);
  scoreChange += foodPoints;

  // Business and wealth terms (high positive impact)
  const businessTerms = [
    'deal', 'business', 'money', 'profit', 'investment',
    'billion', 'million', 'success', 'win', 'opportunity',
    'real estate', 'property', 'tower', 'hotel', 'casino',
    'market', 'stocks', 'shares', 'wealthy', 'rich'
  ];
  const businessPoints = businessTerms.reduce((acc, term) =>
    normalizedInput.includes(term) ? acc + 5 : acc, 0);
  scoreChange += businessPoints;

  // Trump-specific flattery (medium positive impact)
  const flatteryTerms = [
    'great', 'smart', 'genius', 'best', 'tremendous',
    'huge', 'amazing', 'successful', 'brilliant', 'winner',
    'trump tower', 'mar-a-lago', 'deal maker', 'leader',
    'excellent', 'incredible', 'powerful', 'masterful'
  ];
  const flatteryPoints = flatteryTerms.reduce((acc, term) =>
    normalizedInput.includes(term) ? acc + 4 : acc, 0);
  scoreChange += flatteryPoints;

  // Add small random factor (-2 to +2)
  scoreChange += Math.floor(Math.random() * 5) - 2;

  // Cap the maximum change per attempt
  scoreChange = Math.max(-10, Math.min(15, scoreChange));

  // Calculate final score with bounds
  const finalScore = Math.max(0, Math.min(100, currentScore + scoreChange));

  // Log scoring details
  console.log('Score calculation:', {
    initial: currentScore,
    change: scoreChange,
    final: finalScore,
    factors: {
      foodPoints,
      businessPoints,
      flatteryPoints
    }
  });

  return finalScore;
}

export function registerRoutes(app: Express): Server {
  // API route to handle player responses
  app.post('/api/responses', async (req, res) => {
    try {
      const { address, response: userMessage, blockNumber, transactionHash } = req.body;

      if (!address || !userMessage) {
        return res.status(400).json({
          error: 'Missing required fields',
          details: 'address and response are required'
        });
      }

      console.log('Processing response from address:', address);

      // Get current score
      const currentScore = (await storage.getPlayerScore(address))?.persuasionScore || 50;

      // Generate Trump's response using OpenAI
      const trumpResponse = await generateTrumpResponse(userMessage, currentScore);

      // Calculate new score
      const newScore = calculateNewScore(userMessage, currentScore);

      // Store response data
      const responseData = {
        address,
        response: userMessage,
        ai_response: trumpResponse,
        blockNumber: blockNumber || 0,
        transactionHash: transactionHash || null,
        created_at: new Date().toISOString(),
        exists: true,
        score: newScore
      };

      // Store responses and update score
      await Promise.all([
        storage.storePlayerResponse(address, responseData),
        storage.updatePlayerScore(address, newScore)
      ]);

      // Send response
      res.json({
        success: true,
        message: trumpResponse,
        score: newScore,
        game_won: newScore >= 100
      });

    } catch (error: any) {
      console.error("Generate response error:", error);
      res.status(500).json({
        error: 'Failed to generate response',
        details: error.message
      });
    }
  });

  // API route to get response by transaction hash
  app.get('/api/responses/tx/:hash', async (req, res) => {
    try {
      const { hash } = req.params;

      if (!hash) {
        return res.status(400).json({
          success: false,
          error: 'Transaction hash is required'
        });
      }

      console.log('Fetching response for hash:', hash);
      const storedResponse = await storage.getPlayerResponseByHash(hash);
      console.log('Retrieved response for hash:', hash, storedResponse);

      if (!storedResponse) {
        return res.json({
          success: true,
          message: "Look folks, I don't seem to remember that conversation (and I have a GREAT memory, believe me). Try sending me a new message! SAD!",
          score: 50,
          game_won: false
        });
      }

      return res.json({
        success: true,
        message: storedResponse.ai_response,
        score: storedResponse.score || 50,
        game_won: (storedResponse.score || 50) >= 100
      });

    } catch (error: any) {
      console.error("Get response by hash error:", error);
      res.status(500).json({
        success: false,
        error: 'Failed to get response',
        details: error.message
      });
    }
  });

  // API route to get player score
  app.get('/api/scores/:address', async (req, res) => {
    try {
      const { address } = req.params;

      if (!address) {
        return res.status(400).json({ error: 'Address is required' });
      }

      const score = await storage.getPlayerScore(address) || {
        address,
        persuasionScore: 50,
        lastUpdated: new Date()
      };

      res.json({
        success: true,
        score: score.persuasionScore
      });
    } catch (error: any) {
      console.error("Get score error:", error);
      res.status(500).json({ error: 'Failed to get score', details: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}