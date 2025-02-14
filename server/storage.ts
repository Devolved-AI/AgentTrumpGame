interface PlayerScore {
  address: string;
  persuasionScore: number;
  lastUpdated: Date;
}

interface PlayerResponse {
  address: string;
  response: string;
  timestamp: Date;
  blockNumber: number;
  transactionHash: string | null;
  exists: boolean;
}

export interface IStorage {
  getPlayerScore(address: string): Promise<PlayerScore | undefined>;
  updatePlayerScore(address: string, score: number): Promise<PlayerScore>;
  addPlayerResponse(data: PlayerResponse): Promise<PlayerResponse>;
  getPlayerResponses(address: string): Promise<PlayerResponse[]>;
  getResponseByHash(hash: string): Promise<PlayerResponse | undefined>;
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

  async addPlayerResponse(data: PlayerResponse): Promise<PlayerResponse> {
    const response = {
      ...data,
      address: data.address.toLowerCase(),
      timestamp: new Date(),
      exists: true
    };
    this.responses.push(response);
    return response;
  }

  async getPlayerResponses(address: string): Promise<PlayerResponse[]> {
    return this.responses
      .filter(r => !address || r.address.toLowerCase() === address.toLowerCase())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async getResponseByHash(hash: string): Promise<PlayerResponse | undefined> {
    return this.responses.find(r => r.transactionHash === hash);
  }
}

export const storage = new MemoryStorage();