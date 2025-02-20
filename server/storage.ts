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
    const transactionHashLower = data.transactionHash?.toLowerCase() || 'no-hash';

    console.log('Storing response:', {
      address: addressLower,
      transactionHash: transactionHashLower,
      response: data.response,
      ai_response: data.ai_response,
      timestamp: new Date().toISOString()
    });

    // Create the response object with all required fields
    const response: PlayerResponse = {
      ...data,
      address: addressLower,
      timestamp: new Date(),
      exists: true,
      transactionHash: transactionHashLower
    };

    // Store by normalized transaction hash
    this.responses.set(transactionHashLower, response);

    // Store transaction hash in address's response list
    const txHashes = this.addressResponses.get(addressLower) || [];
    if (!txHashes.includes(transactionHashLower)) {
      txHashes.push(transactionHashLower);
      this.addressResponses.set(addressLower, txHashes);
    }

    // Verify storage immediately
    const verifiedResponse = this.responses.get(transactionHashLower);
    if (!verifiedResponse) {
      console.error('Failed to verify stored response:', {
        transactionHash: transactionHashLower,
        storedResponses: Array.from(this.responses.keys())
      });
      throw new Error('Response verification failed - not found after storage');
    }

    console.log('Response stored and verified:', {
      transactionHash: transactionHashLower,
      verified: !!verifiedResponse
    });

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
        console.log('No response found for hash:', hash);
        return undefined;
      })
      .filter((r): r is PlayerResponse => r !== undefined)
      .sort((a, b) => (b.timestamp?.getTime() || 0) - (a.timestamp?.getTime() || 0));

    console.log('Retrieved responses:', responses.length);
    return responses;
  }

  async getPlayerResponseByHash(hash: string): Promise<PlayerResponse | undefined> {
    const hashLower = hash.toLowerCase();
    console.log('Looking up response for hash:', hashLower);
    console.log('Available hashes:', Array.from(this.responses.keys()));

    const response = this.responses.get(hashLower);
    if (response) {
      console.log('Found stored response:', {
        hash: hashLower,
        response: response.response,
        ai_response: response.ai_response,
        timestamp: response.timestamp
      });
      return response;
    }

    console.log('No response found for hash:', hashLower);
    return undefined;
  }
}

export const storage = new MemoryStorage();