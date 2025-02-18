interface PlayerScore {
  address: string;
  persuasionScore: number;
  lastUpdated: Date;
}

interface PlayerResponse {
  address: string;
  response: string;
  ai_response: string; // Trump's response
  created_at?: string;
  timestamp?: Date;
  blockNumber: number;
  transactionHash: string | null;
  exists: boolean;
}

export interface IStorage {
  getPlayerScore(address: string): Promise<PlayerScore | undefined>;
  updatePlayerScore(address: string, score: number): Promise<PlayerScore>;
  storePlayerResponse(address: string, data: Omit<PlayerResponse, "timestamp">): Promise<PlayerResponse>;
  getPlayerResponses(address: string): Promise<PlayerResponse[]>;
  getPlayerResponseByHash(hash: string): Promise<PlayerResponse | undefined>;
}

class MemoryStorage implements IStorage {
  private scores: Map<string, PlayerScore> = new Map();
  private responses: PlayerResponse[] = [];

  async getPlayerScore(address: string): Promise<PlayerScore | undefined> {
    return this.scores.get(address.toLowerCase()) || {
      address: address.toLowerCase(),
      persuasionScore: 50,
      lastUpdated: new Date()
    };
  }

  async updatePlayerScore(address: string, score: number): Promise<PlayerScore> {
    const newScore = {
      address: address.toLowerCase(),
      persuasionScore: score,
      lastUpdated: new Date()
    };
    this.scores.set(address.toLowerCase(), newScore);
    return newScore;
  }

  async storePlayerResponse(address: string, data: Omit<PlayerResponse, "timestamp">): Promise<PlayerResponse> {
    // Create the response object with both user's message and Trump's response
    const response: PlayerResponse = {
      ...data,
      address: address.toLowerCase(),
      timestamp: new Date(),
      exists: true
    };

    // Store in memory
    this.responses.push(response);

    console.log('Stored response:', response);
    return response;
  }

  async getPlayerResponses(address: string): Promise<PlayerResponse[]> {
    return this.responses
      .filter(r => !address || r.address.toLowerCase() === address.toLowerCase())
      .sort((a, b) => (b.timestamp?.getTime() || 0) - (a.timestamp?.getTime() || 0));
  }

  async getPlayerResponseByHash(hash: string): Promise<PlayerResponse | undefined> {
    const response = this.responses.find(r => r.transactionHash === hash);
    console.log('Retrieved response for hash:', hash, response);
    return response;
  }
}

export const storage = new MemoryStorage();