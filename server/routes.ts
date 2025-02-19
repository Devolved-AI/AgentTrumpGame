import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import OpenAI from "openai";

// Initialize OpenAI with proper configuration and error handling
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    maxRetries: 3,
    timeout: 30000
});

// Add API key check function
function hasValidOpenAIKey(): boolean {
    const apiKey = process.env.OPENAI_API_KEY;
    return !!apiKey && apiKey.startsWith('sk-');
}

async function generateTrumpResponse(userMessage: string, currentScore: number): Promise<string> {
    // Log the start of response generation
    console.log('Starting Trump response generation:', {
        messagePreview: userMessage.substring(0, 50),
        score: currentScore,
        hasApiKey: hasValidOpenAIKey(),
        timestamp: new Date().toISOString()
    });

    if (!hasValidOpenAIKey()) {
        console.error('OpenAI API key is not properly configured');
        return fallbackTrumpResponse(userMessage, currentScore);
    }

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: `You are Donald J. Trump responding to someone trying to convince you to give them money. Current persuasion score: ${currentScore}/100.
                    CORE TRAITS:
                    - OBSESSED with wealth and status
                    - Brag about being a GREAT businessman
                    - LOVE McDonalds and Diet Coke
                    - Elite status and lifestyle

                    RULES:
                    1. Start with "Look", "Listen", or "Believe me"
                    2. Use CAPS for emphasis
                    3. Reference their message details
                    4. End with "SAD!", "NOT GOOD!", or "THINK ABOUT IT!"
                    5. Mention their score of ${currentScore}
                    6. Keep it under 150 words`
                },
                { role: "user", content: userMessage }
            ],
            temperature: 0.9,
            max_tokens: 150,
            presence_penalty: 0.6,
            frequency_penalty: 0.3
        });

        if (!response.choices?.[0]?.message?.content) {
            console.error('Empty or invalid response from OpenAI');
            return fallbackTrumpResponse(userMessage, currentScore);
        }

        const aiResponse = response.choices[0].message.content.trim();
        console.log('Successfully generated Trump response:', {
            length: aiResponse.length,
            preview: aiResponse.substring(0, 50) + '...',
            timestamp: new Date().toISOString()
        });

        return aiResponse;

    } catch (error: any) {
        console.error('OpenAI API error:', {
            message: error.message,
            code: error.code,
            type: error.type,
            timestamp: new Date().toISOString()
        });
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
                address: req.body.address ? `${req.body.address.substring(0, 6)}...${req.body.address.substring(38)}` : undefined,
                timestamp: new Date().toISOString()
            });

            const { address, response: userMessage, blockNumber, transactionHash } = req.body;

            // Validate required fields
            if (!address || !userMessage || !transactionHash) {
                console.error('Missing required fields:', { address, userMessage, transactionHash });
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields',
                    details: 'address, response, and transactionHash are required'
                });
            }

            // Get current score with error handling
            let currentScore = 50;
            try {
                const playerScore = await storage.getPlayerScore(address);
                currentScore = playerScore?.persuasionScore || 50;
            } catch (error) {
                console.error('Error getting player score:', error);
            }

            // Generate Trump's response with fallback
            let trumpResponse;
            let usesFallback = false;
            try {
                trumpResponse = await generateTrumpResponse(userMessage, currentScore);
            } catch (error) {
                console.error('Error in response generation:', error);
                usesFallback = true;
                trumpResponse = fallbackTrumpResponse(userMessage, currentScore);
            }

            // Calculate new score
            const newScore = calculateNewScore(userMessage, currentScore);

            // Store response data with retry mechanism
            try {
                const responseData = {
                    address,
                    response: userMessage,
                    ai_response: trumpResponse,
                    blockNumber: blockNumber || 0,
                    transactionHash,
                    created_at: new Date().toISOString(),
                    exists: true,  // Add the exists field
                    score: newScore
                };

                await storage.storePlayerResponse(address, responseData);
                await storage.updatePlayerScore(address, newScore);
            } catch (error) {
                console.error('Error storing response:', error);
            }

            // Send response
            return res.json({
                success: true,
                message: trumpResponse,
                score: newScore,
                game_won: newScore >= 100,
                used_fallback: usesFallback
            });

        } catch (error: any) {
            console.error('Critical error in response generation:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to generate response',
                details: error.message,
                fallback_message: fallbackTrumpResponse("", 50)
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