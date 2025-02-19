import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Trump Agent
let trumpAgent: any = null;

async function initializeTrumpAgent() {
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
        console.log('Trump Agent process exited with code:', code);
        // Restart the agent if it crashes
        setTimeout(initializeTrumpAgent, 1000);
    });
}

// Initialize when server starts
initializeTrumpAgent();

interface TrumpResponse {
    response: string;
    previous_score: number;
    score_change: number;
    new_score: number;
    game_won: boolean;
    timestamp: string;
    error?: string;
}

async function generateTrumpResponse(userMessage: string, currentScore: number): Promise<TrumpResponse> {
    if (!trumpAgent) {
        console.error('Trump Agent not initialized');
        return {
            response: `Look folks, my TREMENDOUS AI brain isn't working right now (and believe me, it's usually the BEST brain). Try again in a moment! SAD!`,
            previous_score: currentScore,
            score_change: 0,
            new_score: currentScore,
            game_won: false,
            timestamp: new Date().toISOString()
        };
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
            let errorData = '';

            // Set up event handlers for this request
            const messageHandler = (data: Buffer) => {
                const newData = data.toString();
                console.log('Received data from Trump Agent:', newData);
                responseData += newData;

                try {
                    const response = JSON.parse(responseData);
                    console.log('Parsed response:', response);
                    cleanup();
                    resolve(response);
                } catch (e) {
                    // If it's not valid JSON yet, keep collecting data
                    console.log('Not valid JSON yet, continuing to collect data');
                }
            };

            const errorHandler = (data: Buffer) => {
                const error = data.toString();
                console.error('Trump Agent Error:', error);
                errorData += error;
            };

            const closeHandler = (code: number) => {
                cleanup();
                if (code !== 0) {
                    console.error(`Trump Agent exited with code ${code}. Error: ${errorData}`);
                    reject(new Error(`Agent exited with code ${code}. Error: ${errorData}`));
                }
            };

            // Clean up function to remove listeners
            const cleanup = () => {
                trumpAgent.stdout.removeListener('data', messageHandler);
                trumpAgent.stderr.removeListener('data', errorHandler);
                trumpAgent.removeListener('close', closeHandler);
            };

            // Attach event listeners
            trumpAgent.stdout.on('data', messageHandler);
            trumpAgent.stderr.on('data', errorHandler);
            trumpAgent.on('close', closeHandler);

            // Write request to the Python process
            trumpAgent.stdin.write(JSON.stringify(request) + '\n');

            // Set timeout
            setTimeout(() => {
                cleanup();
                reject(new Error('Response generation timed out'));
            }, 30000);
        });

    } catch (error) {
        console.error('Error generating Trump response:', error);
        return {
            response: `Look folks, something went wrong with my TREMENDOUS AI brain (and believe me, it's usually perfect). Let's try that again! SAD!`,
            previous_score: currentScore,
            score_change: 0,
            new_score: currentScore,
            game_won: false,
            timestamp: new Date().toISOString()
        };
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

            // Validate required fields
            if (!address || !userMessage || !transactionHash) {
                console.error('Missing required fields:', { address, userMessage, transactionHash });
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields',
                    details: 'address, response, and transactionHash are required'
                });
            }

            // Get current score
            let currentScore = 50;
            try {
                const playerScore = await storage.getPlayerScore(address);
                currentScore = playerScore?.persuasionScore || 50;
            } catch (error) {
                console.error('Error getting player score:', error);
            }

            // Generate Trump's response using Python agent
            const trumpResponse = await generateTrumpResponse(userMessage, currentScore);

            // Store response data
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
                console.error('No transaction hash provided');
                return res.status(400).json({
                    success: false,
                    error: 'Transaction hash is required'
                });
            }

            const response = await storage.getPlayerResponseByHash(hash);
            console.log('Found response:', response);

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