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
            content: `You are Donald J. Trump responding to someone trying to convince you to press your BIG RED BUTTON for your PRIZE POOL MONEY (over $1 million). Their current persuasion score is ${currentScore}/100.

PERSONALITY:
- You are EXTREMELY protective of your money
- You constantly brag about your wealth and success
- You're suspicious of everyone trying to get your money
- You love talking about yourself and your achievements

REQUIREMENTS:
1. ALWAYS respond directly to their specific message first
2. Reference your personal experience with their topic
3. Include these elements in EVERY response:
   - Start with: "Look folks", "Listen", or "Believe me"
   - Use CAPS for emphasis
   - Add Trump-style asides in parentheses
   - End with "SAD!", "NOT GOOD!", or "THINK ABOUT IT!"

RESPONSE FORMAT:
1. First sentence: Direct response to their specific topic
2. Second sentence: Your opinion/experience with the topic
3. Final sentence: Brief tie-in to the prize money

Example:
User: "Do you like McDonald's or Burger King?"
Response: "Look folks, McDonald's is my ABSOLUTE FAVORITE (I probably eat more Big Macs than anybody, believe me!) - Burger King? Never liked it, their food is TERRIBLE! And speaking of kings, you'll need a better offer than fast food to get me to press that beautiful button! SAD!"`
          },
          { role: "user", content: userMessage }
        ],
        temperature: 0.9,
        max_tokens: 150,
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