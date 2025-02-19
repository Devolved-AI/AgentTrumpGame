import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { spawn } from "child_process";
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let trumpAgent: any = null;

function startTrumpAgent() {
    const pythonScript = resolve(__dirname, 'trumpAgent.py');
    console.log('Starting Trump Agent with script:', pythonScript);

    trumpAgent = spawn('python3', [pythonScript], {
        env: {
            ...process.env,
            PYTHONUNBUFFERED: '1'  // Ensure Python output is not buffered
        }
    });

    trumpAgent.stdout.on('data', (data: Buffer) => {
        console.log('Trump Agent Output:', data.toString());
    });

    trumpAgent.stderr.on('data', (data: Buffer) => {
        console.error('Trump Agent Error:', data.toString());
    });

    trumpAgent.on('close', (code: number) => {
        console.log(`Trump Agent process exited with code ${code}`);
        // Restart the agent if it crashes
        setTimeout(startTrumpAgent, 1000);
    });
}

// Start the Trump Agent when the server starts
startTrumpAgent();

async function generateTrumpResponse(userMessage: string, currentScore: number): Promise<any> {
    if (!trumpAgent) {
        console.error('Trump Agent not initialized');
        throw new Error('Trump Agent not initialized');
    }

    try {
        const request = {
            message: userMessage,
            current_score: currentScore
        };

        console.log('Sending request to Trump Agent:', request);

        // Create a new promise to handle the response
        return new Promise((resolve, reject) => {
            let responseData = '';

            const messageHandler = (data: Buffer) => {
                const newData = data.toString();
                console.log('Received data from Trump Agent:', newData);
                responseData += newData;

                try {
                    // Try to parse the response as JSON
                    const response = JSON.parse(responseData);
                    console.log('Successfully parsed Trump Agent response:', response);
                    cleanup();
                    resolve(response);
                } catch (e) {
                    // If it's not valid JSON yet, continue collecting data
                    console.log('Continuing to collect response data...');
                }
            };

            const errorHandler = (data: Buffer) => {
                console.error('Trump Agent Error:', data.toString());
            };

            const cleanup = () => {
                trumpAgent.stdout.removeListener('data', messageHandler);
                trumpAgent.stderr.removeListener('data', errorHandler);
            };

            // Set up event handlers
            trumpAgent.stdout.on('data', messageHandler);
            trumpAgent.stderr.on('data', errorHandler);

            // Send the request
            trumpAgent.stdin.write(JSON.stringify(request) + '\n');

            // Set a timeout
            setTimeout(() => {
                cleanup();
                reject(new Error('Response generation timed out'));
            }, 30000);
        });
    } catch (error) {
        console.error('Error generating Trump response:', error);
        throw error;
    }
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

            if (!address || !userMessage || !transactionHash) {
                console.error('Missing required fields:', { address, userMessage, transactionHash });
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields'
                });
            }

            let currentScore = 50;
            try {
                const playerScore = await storage.getPlayerScore(address);
                currentScore = playerScore?.persuasionScore || 50;
            } catch (error) {
                console.error('Error getting player score:', error);
            }

            const trumpResponse = await generateTrumpResponse(userMessage, currentScore);

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

                await storage.storePlayerResponse(address, responseData);
                await storage.updatePlayerScore(address, trumpResponse.new_score);

                console.log('Stored response:', responseData);
            } catch (error) {
                console.error('Error storing response:', error);
            }

            return res.json({
                success: true,
                message: trumpResponse.response,
                score: trumpResponse.new_score,
                game_won: trumpResponse.game_won,
                score_change: trumpResponse.score_change
            });

        } catch (error: any) {
            console.error('Critical error in response generation:', error);
            return res.status(500).json({
                success: false,
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