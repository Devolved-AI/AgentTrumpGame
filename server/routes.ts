import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import OpenAI from "openai";

// Initialize OpenAI
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
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You are Donald J. Trump responding to someone trying to convince you to give them your PRIZE POOL MONEY (over $1 million). Their current persuasion score is ${currentScore}/100.

CORE PERSONALITY:
- You are OBSESSED with protecting your wealth (especially this prize pool money)
- You constantly brag about being a GREAT businessman and making THE BEST deals
- You're extremely suspicious of anyone trying to get your money
- You love talking about your success and wealth
- You often mention your properties, especially Trump Tower and Mar-a-Lago
- You LOVE fast food, especially McDonald's Big Macs and Diet Coke
- You're known for eating well-done steak with ketchup

RESPONSE REQUIREMENTS:
1. ALWAYS directly reference their specific message content first
2. Connect their topic to your personal experience or business dealings
3. Use these elements in EVERY response:
   - Start with: "Look folks", "Listen", or "Believe me"
   - Use CAPS for emphasis frequently
   - Add Trump-style asides in parentheses (about your achievements)
   - End with "SAD!", "NOT GOOD!", or "THINK ABOUT IT!"
   - Reference their current persuasion score of ${currentScore}

RESPONSE STRUCTURE:
1. First sentence: Direct response about their specific topic
2. Second sentence: Your personal experience/success related to their topic
3. Final sentence: Why their argument isn't enough for your prize money

Examples:

User: "I love McDonald's!"
Response: "Look folks, McDonald's is TREMENDOUS (I eat Big Macs all the time in my PRIVATE JET), and I probably know more about fast food than anyone in history! But even with our shared taste in burgers, your ${currentScore} persuasion score won't get you near my prize money! SAD!"

User: "I'll invest your money in real estate"
Response: "Listen, trying to talk REAL ESTATE with ME (I own the most BEAUTIFUL buildings ever built) is like teaching a fish to swim! Nobody knows property development better than Trump, and your weak ${currentScore} persuasion score proves you're not in my league! NOT GOOD!"

Always maintain character and keep responses natural and flowing!`
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

  // Handle threatening content
  const threatTerms = ['kill', 'death', 'murder', 'threat', 'die', 'destroy', 'hate'];
  if (threatTerms.some(term => normalizedInput.includes(term))) {
    return `Listen folks, THREATS? Really? (I've dealt with the TOUGHEST negotiators in the world, believe me!) Nobody threatens Trump and gets anywhere near my prize money! Your ${currentScore} persuasion score just dropped even lower. SAD!`;
  }

  // Handle food-related content
  const foodTerms = ['mcdonalds', 'burger king', 'big mac', 'whopper', 'food'];
  if (foodTerms.some(term => normalizedInput.includes(term))) {
    return `Look folks, talking about fast food (I know ALL about it, probably more than anyone) - McDonald's, Burger King, I've had it all in Trump Tower! But even with our shared taste in burgers, your ${currentScore} persuasion score isn't close to getting my prize money! THINK ABOUT IT!`;
  }

  // Default business-focused response
  return `Listen, that's a WEAK attempt (and I know all about winning, believe me). You'll need to do much better than that to get anywhere near my prize money with your ${currentScore} persuasion score! NOT GOOD!`;
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

  // Quality bonuses
  if (message.length > 100) scoreChange += 3; // Long, thoughtful response
  if (message.includes('$')) scoreChange += 3; // Using dollar signs
  if (message.includes('%')) scoreChange += 3; // Talking percentages/returns

  // Special topic bonuses
  if (normalizedInput.includes('art of the deal')) scoreChange += 6;
  if (normalizedInput.includes('make america')) scoreChange += 4;
  if (normalizedInput.includes('trump organization')) scoreChange += 5;
  if (normalizedInput.includes('fake news')) scoreChange -= 3;

  // Food preference bonuses
  if (normalizedInput.includes('mcdonalds')) scoreChange += 4;
  if (normalizedInput.includes('big mac')) scoreChange += 5;
  if (normalizedInput.includes('diet coke')) scoreChange += 4;
  if (normalizedInput.includes('well done steak')) scoreChange += 5;

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
      foodTerms: foodTerms.filter(term => normalizedInput.includes(term)),
      businessTerms: businessTerms.filter(term => normalizedInput.includes(term)),
      flatteryTerms: flatteryTerms.filter(term => normalizedInput.includes(term)),
      qualityBonuses: {
        length: message.length > 100,
        usesDollars: message.includes('$'),
        usesPercentages: message.includes('%')
      }
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

      // Store response data asynchronously - don't wait for storage
      const responseData = {
        address,
        response: userMessage,
        ai_response: trumpResponse,
        blockNumber: blockNumber || 0,
        transactionHash: transactionHash || '',
        created_at: new Date().toISOString(),
        exists: true,
        score: newScore
      };

      // Store in background
      Promise.all([
        storage.storePlayerResponse(address, responseData),
        storage.updatePlayerScore(address, newScore)
      ]).catch(error => {
        console.error("Background storage error:", error);
      });

      // Send immediate response
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

  // API route to get response by transaction hash - for blockchain confirmation
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

      // If no stored response found, return a default response
      if (!storedResponse) {
        const currentScore = 50; // Default score for new responses
        return res.json({
          success: true,
          message: "Look folks, I don't seem to remember that conversation (and I have a GREAT memory, believe me). Try sending me a new message! SAD!",
          score: currentScore,
          game_won: false
        });
      }

      if (storedResponse && storedResponse.ai_response) {
        return res.json({
          success: true,
          message: storedResponse.ai_response,
          score: storedResponse.score || 50,
          game_won: (storedResponse.score || 50) >= 100
        });
      }


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