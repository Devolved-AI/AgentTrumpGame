interface PlayerScore {
  address: string;
  persuasionScore: number;
  lastUpdated: Date;
}

interface PlayerResponse {
  address: string;
  response: string;
  ai_response: string;
  created_at?: string;
  timestamp?: Date;
  blockNumber: number;
  transactionHash: string | null;
  exists: boolean;
  score?: number;
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
  private responses: Map<string, PlayerResponse> = new Map();
  private addressResponses: Map<string, string[]> = new Map();

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
    // Create the response object
    const response: PlayerResponse = {
      ...data,
      address: address.toLowerCase(),
      timestamp: new Date(),
      exists: true
    };

    // Store by transaction hash
    if (response.transactionHash) {
      console.log('Storing response with hash:', response.transactionHash);
      this.responses.set(response.transactionHash, response);

      // Store transaction hash in address's response list
      const addressLower = address.toLowerCase();
      const txHashes = this.addressResponses.get(addressLower) || [];
      txHashes.push(response.transactionHash);
      this.addressResponses.set(addressLower, txHashes);
    }

    console.log('Stored response:', response);
    return response;
  }

  async getPlayerResponses(address: string): Promise<PlayerResponse[]> {
    const addressLower = address.toLowerCase();
    const txHashes = this.addressResponses.get(addressLower) || [];
    const responses = txHashes
      .map(hash => this.responses.get(hash))
      .filter((r): r is PlayerResponse => r !== undefined)
      .sort((a, b) => (b.timestamp?.getTime() || 0) - (a.timestamp?.getTime() || 0));

    return responses;
  }

  async getPlayerResponseByHash(hash: string): Promise<PlayerResponse | undefined> {
    const response = this.responses.get(hash);
    console.log('Retrieved response for hash:', hash, response);
    return response;
  }
}

export const storage = new MemoryStorage();