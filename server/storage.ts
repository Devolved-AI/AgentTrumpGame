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
    console.log('Getting score for address:', address);
    return this.scores.get(address.toLowerCase()) || {
      address: address.toLowerCase(),
      persuasionScore: 50,
      lastUpdated: new Date()
    };
  }

  async updatePlayerScore(address: string, score: number): Promise<PlayerScore> {
    console.log('Updating score for address:', address, 'to:', score);
    const newScore = {
      address: address.toLowerCase(),
      persuasionScore: score,
      lastUpdated: new Date()
    };
    this.scores.set(address.toLowerCase(), newScore);
    return newScore;
  }

  async storePlayerResponse(address: string, data: Omit<PlayerResponse, "timestamp">): Promise<PlayerResponse> {
    const addressLower = address.toLowerCase();
    console.log('Storing response for address:', addressLower);

    if (!data.transactionHash) {
        console.error('Transaction hash is missing');
        throw new Error('Transaction hash is required for storing response');
    }

    // Create the response object with all required fields
    const response: PlayerResponse = {
        ...data,
        address: addressLower,
        timestamp: new Date(),
        exists: true,
        transactionHash: data.transactionHash // This is now guaranteed to be non-null
    };

    console.log('Storing response with hash:', response.transactionHash);
    console.log('Response data:', JSON.stringify(response, null, 2));

    // Store by transaction hash
    this.responses.set(response.transactionHash, response);

    // Store transaction hash in address's response list
    const txHashes = this.addressResponses.get(addressLower) || [];
    txHashes.push(response.transactionHash);
    this.addressResponses.set(addressLower, txHashes);

    return response;
  }

  async getPlayerResponses(address: string): Promise<PlayerResponse[]> {
    const addressLower = address.toLowerCase();
    console.log('Getting responses for address:', addressLower);

    const txHashes = this.addressResponses.get(addressLower) || [];
    console.log('Found transaction hashes:', txHashes);

    const responses = txHashes
      .map(hash => {
        const response = this.responses.get(hash);
        if (response) {
          console.log('Found response for hash:', hash);
          return response;
        }
        return undefined;
      })
      .filter((r): r is PlayerResponse => r !== undefined)
      .sort((a, b) => (b.timestamp?.getTime() || 0) - (a.timestamp?.getTime() || 0));

    console.log('Retrieved responses:', responses.length);
    return responses;
  }

  async getPlayerResponseByHash(hash: string): Promise<PlayerResponse | undefined> {
    console.log('Looking up response for hash:', hash);
    const response = this.responses.get(hash);
    if (response) {
      console.log('Found stored response:', JSON.stringify(response, null, 2));
      return response;
    }
    console.log('No response found for hash:', hash);
    return undefined;
  }
}

export const storage = new MemoryStorage();