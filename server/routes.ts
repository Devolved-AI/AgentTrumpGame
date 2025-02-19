import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

function generateTrumpResponse(userMessage: string, currentScore: number) {
    const message = userMessage?.toString().trim() || "";
    const messageLower = message.toLowerCase();

    const isPositive = /great|good|best|awesome|fantastic/i.test(messageLower);
    const isNegative = /bad|terrible|sad|awful|horrible/i.test(messageLower);
    const isQuestion = message.includes('?');
    const mentionsPolicy = /policy|plan|tax|economy|job/i.test(messageLower);

    console.log('Context detection:', { message, isPositive, isNegative, isQuestion, mentionsPolicy });

    const responseTemplates = {
        positive: [
            `Folks, ${message} - absolutely TREMENDOUS! I'm like Christopher Columbus discovering greatness, but with better hair and more luxurious boats!`,
            `Look, ${message}, nobody does it better than me, believe me! It's fantastic, really fantastic!`,
            `I have the best response to ${message}, folks - people are saying it’s YUGE, the best they’ve ever seen!`
        ],
        negative: [
            `SAD! ${message} - total disaster, folks! But I’ll fix it, nobody fixes things better than me, I’m like Superman but with better real estate!`,
            `Listen, ${message}, it’s a mess, a total mess! Only I can make it TREMENDOUS again, believe me!`,
            `${message}? Crooked stuff, folks! I’ve seen better deals at a failing casino, and I turned those around BIGLY!`
        ],
        question: [
            `${message} Great question, folks! I know the answer better than anybody, it’s gonna be YUGE!`,
            `Okay, ${message} - people ask me this all the time, and I give the best answers, nobody does it better!`,
            `${message} Tremendous question! I’ve got a plan, a fantastic plan, the best plan you’ve ever seen!`
        ],
        policy: [
            `${message} - my policies? TREMENDOUS, folks! The best policies, better than anybody’s ever had, believe me!`,
            `Look at ${message}, I’ve got plans, fantastic plans! We’re talking tax cuts, jobs, WINNING - it’s gonna be YUGE!`,
            `${message} - I’m the policy king, folks! Nobody does policy better, it’s like I invented winning!`
        ],
        default: [
            `Folks, ${message} - unbelievable! I’m the best at this, everyone says so!`,
            `Look, ${message}, it’s gonna be fantastic, absolutely fantastic - I’ve got the best words!`,
            `${message}? Tremendous stuff, folks! I’m like Abraham Lincoln but with better properties!`
        ]
    };

    let selectedResponses: string[];
    if (mentionsPolicy) selectedResponses = responseTemplates.policy;
    else if (isQuestion) selectedResponses = responseTemplates.question;
    else if (isPositive) selectedResponses = responseTemplates.positive;
    else if (isNegative) selectedResponses = responseTemplates.negative;
    else selectedResponses = responseTemplates.default;

    const randomIndex = Math.floor(Math.random() * selectedResponses.length);
    const response = selectedResponses[randomIndex] || selectedResponses[0];

    let scoreChange = 0;
    const baseChange = Math.floor(Math.random() * 7) - 3;
    if (isPositive) scoreChange += 2;
    if (isNegative) scoreChange -= 2;
    if (isQuestion) scoreChange += 1;
    if (mentionsPolicy) scoreChange += 3;
    if (message.length > 50) scoreChange += 2;
    if (message.length < 10 && message.length > 0) scoreChange -= 1;

    scoreChange = Math.max(-5, Math.min(5, scoreChange + baseChange));
    const newScore = Math.max(0, Math.min(100, currentScore + scoreChange));

    return {
        response,
        previous_score: currentScore,
        score_change: scoreChange,
        new_score: newScore,
        game_won: newScore >= 100,
        timestamp: new Date().toISOString()
    };
}

interface TrumpResponse {
    response: string;
    previous_score: number;
    score_change: number;
    new_score: number;
    game_won: boolean;
    timestamp: string;
    error?: string;
}

export function registerRoutes(app: Express): Server {
    app.post('/api/responses', async (req, res) => {
        try {
            console.log('POST /api/responses received:', req.body);

            const { address, response: userMessage, blockNumber, transactionHash } = req.body;

            if (!address || !userMessage || !transactionHash) {
                console.error('Missing required fields:', { address, userMessage, transactionHash });
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields',
                    details: 'address, response, and transactionHash are required'
                });
            }

            let currentScore = 50;
            try {
                const playerScore = await storage.getPlayerScore(address);
                currentScore = playerScore?.persuasionScore || 50;
                console.log('Current score retrieved:', currentScore);
            } catch (error) {
                console.error('Error getting player score:', error);
            }

            const trumpResponse = generateTrumpResponse(userMessage, currentScore);
            console.log('Generated response:', trumpResponse);

            try {
                const responseData = {
                    address,
                    response: userMessage,
                    ai_response: trumpResponse.response,
                    blockNumber: blockNumber || 0,
                    transactionHash,
                    created_at: new Date().toISOString(),
                    exists: true,
                    score: trumpResponse.new_score
                };

                console.log('Storing response data:', responseData);
                await storage.storePlayerResponse(address, responseData);
                await storage.updatePlayerScore(address, trumpResponse.new_score);
                console.log('Response stored successfully for hash:', transactionHash);
            } catch (error) {
                console.error('Error storing response:', error);
                // Still return the response even if storage fails
            }

            return res.json({
                success: true,
                message: trumpResponse.response,
                score: trumpResponse.new_score,
                game_won: trumpResponse.game_won,
                score_change: trumpResponse.score_change,
                transactionHash // Return the hash for reference
            });

        } catch (error: any) {
            console.error('Critical error in POST /api/responses:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to generate response',
                details: error.message
            });
        }
    });

    app.get('/api/responses/tx/:hash', async (req, res) => {
        try {
            const { hash } = req.params;
            console.log('GET /api/responses/tx/:hash received for hash:', hash);

            if (!hash) {
                console.error('No transaction hash provided');
                return res.status(400).json({
                    success: false,
                    error: 'Transaction hash is required'
                });
            }

            const response = await storage.getPlayerResponseByHash(hash);
            console.log('Retrieved response from storage:', response);

            if (!response) {
                console.log('No response found for hash:', hash);
                return res.json({
                    success: true,
                    message: "Look folks, I'm having trouble accessing my TREMENDOUS memory banks right now (and believe me, they're the best memory banks). Give me another shot! SAD!",
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
            console.error('Error in GET /api/responses/tx/:hash:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to get response',
                details: error.message
            });
        }
    });

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