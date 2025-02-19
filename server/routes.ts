import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

// Hardcoded Trump-like responses categorized by context
const trumpResponses = {
    positive: [
        "Look folks, {message} - TREMENDOUS! I’ve got the best deals, nobody does it better (I’m a genius at winning, believe me)! Your score is {score}! THINK ABOUT IT!",
        "Listen, {message} is fantastic, really fantastic! I’m the king of greatness (I built an empire, folks)! Your score is {score}! NOT GOOD unless it’s 100!",
        "Believe me, {message} - absolutely YUGE! I’m the best at everything (people LOVE my style)! Your score is {score}! SAD if you don’t win!",
        "Look, {message} proves I’m right - it’s incredible! (I’ve got the best brain for this, folks!) Your score is {score}! THINK ABOUT IT!",
        "Listen, {message} - nobody celebrates success like me (I’m a BILLIONAIRE, folks)! Your score is {score}! NOT GOOD until you convince me!",
        "Believe me, {message} - pure genius! I’m the master of winning (best hotels, best everything)! Your score is {score}! SAD if it’s not higher!",
        "Look, {message} - fantastic stuff! I’m the champ of champs (I wrote the Art of the Deal)! Your score is {score}! THINK ABOUT IT!",
        "Listen folks, {message} - it’s AMAZING! I’m the greatest ever (my rallies are YUGE)! Your score is {score}! NOT GOOD yet!",
        "Believe me, {message} - TREMENDOUS energy! I’m the king of success (nobody beats Trump)! Your score is {score}! SAD if you stop now!",
        "Look, {message} - pure brilliance! I’m the best negotiator (I’ve got golden hair AND golden deals)! Your score is {score}! THINK ABOUT IT!"
    ],
    negative: [
        "Look folks, {message} - total DISASTER! I fix things better than anyone (I turned failing casinos around)! Your score is {score}! SAD!",
        "Listen, {message} - a mess, a TOTAL mess! Only I can save it (I’m the greatest fixer, folks)! Your score is {score}! NOT GOOD!",
        "Believe me, {message} - it’s TERRIBLE! I’m the only one who wins (I’ve got the best properties)! Your score is {score}! THINK ABOUT IT!",
        "Look, {message} - SAD stuff, folks! I’m the champ at turning it around (nobody beats my deals)! Your score is {score}! NOT GOOD!",
        "Listen, {message} - a failure, believe me! I’m the king of comebacks (I’ve got BILLIONS)! Your score is {score}! SAD!",
        "Believe me, {message} - awful, just awful! I’m the best at fixing messes (my towers are YUGE)! Your score is {score}! THINK ABOUT IT!",
        "Look folks, {message} - CROOKED! I’m the genius who wins (I’ve got the best brain)! Your score is {score}! NOT GOOD!",
        "Listen, {message} - total LOSER talk! I’m the winner here (I’ve got the best lifestyle)! Your score is {score}! SAD!",
        "Believe me, {message} - BAD news! I’m the only one who succeeds (my steaks are the best)! Your score is {score}! THINK ABOUT IT!",
        "Look, {message} - a DISGRACE! I’m the master of success (I’ve got golden everything)! Your score is {score}! NOT GOOD!"
    ],
    question: [
        "Look, {message} - GREAT question, folks! I’ve got the best answers (I’m smarter than Einstein)! Your score is {score}! THINK ABOUT IT!",
        "Listen, {message} - TREMENDOUS inquiry! I know everything (I’ve got the best memory)! Your score is {score}! NOT GOOD until 100!",
        "Believe me, {message} - fantastic question! I’ve got YUGE plans (I’m the greatest planner)! Your score is {score}! SAD if you don’t win!",
        "Look folks, {message} - smart stuff! I’ve got all the solutions (I built an empire)! Your score is {score}! THINK ABOUT IT!",
        "Listen, {message} - good one! I’m the king of answers (nobody debates me and wins)! Your score is {score}! NOT GOOD yet!",
        "Believe me, {message} - brilliant! I’ve got the best strategies (I’m a BILLIONAIRE)! Your score is {score}! SAD if it’s low!",
        "Look, {message} - TREMENDOUS question! I’ve got perfect responses (my rallies are packed)! Your score is {score}! THINK ABOUT IT!",
        "Listen folks, {message} - interesting! I’m the champ of replies (I’ve got the best words)! Your score is {score}! NOT GOOD until you convince me!",
        "Believe me, {message} - YUGE curiosity! I’ve got all the info (I’m the greatest ever)! Your score is {score}! SAD if you stop!",
        "Look, {message} - fantastic query! I’m the mastermind here (I’ve got golden deals)! Your score is {score}! THINK ABOUT IT!"
    ],
    policy: [
        "Look folks, {message} - my policies are TREMENDOUS! (I’ve got the best tax plans, believe me!) Your score is {score}! THINK ABOUT IT!",
        "Listen, {message} - I’ve got YUGE plans for that! (I’m the greatest businessman ever)! Your score is {score}! NOT GOOD until you see it!",
        "Believe me, {message} - my strategies are the BEST! (I’ve built empires, folks!) Your score is {score}! SAD if you doubt me!",
        "Look, {message} - fantastic policy stuff! (I’m the king of jobs, nobody better!) Your score is {score}! THINK ABOUT IT!",
        "Listen, {message} - I’m the champ of plans! (I’ve got BILLIONS from my ideas!) Your score is {score}! NOT GOOD yet!",
        "Believe me, {message} - TREMENDOUS policies! (I’ve got the best economy ever!) Your score is {score}! SAD if you don’t agree!",
        "Look folks, {message} - my ideas are WINNING! (I’m the greatest negotiator!) Your score is {score}! THINK ABOUT IT!",
        "Listen, {message} - YUGE policy wins! (I’ve got the best properties and plans!) Your score is {score}! NOT GOOD until 100!",
        "Believe me, {message} - I’m the policy KING! (I’ve got golden solutions, folks!) Your score is {score}! SAD if it’s low!",
        "Look, {message} - fantastic stuff! (I’ve got the best brain for policy!) Your score is {score}! THINK ABOUT IT!"
    ],
    default: [
        "Look folks, {message} - interesting! I’m the best at this (I’ve got the greatest lifestyle)! Your score is {score}! THINK ABOUT IT!",
        "Listen, {message} - okay stuff! I’m the king of everything (I’ve got BILLIONS)! Your score is {score}! NOT GOOD yet!",
        "Believe me, {message} - not bad! I’m the champ of champs (my towers are YUGE)! Your score is {score}! SAD if you stop!",
        "Look, {message} - decent try! I’m the greatest ever (I wrote the Art of the Deal)! Your score is {score}! THINK ABOUT IT!",
        "Listen folks, {message} - alright! I’ve got the best words (I’m a genius, believe me)! Your score is {score}! NOT GOOD until 100!",
        "Believe me, {message} - it’s something! I’m the master of success (I’ve got golden hair)! Your score is {score}! SAD if it’s low!",
        "Look, {message} - fair enough! I’m the king of winning (my rallies are packed)! Your score is {score}! THINK ABOUT IT!",
        "Listen, {message} - not terrible! I’ve got the best brain (nobody beats Trump)! Your score is {score}! NOT GOOD yet!",
        "Believe me, {message} - okay! I’m the champ of deals (I’ve got the best steaks)! Your score is {score}! SAD if you don’t win!",
        "Look folks, {message} - it’s a start! I’m the greatest (I’ve got golden everything)! Your score is {score}! THINK ABOUT IT!"
    ]
};

// Generate Trump response with context mixing
function generateTrumpResponse(userMessage: string, currentScore: number): TrumpResponse {
    const message = userMessage?.toString().trim() || "";
    const messageLower = message.toLowerCase();

    // Context detection
    const isPositive = /great|good|best|awesome|fantastic/i.test(messageLower);
    const isNegative = /bad|terrible|sad|awful|horrible/i.test(messageLower);
    const isQuestion = message.includes('?');
    const mentionsPolicy = /policy|plan|tax|economy|job/i.test(messageLower);

    console.log('Context detection:', { message, isPositive, isNegative, isQuestion, mentionsPolicy });

    // Select response category
    let selectedResponses: string[];
    if (mentionsPolicy) selectedResponses = trumpResponses.policy;
    else if (isQuestion) selectedResponses = trumpResponses.question;
    else if (isPositive) selectedResponses = trumpResponses.positive;
    else if (isNegative) selectedResponses = trumpResponses.negative;
    else selectedResponses = trumpResponses.default;

    // Randomly pick a response
    const randomIndex = Math.floor(Math.random() * selectedResponses.length);
    const template = selectedResponses[randomIndex];

    // Replace placeholders
    const response = template
        .replace('{message}', message)
        .replace('{score}', currentScore.toString());

    // Simple scoring logic (can be expanded later if needed)
    let scoreChange = Math.floor(Math.random() * 11) - 5; // -5 to +5
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
            }

            return res.json({
                success: true,
                message: trumpResponse.response,
                score: trumpResponse.new_score,
                game_won: trumpResponse.game_won,
                score_change: trumpResponse.score_change,
                transactionHash
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
            return res.status(500).json({ error: 'Failed to get score', details: error.message });
        }
    });

    const server = createServer(app);
    return server;
}