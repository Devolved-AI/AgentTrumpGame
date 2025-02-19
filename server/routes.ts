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

User: "I love fried chicken!"
Response: "Listen, talking about fried chicken (I know ALL about fried chicken, probably more than anyone) reminds me of my AMAZING Trump Tower Grill! But even with the BEST chicken in the world, your ${currentScore} persuasion score won't get you near my prize money! SAD!"

User: "I'll invest your money in real estate"
Response: "Look folks, trying to talk REAL ESTATE with ME (I own the most BEAUTIFUL buildings ever built) is like teaching a fish to swim! Nobody knows property development better than Trump, and your weak ${currentScore} persuasion score proves you're not in my league! NOT GOOD!"

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

function fallbackTrumpResponse(message: string, currentScore: number): string {
  const intros = ["Look folks", "Listen", "Believe me"];
  const emphasis = ["TREMENDOUS", "HUGE", "FANTASTIC", "BEAUTIFUL"];
  const moneyPhrases = [
    "but my prize money stays with me (and I know A LOT about keeping money, believe me!)",
    "but you'll never get near my MILLIONS (I've made some of the best deals ever!)",
    "but my money is staying right where it is (in my VERY SECURE account!)"
  ];
  const closings = ["SAD!", "NOT GOOD!", "THINK ABOUT IT!", "WEAK!"];

  const intro = intros[Math.floor(Math.random() * intros.length)];
  const emph = emphasis[Math.floor(Math.random() * emphasis.length)];
  const moneyPhrase = moneyPhrases[Math.floor(Math.random() * moneyPhrases.length)];
  const closing = closings[Math.floor(Math.random() * closings.length)];

  return `${intro}, that's a ${emph} try (and believe me, I know all about trying, nobody tries better than me!), ${moneyPhrase}! Your persuasion score of ${currentScore} isn't even close to what it takes to get my prize money! ${closing}`;
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

      if (storedResponse && storedResponse.ai_response) {
        return res.json({
          success: true,
          message: storedResponse.ai_response,
          score: storedResponse.score || 50,
          game_won: (storedResponse.score || 50) >= 100
        });
      }

      // If no stored response, generate a new one
      const tempScore = 50; // Default score for new responses
      const tempResponse = await generateTrumpResponse("Hello", tempScore);

      return res.json({
        success: true,
        message: tempResponse,
        score: tempScore,
        game_won: false
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