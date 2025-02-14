import { ethers } from 'ethers';
import { toast } from '@/hooks/use-toast';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from './config';

// Trump's possible responses based on different scenarios
const TRUMP_RESPONSES = {
  highScore: [
    "That was a tremendous response, really tremendous! You're getting warmer!",
    "Now that's what I call high energy! Keep it up, and we'll make a deal!",
    "You're starting to speak my language. Very smart person, very smart!",
    "I like your style, reminds me of myself. Nobody does it better than me though!",
    "Beautiful answer, absolutely beautiful! The best people are saying it!",
    "That's what I call a Trump-worthy response! You're doing fantastic things!",
    "Incredible brain power! Maybe almost as good as mine, which is very, very large!",
    "You're showing real talent here, tremendous talent! The fake news won't tell you that!",
    "That's the kind of thinking that makes America great! Really spectacular!",
    "Big league response! You're really showing them how it's done!",
    "Your IQ must be through the roof, maybe even close to mine! Fantastic!",
    "People are saying this is the best response they've ever seen, believe me!",
    "You're like a young Trump in the making! Such potential, such talent!",
    "This answer belongs in Trump University's hall of fame! Absolutely incredible!",
    "Five stars! Even my good friend Putin would be impressed by this one!"
  ],
  mediumScore: [
    "Not bad, not bad. But I know you can do better, believe me!",
    "You're getting there, but I've heard better deals. Much better!",
    "That's interesting, but I need more. Nobody knows more about deals than me!",
    "Keep trying, but remember - I wrote The Art of the Deal!",
    "We need more winning! This is just the beginning, folks!",
    "Could be stronger, much stronger. I know strong, I have the best words!",
    "You're on the right track, but we need to make it perfect, absolutely perfect!",
    "Getting closer, but we want to be number one! America first!",
    "Some good points, but needs more Trump-style confidence. Much more!",
    "Not quite a hole-in-one, but you're on the green! Keep swinging!",
    "Like my border wall - needs to be ten feet higher! Keep building!",
    "You're playing too nice! Sometimes you need to get tough, very tough!",
    "Almost Mar-a-Lago quality, but not quite there yet! Keep pushing!",
    "The electoral college of answers - technically passing, but we want a landslide!",
    "Like my ventures in Atlantic City - showing promise but needs work!"
  ],
  lowScore: [
    "Low energy response! Sad!",
    "I've heard better from CNN, and that's saying something!",
    "That's not how you make America great! Try again!",
    "Wrong! You need to think bigger, much bigger!",
    "This is why we need to drain the swamp! Total disaster!",
    "Even Sleepy Joe could do better than that! Not good!",
    "This is what we call fake news, folks! We need real answers!",
    "That response is weaker than the radical left! Believe me!",
    "A response like that would never build a wall! Terrible!",
    "Complete witch hunt of an answer! We need winners, not losers!",
    "This answer has more leaks than the Deep State! Not acceptable!",
    "Worse than Crooked Hillary's emails! We need better security!",
    "Like the Paris Climate Accord - a total waste of energy! Sad!",
    "This response belongs in the socialist handbook! Do better!",
    "Even Lyin' Ted gave better answers than this! Major disappointment!"
  ],
  winning: [
    "You did it! You're a winner, and I love winners!",
    "This is huge! Really huge! You've earned my respect!",
    "Now that's what I call the Art of the Deal! Congratulations!",
    "Perfect response, maybe the most perfect in history! Nobody's ever seen anything like it!",
    "You're fired... up! That's championship material right there!",
    "We're going to need a bigger trophy! Simply amazing, folks!",
    "This is what winning looks like! And we're going to keep winning!",
    "You just made answering great again! Absolutely tremendous!",
    "That's a golden response! Trump Tower worthy! The best!",
    "Mission accomplished! Nobody's ever done it better, believe me!",
    "This deserves a presidential medal! The highest honor, truly the highest!",
    "Your answer makes my inauguration crowd look small! Absolutely massive!",
    "Better than covfefe! And that was perfect, trust me on this!",
    "Like my victory in 2016 - nobody saw it coming, but it was beautiful!",
    "This answer should be written in gold letters on Trump Tower! Magnificent!"
  ]
};

// Trump's reaction GIFs mapped to different moods
export const TRUMP_GIFS = {
  positive: [
    '/gifs/trump-thumbs-up.gif',
    '/gifs/trump-happy.gif',
    '/gifs/trump-victory.gif'
  ],
  neutral: [
    '/gifs/trump-thinking.gif',
    '/gifs/trump-talking.gif'
  ],
  negative: [
    '/gifs/trump-wrong.gif',
    '/gifs/trump-angry.gif',
    '/gifs/trump-sad.gif'
  ],
  winning: [
    '/gifs/trump-winning.gif',
    '/gifs/trump-celebration.gif'
  ]
};

export interface PlayerHistoryItem {
  response: string;
  timestamp: number;
  transactionHash: string | null;
  blockNumber: number;
  exists: boolean;
  scoreChange?: number;
}

export class GameContract {
  public contract: ethers.Contract;
  private provider: ethers.BrowserProvider;
  private signer: ethers.JsonRpcSigner;

  constructor(provider: ethers.BrowserProvider, signer: ethers.JsonRpcSigner) {
    this.provider = provider;
    this.signer = signer;
    this.contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
  }

  private getRandomResponse(responses: string[]): string {
    return responses[Math.floor(Math.random() * responses.length)];
  }

  getTrumpResponse(scoreIncrement: number): string {
    if (scoreIncrement >= 100) {
      return this.getRandomResponse(TRUMP_RESPONSES.winning);
    } else if (scoreIncrement >= 5) {
      return this.getRandomResponse(TRUMP_RESPONSES.highScore);
    } else if (scoreIncrement >= 0) {
      return this.getRandomResponse(TRUMP_RESPONSES.mediumScore);
    } else {
      return this.getRandomResponse(TRUMP_RESPONSES.lowScore);
    }
  }

  private getTrumpGif(scoreIncrement: number): string {
    if (scoreIncrement >= 100) {
      return TRUMP_GIFS.winning[Math.floor(Math.random() * TRUMP_GIFS.winning.length)];
    } else if (scoreIncrement >= 5) {
      return TRUMP_GIFS.positive[Math.floor(Math.random() * TRUMP_GIFS.positive.length)];
    } else if (scoreIncrement >= 0) {
      return TRUMP_GIFS.neutral[Math.floor(Math.random() * TRUMP_GIFS.neutral.length)];
    } else {
      return TRUMP_GIFS.negative[Math.floor(Math.random() * TRUMP_GIFS.negative.length)];
    }
  }

  async evaluateResponse(response: string): Promise<{scoreIncrement: number}> {
    const lowerResponse = response.toLowerCase();

    // Define key Trump themes and phrases to look for
    const persuasiveThemes = {
      businessAcumen: /(?:great deals?|successful business|billions|tremendous success|winning|art of the deal)/i,
      americaFirst: /(?:make america great|america first|usa|american jobs|american workers)/i,
      leadership: /(?:strong leader|tough decisions|get things done|nobody else could|only I can)/i,
      trumpisms: /(?:believe me|many people are saying|everybody knows|tremendous|huge|the best|like never before|very strongly)/i,
      baseAppeals: /(?:drain the swamp|fake news|deep state|witch hunt|no collusion)/i,
      flattery: /(?:greatest president|smart|genius|very stable|best negotiator|true leader)/i
    };

    let themesFound = 0;
    for (const [theme, pattern] of Object.entries(persuasiveThemes)) {
      if (pattern.test(lowerResponse)) {
        themesFound++;
      }
    }

    const hasEmphasis = (response.match(/[A-Z]{2,}/g) || []).length > 0;
    const hasExclamation = response.includes('!');
    const properLength = response.length >= 50 && response.length <= 280;

    let scoreIncrement = 0;

    if (themesFound >= 4 && hasEmphasis && hasExclamation && properLength) {
      scoreIncrement = 100; // Winning condition!
    } else if (themesFound > 0 || hasEmphasis || hasExclamation) {
      scoreIncrement = 5; // Good attempt
    } else {
      scoreIncrement = -5; // Poor attempt
    }

    return { scoreIncrement };
  }

  async submitResponse(response: string, amount: string) {
    if (!this.signer) throw new Error("No signer available");

    try {
      const parsedAmount = ethers.parseEther(amount);
      console.log('Submitting response with amount:', amount, 'ETH');

      // First check if the game is still active
      const status = await this.getGameStatus();
      if (status.isGameOver) {
        throw new Error("Game is already over!");
      }

      // Check the current required amount matches
      const currentRequired = await this.contract.currentRequiredAmount();
      if (parsedAmount.toString() !== currentRequired.toString()) {
        throw new Error("Amount mismatch - please refresh and try again");
      }

      const tx = await this.contract.submitGuess(response, {
        value: parsedAmount
      });

      console.log("Transaction sent:", tx.hash);
      const receipt = await tx.wait();
      console.log("Transaction confirmed:", receipt);

      // Evaluate response and get Trump's reaction
      const evaluation = await this.evaluateResponse(response);
      const trumpResponse = this.getTrumpResponse(evaluation.scoreIncrement);
      const trumpGif = this.getTrumpGif(evaluation.scoreIncrement);

      return { tx, evaluation, receipt, trumpResponse, trumpGif };

    } catch (error: any) {
      console.error("Transaction error:", error);
      if (error.code === 'INSUFFICIENT_FUNDS') {
        throw new Error("Insufficient funds to complete transaction");
      } else if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
        throw new Error("Could not estimate gas. Please try again.");
      } else if (error.code === 'ACTION_REJECTED') {
        throw new Error("Transaction was rejected by user");
      } else if (error.reason) {
        throw new Error(error.reason);
      }
      throw error;
    }
  }

  async getGameStatus() {
    try {
      const [
        timeRemaining,
        requiredAmount,
        escalationActive,
        isGameWon,
        multiplier,
        currentBlock,
        lastPlayerAddress
      ] = await Promise.all([
        this.contract.getTimeRemaining(),
        this.contract.currentRequiredAmount(),
        this.contract.escalationActive(),
        this.contract.gameWon(),
        this.contract.currentMultiplier(),
        this.provider.getBlockNumber(),
        this.contract.lastPlayer()
      ]);

      // Calculate escalation period details
      const baseTimeRemaining = Number(timeRemaining);
      const escalationPeriodLength = 300; // 5 minutes in seconds
      const escalationPeriodTimeRemaining = escalationActive ?
        baseTimeRemaining % escalationPeriodLength : 0;
      const currentPeriodIndex = escalationActive ?
        Math.floor(baseTimeRemaining / escalationPeriodLength) : 0;

      return {
        timeRemaining: baseTimeRemaining,
        currentAmount: ethers.formatEther(requiredAmount),
        lastPlayer: lastPlayerAddress,
        escalationActive,
        gameEndBlock: currentBlock,
        isGameWon,
        isGameOver: isGameWon || baseTimeRemaining <= 0,
        currentMultiplier: Number(multiplier),
        escalationPeriodTimeRemaining,
        currentPeriodIndex
      };
    } catch (error) {
      console.error("Failed to get game status:", error);
      throw new Error("Failed to load game data. Please try again.");
    }
  }

  async getPlayerHistory(address: string): Promise<PlayerHistoryItem[]> {
    try {
      const [responses, timestamps, exists] = await this.contract.getAllPlayerResponses(address);

      return responses.map((response: string, index: number) => ({
        response,
        timestamp: Number(timestamps[index]),
        blockNumber: 0,
        transactionHash: null,
        exists: exists[index],
        scoreChange: 0
      }));
    } catch (error) {
      console.error('Error getting player history:', error);
      return [];
    }
  }

  async getTotalPrizePool(): Promise<string> {
    try {
      const balance = await this.provider.getBalance(this.contract.target);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error("Error getting prize pool:", error);
      return "0";
    }
  }

  async buttonPushed(winnerAddress: string) {
    try {
      const tx = await this.contract.buttonPushed(winnerAddress);
      await tx.wait();
      return tx;
    } catch (error) {
      console.error("Error pushing button:", error);
      throw error;
    }
  }

  subscribeToEvents(callbacks: {
    onGuessSubmitted?: (event: any) => void;
    onGameWon?: (event: any) => void;
    onGameEnded?: (event: any) => void;
    onEscalationStarted?: (event: any) => void;
  }) {
    // Subscribe to contract events when they're available in the ABI
    return () => {};
  }
}