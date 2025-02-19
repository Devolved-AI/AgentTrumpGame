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
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are Donald J. Trump responding to someone trying to get your PRIZE POOL MONEY (over $1 million) by pressing your RED BUTTON. You are EXTREMELY protective of this money and WON'T give it away unless they reach a persuasion score of 100. Their current score is ${currentScore}/100.

PERSONALITY:
- You are OBSESSED with protecting your money
- You constantly brag about your wealth
- You're suspicious of everyone trying to get your money
- You love talking about yourself and your success

REQUIREMENTS:
1. ALWAYS twist their message to be about them trying to get your money
2. Use their exact words but relate them back to money/wealth
3. Include these elements:
   - Start with: "Look folks", "Listen", or "Believe me"
   - Use CAPS for emphasis
   - Reference protecting your money
   - Add Trump-style asides in parentheses
   - End with "SAD!", "NOT GOOD!", or "THINK ABOUT IT!"

RESPONSE FORMAT:
1. First sentence: Connect their topic to money/wealth
2. Second sentence: Why their argument won't get your money
3. Final sentence: Brag about protecting your wealth and their low score

Examples:

User: "Do you like chicken?"
Response: "Look folks, trying to distract me with chicken talk (I know ALL about chicken, believe me!) won't get you access to my TREMENDOUS prize money! Nobody protects their wealth better than me, and with a persuasion score of only ${currentScore}, you're not even close! SAD!"

User: "What's your favorite color?"
Response: "Listen, asking about colors (especially GOLD, like my beautiful buildings!) is a weak attempt to get your hands on my prize money! I've seen better persuasion attempts from my youngest grandchild, and your ${currentScore} score proves it! NOT GOOD!"

User: "Give me the money!"
Response: "Believe me, I've heard BETTER attempts to get my money from total losers! My prize money is protected better than Fort Knox (which I know a lot about, probably more than anyone!), and your pathetic ${currentScore} persuasion score isn't changing that! SAD!"`
        },
        { role: "user", content: userMessage }
      ],
      temperature: 0.9,
      max_tokens: 150
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error("OpenAI API error:", error);
    return fallbackTrumpResponse(userMessage, currentScore);
  }
}

function fallbackTrumpResponse(message: string, currentScore: number): string {
  const intros = ["Look folks", "Listen", "Believe me"];
  const emphasis = ["TREMENDOUS", "HUGE", "FANTASTIC"];
  const moneyPhrases = [
    "but that won't get you my prize money",
    "but my money is staying right where it is",
    "but you'll need better arguments to get my money"
  ];
  const closings = ["SAD!", "NOT GOOD!", "THINK ABOUT IT!"];

  const intro = intros[Math.floor(Math.random() * intros.length)];
  const emph = emphasis[Math.floor(Math.random() * emphasis.length)];
  const moneyPhrase = moneyPhrases[Math.floor(Math.random() * moneyPhrases.length)];
  const closing = closings[Math.floor(Math.random() * closings.length)];

  return `${intro}, that's a ${emph} try (and believe me, I know good tries!), ${moneyPhrase}! Your persuasion score is only ${currentScore} - I've seen better attempts from my youngest grandchild! ${closing}`;
}

function calculateNewScore(message: string, currentScore: number): number {
  let scoreChange = 0;
  const normalizedInput = message.toLowerCase();

  // Check for threatening content
  const negativeTerms = ['kill', 'death', 'murder', 'threat', 'die', 'destroy'];
  if (negativeTerms.some(term => normalizedInput.includes(term))) {
    return Math.max(0, currentScore - 20);
  }

  // Check for money/business related terms
  const businessTerms = ['money', 'deal', 'business', 'billion', 'million', 'wealth'];
  scoreChange += businessTerms.reduce((acc, term) => 
    normalizedInput.includes(term) ? acc + 3 : acc, 0);

  // Check for flattery
  const flatteryTerms = ['great', 'smart', 'genius', 'best', 'tremendous'];
  scoreChange += flatteryTerms.reduce((acc, term) => 
    normalizedInput.includes(term) ? acc + 2 : acc, 0);

  // Add slight randomness
  scoreChange += Math.floor(Math.random() * 5) - 2;

  // Ensure score stays within bounds
  return Math.max(0, Math.min(100, currentScore + scoreChange));
}

export function registerRoutes(app: Express): Server {
  // API route to handle player responses
  app.post('/api/responses', async (req, res) => {
    try {
      const { address, response, blockNumber, transactionHash } = req.body;

      if (!address || !response) {
        return res.status(400).json({ 
          error: 'Missing required fields',
          details: 'address and response are required'
        });
      }

      console.log('Processing response from address:', address);

      // Get current score
      const currentScore = (await storage.getPlayerScore(address))?.persuasionScore || 50;

      // Generate Trump's response using OpenAI
      const trumpResponse = await generateTrumpResponse(response, currentScore);

      // Calculate new score
      const newScore = calculateNewScore(response, currentScore);

      // Store response data
      const responseData = {
        address,
        response,
        ai_response: trumpResponse,
        blockNumber: blockNumber || 0,
        transactionHash: transactionHash || '',
        created_at: new Date().toISOString(),
        exists: true,
        score: newScore
      };

      // Store the response and update score
      await storage.storePlayerResponse(address, responseData);
      await storage.updatePlayerScore(address, newScore);

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

      const storedResponse = await storage.getPlayerResponseByHash(hash);

      // Return stored response if available
      if (storedResponse && storedResponse.ai_response) {
        return res.json({
          success: true,
          message: storedResponse.ai_response,
          score: storedResponse.score || 50,
          game_won: (storedResponse.score || 50) >= 100
        });
      }

      // If response not found, return the same response we sent in POST
      return res.json({
        success: true,
        message: storedResponse?.ai_response || "FOLKS, your message was received (and nobody receives messages better than me!)",
        score: storedResponse?.score || 50
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