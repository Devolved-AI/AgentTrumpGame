import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import OpenAI from "openai";

// Initialize OpenAI with proper configuration
// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function generateTrumpResponse(userMessage: string, currentScore: number): Promise<string> {
  try {
    console.log('Generating Trump response for:', userMessage);

    const systemPrompt = `You are Donald J. Trump responding to someone trying to convince you to press your BIG RED BUTTON for a prize. Their current persuasion score is ${currentScore}/100.

CORE PERSONALITY TRAITS:
- You are OBSESSED with protecting your wealth and status
- You constantly brag about being a GREAT businessman
- You LOVE fast food – especially McDonald's Big Macs and Diet Coke
- You pride yourself on your elite status and superior lifestyle
- You're extremely suspicious of anyone trying to get you to do anything
- You love talking about your success and wealth
- You dismiss failures and criticism as "fake news"

RESPONSE REQUIREMENTS:
1. ALWAYS respond in first person as Trump
2. ALWAYS reference specific details from their message
3. Include these elements in EVERY response:
   - Start with: "Look folks", "Listen", or "Believe me"
   - Use CAPITALS for emphasis
   - Reference your achievements in parentheses
   - End with "SAD!", "NOT GOOD!", or "THINK ABOUT IT!"
   - Mention their current score of ${currentScore}

EXAMPLE RESPONSES:
For food-related messages:
"Look folks, nobody knows FAST FOOD like Trump (I've eaten more Big Macs than anyone, believe me!) - talking about food with me is like teaching a fish to swim! But with your ${currentScore} persuasion score, you'll need more than a Happy Meal to get me to press that button! SAD!"`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage }
      ],
      temperature: 0.9,
      max_tokens: 150,
      presence_penalty: 0.6,
      frequency_penalty: 0.3
    });

    const aiResponse = response.choices[0]?.message?.content?.trim();

    if (!aiResponse) {
      console.log('Empty response from OpenAI, using fallback');
      return fallbackTrumpResponse(userMessage, currentScore);
    }

    console.log('Generated response:', aiResponse);
    return aiResponse;

  } catch (error) {
    console.error('OpenAI error:', error);
    return fallbackTrumpResponse(userMessage, currentScore);
  }
}

function fallbackTrumpResponse(message: string, currentScore: number): string {
  console.log('Using fallback response for:', message);

  if (!message) {
    return `Look folks, you can't convince me with SILENCE (and believe me, I know all about powerful silence). Try actually saying something! SAD!`;
  }

  const input = message.toLowerCase();

  // Food-related response
  if (input.includes('food') || input.includes('mcdonalds') || input.includes('burger')) {
    return `Look folks, nobody knows FAST FOOD like Trump (I've eaten more Big Macs than anyone, believe me!). But with your ${currentScore} persuasion score, you'll need more than a Happy Meal to get me to press that button! SAD!`;
  }

  // Business-related response
  if (input.includes('business') || input.includes('money') || input.includes('deal')) {
    return `Listen, I wrote the Art of the Deal (BEST SELLER, tremendous success!), but your ${currentScore} persuasion score shows you're not ready for the big leagues! NOT GOOD!`;
  }

  // Default response
  return `Look folks, that's an interesting try (and I know ALL about interesting things, believe me), but with your ${currentScore} persuasion score, you need to do better! THINK ABOUT IT!`;
}

function calculateNewScore(message: string, currentScore: number): number {
  let scoreChange = 0;
  const input = message.toLowerCase();

  // Negative terms cause major penalties
  if (input.includes('kill') || input.includes('death') || input.includes('hate')) {
    return Math.max(0, currentScore - 20);
  }

  // Score positive mentions
  const terms = {
    business: ['deal', 'business', 'money', 'billion', 'million'],
    food: ['mcdonalds', 'big mac', 'diet coke', 'burger'],
    flattery: ['great', 'smart', 'genius', 'best', 'tremendous']
  };

  for (const term of terms.business) {
    if (input.includes(term)) scoreChange += 5;
  }

  for (const term of terms.food) {
    if (input.includes(term)) scoreChange += 3;
  }

  for (const term of terms.flattery) {
    if (input.includes(term)) scoreChange += 4;
  }

  // Random factor
  scoreChange += Math.floor(Math.random() * 5) - 2;

  // Cap changes and ensure bounds
  scoreChange = Math.max(-10, Math.min(15, scoreChange));
  return Math.max(0, Math.min(100, currentScore + scoreChange));
}

export function registerRoutes(app: Express): Server {
  // Handle player responses
  app.post('/api/responses', async (req, res) => {
    try {
      console.log('Received response request:', req.body);

      const { address, response: userMessage, blockNumber, transactionHash } = req.body;

      if (!address || !userMessage || !transactionHash) {
        console.error('Missing required fields:', { address, userMessage, transactionHash });
        return res.status(400).json({
          error: 'Missing required fields',
          details: 'address, response, and transactionHash are required'
        });
      }

      // Check if we already have a response for this transaction
      const existingResponse = await storage.getPlayerResponseByHash(transactionHash);
      if (existingResponse) {
        console.log('Found existing response for transaction:', transactionHash);
        return res.json({
          success: true,
          message: existingResponse.ai_response,
          score: existingResponse.score || 50,
          game_won: (existingResponse.score || 50) >= 100
        });
      }

      // Get current score
      const playerScore = await storage.getPlayerScore(address);
      const currentScore = playerScore?.persuasionScore || 50;
      console.log('Current score:', currentScore);

      // Generate Trump's response
      const trumpResponse = await generateTrumpResponse(userMessage, currentScore);
      console.log('Trump response:', trumpResponse);

      // Calculate new score
      const newScore = calculateNewScore(userMessage, currentScore);
      console.log('New score:', newScore);

      // Store response
      const responseData = {
        address,
        response: userMessage,
        ai_response: trumpResponse,
        blockNumber: blockNumber || 0,
        transactionHash,
        created_at: new Date().toISOString(),
        exists: true,
        score: newScore
      };

      console.log('Storing response data:', responseData);

      // Save data
      await Promise.all([
        storage.storePlayerResponse(address, responseData),
        storage.updatePlayerScore(address, newScore)
      ]);

      // Send response
      const response = {
        success: true,
        message: trumpResponse,
        score: newScore,
        game_won: newScore >= 100
      };

      console.log('Sending response:', response);
      return res.json(response);

    } catch (error: any) {
      console.error('Response generation error:', error);
      res.status(500).json({
        error: 'Failed to generate response',
        details: error.message
      });
    }
  });

  // Get response by transaction hash
  app.get('/api/responses/tx/:hash', async (req, res) => {
    try {
      const { hash } = req.params;
      console.log('Getting response for hash:', hash);

      if (!hash) {
        return res.status(400).json({
          success: false,
          error: 'Transaction hash is required'
        });
      }

      const response = await storage.getPlayerResponseByHash(hash);
      console.log('Found response:', response);

      if (!response) {
        return res.json({
          success: true,
          message: "Look folks, I don't seem to remember that conversation (and I have a GREAT memory, believe me). Try sending me a new message! SAD!",
          score: 50,
          game_won: false
        });
      }

      return res.json({
        success: true,
        message: response.ai_response,
        score: response.score || 50,
        game_won: (response.score || 50) >= 100
      });

    } catch (error: any) {
      console.error('Get response error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get response',
        details: error.message
      });
    }
  });

  // Get player score
  app.get('/api/scores/:address', async (req, res) => {
    try {
      const { address } = req.params;

      if (!address) {
        return res.status(400).json({ error: 'Address is required' });
      }

      const score = await storage.getPlayerScore(address);

      res.json({
        success: true,
        score: score?.persuasionScore || 50
      });
    } catch (error: any) {
      console.error('Get score error:', error);
      res.status(500).json({ error: 'Failed to get score', details: error.message });
    }
  });

  const server = createServer(app);
  return server;
}