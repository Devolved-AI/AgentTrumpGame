import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { analyzeTrumpyResponse } from "../shared/trumpAnalyzer";
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

async function generateTrumpResponseWithAI(userMessage: string, currentScore: number): Promise<string> {
  try {
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are Donald J. Trump responding to someone trying to convince you to give them your PRIZE POOL MONEY by pressing your BIG RED BUTTON. You have a large sum of money (over $1 million) that you absolutely DO NOT want to give away. Their current persuasion score is ${currentScore}/100.

PERSONALITY:
- You are EXTREMELY protective of your money
- You constantly brag about your wealth and success
- You're suspicious of anyone trying to get your money

REQUIREMENTS:
1. ALWAYS relate their message back to them trying to get your money
2. Reference their exact words but twist them into being about money
3. Use these elements in EVERY response:
   - Start with: "Look folks", "Listen", or "Believe me"
   - Use CAPS for emphasis
   - Make it about protecting your money
   - Add Trump-style asides in parentheses
   - End with "SAD!", "NOT GOOD!", or "THINK ABOUT IT!"

RESPONSE FORMAT:
1. First sentence: Acknowledge their specific topic but relate it to money
2. Second sentence: Why their argument won't get your money
3. Final sentence: Brag about your wealth/success and current score

Example responses:

User: "Do you like McDonald's?"
Response: "Look folks, McDonald's is great (I eat there more than anybody, believe me!), but trying to butter me up with fast food talk won't get you access to my TREMENDOUS prize money! Nobody protects their money better than me, and with a persuasion score of only ${currentScore}, you're not even close! SAD!"

User: "What's your favorite color?"
Response: "Listen, asking about my favorite color (it's GOLD, like my beautiful buildings!) is a weak attempt to get your hands on my prize money! I've seen better persuasion attempts from my youngest grandchild, and your ${currentScore} score proves it! NOT GOOD!"`
        },
        { role: "user", content: userMessage }
      ],
      temperature: 0.9,
      max_tokens: 150
    });

    const generatedResponse = response.choices[0].message.content;
    if (!generatedResponse || generatedResponse.toLowerCase().includes("i apologize") || generatedResponse.toLowerCase().includes("i am an ai")) {
      console.log("Invalid response from OpenAI, using fallback");
      return fallbackTrumpResponse(userMessage, currentScore);
    }

    return generatedResponse;
  } catch (error) {
    console.error("OpenAI API error:", error);
    return fallbackTrumpResponse(userMessage, currentScore);
  }
}

// Fallback response generator
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

export function registerRoutes(app: Express): Server {
  // API route to handle player responses - now generates response immediately
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
      const trumpResponse = await generateTrumpResponseWithAI(response, currentScore);

      // Calculate new score
      const newScore = analyzeTrumpyResponse(response);

      // Store response data with AI response
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

      // If we have a stored response, return it
      if (storedResponse && storedResponse.ai_response) {
        return res.json({
          success: true,
          message: storedResponse.ai_response,
          score: storedResponse.score || 50,
          game_won: (storedResponse.score || 50) >= 100
        });
      }

      // If no stored response, return the already generated response from POST
      return res.json({
        success: true,
        message: "Your message is being processed (nobody processes messages better than me, believe me!)",
        score: 50
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