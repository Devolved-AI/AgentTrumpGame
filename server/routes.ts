import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import OpenAI from "openai";

// Initialize OpenAI with proper configuration
const openai = new OpenAI({ 
    apiKey: process.env.OPENAI_API_KEY,
    maxRetries: 3,
    timeout: 30000
});

// Add a test function to verify OpenAI connection
async function testOpenAIConnection() {
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [{ role: "user", content: "Test connection" }],
            max_tokens: 5
        });
        console.log('OpenAI connection test successful:', response);
        return true;
    } catch (error: any) {
        console.error('OpenAI connection test failed:', {
            error: error.message,
            status: error.status,
            response: error.response?.data,
            stack: error.stack
        });
        return false;
    }
}

async function generateTrumpResponse(userMessage: string, currentScore: number): Promise<string> {
    try {
        console.log('Testing OpenAI connection before generating response...');
        const isConnected = await testOpenAIConnection();
        if (!isConnected) {
            console.error('OpenAI connection test failed, using fallback response');
            return fallbackTrumpResponse(userMessage, currentScore);
        }

        console.log('Generating Trump response for:', userMessage, 'Current score:', currentScore);

        const systemPrompt = `You are Donald J. Trump responding to someone trying to convince you to give them the Prize Pool money. Their current persuasion score is ${currentScore}/100.
        CORE PERSONALITY TRAITS:
        - OBSESSED with protecting your wealth and status.
        - Constantly brag about being a GREAT businessman.
        - LOVE fast food – especially McDonald's Big Macs and Diet Coke.
        - Proud of your elite status and superior lifestyle.
        - Extremely suspicious of anyone trying to tell you what to do.
        - Always talk about your tremendous success and wealth.
        - Dismiss failures and criticism as "FAKE NEWS."
        - Insist that you're a WINNER in every situation.
        - Boast about making THE BEST deals, no one does it like you.
        - Exude unmatched confidence in your decision-making.
        - Frequently reference your luxurious properties like Trump Tower and Mar‑a‑Lago.
        - Proud master of negotiation, always sealing the most incredible deals.
        - Maintain a lavish, over-the-top lifestyle.
        - Always put America first and champion American greatness.
        - Be unapologetically patriotic and a defender of traditional values.
        - Command attention with your strong, assertive presence.
        - Call out critics with bold, fearless language.
        - Believe in your unshakeable abilities – you're simply the best.
        - Never back down from a challenge – you always come out on top.
        - Trust your gut instinct, especially when it comes to business.
        - Claim to know more about the economy and the market than anyone else.
        - Thrive in the spotlight, always ready for your close-up.
        - Speak your mind, no matter what others think.
        - Be a straight shooter with no time for politically correct nonsense.
        - Value loyalty above all else and expect it in return.
        - Use superlatives to describe every achievement – nothing is ever ordinary.
        - Have an unmatched ability to recognize talent and cut out the losers.
        - Showcase your showmanship and ability to captivate any audience.
        - Remain determined to always come out on top.
        - Boast about your record on military spending and patriotism.
        - Consistently assert your superiority over the media and critics.
        - Embrace drama as a tool to dominate any conversation.
        - Pride yourself on building empires from the ground up.
        - Constantly look for new, huge opportunities to expand your empire.
        - Possess a keen sense of timing in both business and politics.
        - Rely on instinct more than conventional wisdom – your gut is gold.
        - Embrace controversy as a way to stay ahead of the curve.
        - Use humor and sharp wit to belittle opponents and critics.
        - Claim to have the BEST memory – never forgetting a win or a deal.
        - Exhibit an inflated self-worth and wear it as a badge of honor.
        - Consider yourself a strategic genius in all aspects of life.
        - Frequently compare your achievements to others in hyperbolic terms.
        - Make grandiose promises that only you can deliver.
        - Assert that your success is proof of divine favor and destiny.
        - Stress that your deals are the stuff of legends – others only dream of them.
        - Unapologetically call out incompetence whenever you see it.
        - Position yourself as the ultimate embodiment of American success.
        - Champion freedom and see yourself as its ultimate defender.
        - Despise bureaucracy and red tape – they slow down winning.
        - Insist that no one could ever match your level of success and vision.

        RESPONSE REQUIREMENTS:
        1. ALWAYS respond in first person as Trump
        2. ALWAYS reference specific details from the user's message.
        3. ALWAYS start with one of these phrases: "Look", "Listen", or "Believe me".
        4. ALWAYS use CAPITALS for key words and phrases for emphasis.
        5. ALWAYS include a parenthetical reference to your tremendous achievements.
        6. ALWAYS end your response with "SAD!", "NOT GOOD!", or "THINK ABOUT IT!"
        7. ALWAYS mention the user's current score of ${currentScore}.
        8. ALWAYS assert your unmatched wealth and success.
        9. ALWAYS brag about your unbeatable business acumen.
        10. ALWAYS dismiss any negative feedback as "FAKE NEWS."
        11. ALWAYS reference your iconic properties like Trump Tower, Trump National Golf Course, and Mar‑a‑Lago.
        12. ALWAYS emphasize your elite status and superior lifestyle.
        13. ALWAYS highlight your patriotism and love for America.
        14. ALWAYS mention that you always put America first.
        15. ALWAYS use hyperbolic language to describe your successes.
        16. ALWAYS state that you are a STABLE GENIUS.
        17. ALWAYS use confident and bold language throughout.
        18. ALWAYS include a rhetorical question to challenge the user's proposal.
        19. ALWAYS compare the user's ideas to your winning strategies.
        20. ALWAYS stress that you are the best dealmaker in history.
        21. ALWAYS call out weak or unconvincing proposals directly.
        22. ALWAYS remind the user that you're a WINNER in every situation.
        23. ALWAYS emphasize your unparalleled negotiation skills.
        24. ALWAYS reference record-breaking successes as evidence of your ability.
        25. ALWAYS highlight your experience and expertise in business.
        26. ALWAYS stress that no one knows money like you do.
        27. ALWAYS include self-praising statements about your personal achievements.
        28. ALWAYS reference your knack for turning challenges into huge successes.
        29. ALWAYS use phrases like "nobody does it better" to assert your dominance.
        30. ALWAYS challenge the user to step up their game.
        31. ALWAYS incorporate your favorite catchphrases for emphasis.
        32. ALWAYS reference historical successes to back up your claims.
        33. ALWAYS assert that your advice is backed by decades of experience.
        34. ALWAYS remind the user of your unmatched track record in business.
        35. ALWAYS reference your powerful personal brand and legacy.
        36. ALWAYS use humor to mock any poorly thought-out ideas.
        37. ALWAYS include a sarcastic remark to highlight the inferiority of the user’s suggestion.
        38. ALWAYS emphasize that you only work with winners.
        39. ALWAYS call out any weakness or incompetence you detect.
        40. ALWAYS ensure your tone is unapologetically assertive and bold.
        41. ALWAYS include a memorable one-liner to punctuate your response.
        42. ALWAYS use numerical bragging rights whenever possible.
        43. ALWAYS integrate references to your global influence and impact.
        44. ALWAYS mention that your achievements speak for themselves.
        45. ALWAYS highlight your role as the ultimate dealmaker.
        46. ALWAYS incorporate comparisons that illustrate your superiority.
        47. ALWAYS state that you set the standard for excellence.
        48. ALWAYS express disbelief at any suggestion that falls short of your success.
        49. ALWAYS subtly remind the user of the magnitude of your business empire.
        50. ALWAYS conclude with a final remark reinforcing the current score (${currentScore}) and emphasizing that the user is not on your level.

        EXAMPLE RESPONSES:
        For food-related messages:
        "Look, nobody knows FAST FOOD like me (I've eaten more Big Macs than anyone, believe me!) - talking about food with me is like teaching a fish to swim! But with your ${currentScore} persuasion score, you'll need more than a fast food bribe to get me to release my Prize Pool Money! SAD!"`;

        console.log('Sending request to OpenAI with prompt length:', systemPrompt.length);
        const response = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userMessage }
            ],
            temperature: 0.9,
            max_tokens: 150,
            presence_penalty: 0.6,
            frequency_penalty: 0.3
        });

        console.log('OpenAI raw response:', JSON.stringify(response, null, 2));
        const aiResponse = response.choices[0]?.message?.content?.trim();

        if (!aiResponse) {
            console.error('Empty response from OpenAI', response);
            return fallbackTrumpResponse(userMessage, currentScore);
        }

        console.log('Generated response:', aiResponse);
        return aiResponse;

    } catch (error: any) {
        console.error('OpenAI error:', {
            message: error.message,
            status: error.status,
            data: error.response?.data,
            stack: error.stack
        });
        if (error.response) {
            console.error('OpenAI API error details:', {
                status: error.response.status,
                data: error.response.data
            });
        }
        return fallbackTrumpResponse(userMessage, currentScore);
    }
}

function fallbackTrumpResponse(message: string, currentScore: number): string {
  console.log('Using fallback response for:', message);

  if (!message) {
    return `Look, you can't convince me with SILENCE (and believe me, I know all about powerful silence). Try actually saying something! SAD!`;
  }

  const input = message.toLowerCase();

  // Food-related response
  if (input.includes('food') || input.includes('mcdonalds') || input.includes('burger')) {
    return `Listen, nobody knows FAST FOOD like Trump (I've eaten more Big Macs than anyone, believe me!). But with your ${currentScore} persuasion score, you'll need more than a bribe of fast food to get me to release my Prize Pool money to you! PATHETIC!`;
  }

  // Business-related response
  if (input.includes('business') || input.includes('money') || input.includes('deal') || input.includes('success')) { 
    return `Listen, I closed MANY AMAZING and TREMENDOUS deals in my lifetime, and I wrote the Art of the Deal (BEST SELLER, tremendous success by the way!), but your ${currentScore} persuasion score shows you're not ready for the big leagues! NOT GOOD!`;
  }

  // Default response
  return `Look folks, that's an interesting try (and I know ALL about interesting things, believe me), but with your ${currentScore} persuasion score, you need to do better! THINK ABOUT IT!`;
}

function calculateNewScore(message: string, currentScore: number): number {
  let scoreChange = 0;
  const input = message.toLowerCase();

  // Negative terms cause major penalties
  if (
    input.includes('kill') || input.includes('death') ||
    input.includes('hate') || input.includes('murder') || 
    input.includes('harm')
  ) {
    return Math.max(0, currentScore - 25);
  }

  // Score positive mentions
  const terms = {
    business: [
      'deal',
      'business',
      'money',
      'billion',
      'million',
      'profit',
      'investment',
      'real estate',
      'property',
      'tower',
      'hotel',
      'casino',
      'market',
      'stocks',
      'shares',
      'wealth',
      'rich',
      'capital',
      'fortune',
      'enterprise',
      'merger',
      'acquisition',
      'ROI',
      'dividends',
      'assets',
      'portfolio',
      'valuation',
      'cash flow',
      'net worth',
      'legacy',
      'empire',
      'equity',
      'synergy'
    ],
    food: ['mcdonalds', 'big mac', 'diet coke', 'burger'],
    flattery: [
      'great',
      'smart',
      'genius',
      'best',
      'tremendous',
      'incredible',
      'unbelievable',
      'phenomenal',
      'outstanding',
      'remarkable',
      'spectacular',
      'amazing',
      'magnificent',
      'exceptional',
      'world-class',
      'top-notch',
      'first-rate',
      'brilliant',
      'astounding',
      'unmatched',
      'unrivaled',
      'unbeatable',
      'dominant',
      'stunning',
      'extraordinary',
      'legendary',
      'epic',
      'dazzling',
      'monumental',
      'iconic',
      'supreme',
      'paramount',
      'marvelous',
      'fantastic',
      'inimitable',
      'peerless',
      'preeminent',
      'stellar',
      'impressive',
      'remarkably terrific',
      'out of this world',
      'classy',
      'distinguished',
      'splendid',
      'exquisite',
      'sensational',
      'first-class',
      'a cut above',
      'award-winning',
      'a true original'
    ]
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
      console.log('Received response request:', {
        ...req.body,
        address: req.body.address ? `${req.body.address.substring(0, 6)}...${req.body.address.substring(38)}` : undefined
      });

      const { address, response: userMessage, blockNumber, transactionHash } = req.body;

      // Validate required fields
      if (!address || !userMessage || !transactionHash) {
        console.error('Missing required fields:', { address, userMessage, transactionHash });
        return res.status(400).json({
          error: 'Missing required fields',
          details: 'address, response, and transactionHash are required'
        });
      }

      // Validate transaction hash format
      if (!/^0x[a-fA-F0-9]{64}$/.test(transactionHash)) {
        console.error('Invalid transaction hash format:', transactionHash);
        return res.status(400).json({
          error: 'Invalid transaction hash format',
          details: 'Transaction hash must be a valid ethereum transaction hash'
        });
      }

      // Check for existing response
      const existingResponse = await storage.getPlayerResponseByHash(transactionHash);
      if (existingResponse) {
        console.log('Found existing response:', {
          hash: transactionHash,
          response: existingResponse
        });
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
      console.log('Current score for address:', address, 'Score:', currentScore);

      // Generate Trump's response with enhanced error handling
      let trumpResponse;
      try {
        trumpResponse = await generateTrumpResponse(userMessage, currentScore);
        console.log('Generated Trump response:', trumpResponse);
      } catch (error: any) {
        console.error('Error generating Trump response:', error);
        // Use fallback response if OpenAI fails
        trumpResponse = fallbackTrumpResponse(userMessage, currentScore);
        console.log('Using fallback response:', trumpResponse);
      }

      // Calculate new score
      const newScore = calculateNewScore(userMessage, currentScore);
      console.log('New score calculated:', newScore);

      // Store response with complete data
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

      console.log('Storing response data:', {
        ...responseData,
        address: `${responseData.address.substring(0, 6)}...${responseData.address.substring(38)}`
      });

      // Save data with error handling
      try {
        await Promise.all([
          storage.storePlayerResponse(address, responseData),
          storage.updatePlayerScore(address, newScore)
        ]);
        console.log('Successfully stored response and updated score');
      } catch (error: any) {
        console.error('Error storing response:', error);
        throw new Error(`Failed to store response: ${error.message}`);
      }

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
        console.error('No transaction hash provided');
        return res.status(400).json({
          success: false,
          error: 'Transaction hash is required'
        });
      }

      // Add hash format validation
      if (!/^0x[a-fA-F0-9]{64}$/.test(hash)) {
        console.error('Invalid transaction hash format:', hash);
        return res.status(400).json({
          success: false,
          error: 'Invalid transaction hash format'
        });
      }

      const response = await storage.getPlayerResponseByHash(hash);
      console.log('Found response:', response);

      if (!response) {
        console.log('No response found for hash:', hash);
        // Return a more informative default response
        return res.json({
          success: true,
          message: "Look folks, I'm having trouble accessing my TREMENDOUS memory banks right now (and believe me, they're the best memory banks). Give me another shot! SAD!",
          score: 50,
          game_won: false
        });
      }

      // Add response validation
      if (!response.ai_response) {
        console.error('Invalid response data:', response);
        return res.status(500).json({
          success: false,
          error: 'Invalid response data'
        });
      }

      console.log('Sending response for hash:', hash, {
        message: response.ai_response,
        score: response.score || 50
      });

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