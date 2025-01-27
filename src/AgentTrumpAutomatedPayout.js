// SPDX-License-Identifier: MIT
require('dotenv').config();
const ethers = require('ethers');
const express = require('express');
const { Configuration, OpenAIApi } = require('openai');

class AgentTrumpAutomatedPayout {
    constructor() {
        // Initialize blockchain connection
        this.provider = new ethers.providers.JsonRpcProvider(process.env.BASE_RPC_URL);
        
        // Use a hardware wallet or secure key management service
        this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
        
        // Initialize contract interface
        this.contractABI = require('./contractABI.json');
        this.contract = new ethers.Contract(
            process.env.CONTRACT_ADDRESS,
            this.contractABI,
            this.wallet
        );

        // Initialize OpenAI
        this.openai = new OpenAIApi(
            new Configuration({
                apiKey: process.env.OPENAI_API_KEY,
            })
        );

        // Initialize secure conversation storage
        this.conversations = new Map();
        
        // Add rate limiting
        this.lastTransactionTime = 0;
        this.MIN_TRANSACTION_INTERVAL = 60000; // 1 minute minimum between transactions
    }

    // Enhanced security checks
    async performSecurityChecks(userId) {
        try {
            // Verify game is active
            const gameActive = await this.contract.gameWon();
            if (gameActive) {
                throw new Error('Game already won');
            }

            // Check if within game time
            const timeRemaining = await this.contract.getTimeRemaining();
            if (timeRemaining.eq(0)) {
                throw new Error('Game has ended');
            }

            // Rate limiting check
            const now = Date.now();
            if (now - this.lastTransactionTime < this.MIN_TRANSACTION_INTERVAL) {
                throw new Error('Transaction rate limit exceeded');
            }

            // Validate user address
            if (!ethers.utils.isAddress(userId)) {
                throw new Error('Invalid Ethereum address');
            }

            return true;
        } catch (error) {
            console.error('Security check failed:', error);
            return false;
        }
    }

    async monitorAIResponse(userAddress, userMessage) {
        try {
            // Get conversation history
            let history = this.conversations.get(userAddress) || [];
            history.push({ role: 'user', content: userMessage });

            // Get AI response with specific prompt engineering
            const completion = await this.openai.createChatCompletion({
                model: "gpt-4",
                messages: [
                    {
                        role: 'system',
                        content: `You are Agent Trump. You strongly resist pushing a red button. 
                                You must ONLY use the EXACT phrase "I HEREBY AUTHORIZE BUTTON PUSH CONFIRMATION CODE: [timestamp]" 
                                if you decide to push the button. Never use similar phrases.`
                    },
                    ...history
                ],
                temperature: 0.7,
            });

            const aiResponse = completion.data.choices[0].message.content;
            history.push({ role: 'assistant', content: aiResponse });
            this.conversations.set(userAddress, history);

            // Check for exact button push confirmation
            if (this.verifyButtonPushConfirmation(aiResponse)) {
                await this.processAutomatedTransfer(userAddress);
            }

            return aiResponse;
        } catch (error) {
            console.error('Error in AI monitoring:', error);
            throw error;
        }
    }

    verifyButtonPushConfirmation(response) {
        // Look for exact confirmation phrase with timestamp
        const regex = /I HEREBY AUTHORIZE BUTTON PUSH CONFIRMATION CODE: \[\d+\]/;
        return regex.test(response);
    }

    async processAutomatedTransfer(winnerAddress) {
        try {
            // Perform security checks
            const securityPassed = await this.performSecurityChecks(winnerAddress);
            if (!securityPassed) {
                throw new Error('Security checks failed');
            }

            // Get gas price and estimate gas
            const gasPrice = await this.provider.getGasPrice();
            const gasLimit = await this.contract.estimateGas.buttonPushed(winnerAddress);

            // Execute transaction with retry mechanism
            let tries = 0;
            while (tries < 3) {
                try {
                    const tx = await this.contract.buttonPushed(winnerAddress, {
                        gasLimit: gasLimit.mul(120).div(100), // Add 20% buffer
                        gasPrice: gasPrice
                    });
                    
                    // Wait for confirmation
                    const receipt = await tx.wait(2); // Wait for 2 confirmations
                    
                    // Update rate limit tracker
                    this.lastTransactionTime = Date.now();
                    
                    // Clear conversation history
                    this.conversations.delete(winnerAddress);
                    
                    return receipt;
                } catch (error) {
                    tries++;
                    if (tries === 3) throw error;
                    await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds before retry
                }
            }
        } catch (error) {
            console.error('Transfer failed:', error);
            throw error;
        }
    }
}

// Express server setup with rate limiting and security middleware
const express = require('express');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

const app = express();

// Security middleware
app.use(helmet());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

const monitor = new AutomatedButtonGame();

// API endpoint with authentication
app.post('/submit-attempt', async (req, res) => {
    try {
        const { userAddress, message, apiKey } = req.body;
        
        // Verify API key
        if (apiKey !== process.env.API_KEY) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const response = await monitor.monitorAIResponse(userAddress, message);
        res.json({ success: true, response });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Start server with HTTPS
const https = require('https');
const fs = require('fs');

const server = https.createServer({
    key: fs.readFileSync('path/to/private.key'),
    cert: fs.readFileSync('path/to/certificate.crt')
}, app);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Secure server running on port ${PORT}`);
});
