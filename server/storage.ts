import { 
  playerScores, 
  playerResponses,
  type InsertPlayerScore,
  type InsertPlayerResponse,
  type PlayerScore,
  type PlayerResponse
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  getPlayerScore(address: string): Promise<PlayerScore | undefined>;
  updatePlayerScore(address: string, score: number): Promise<PlayerScore>;
  addPlayerResponse(data: InsertPlayerResponse): Promise<PlayerResponse>;
  getPlayerResponses(address: string): Promise<PlayerResponse[]>;
}

export class DatabaseStorage implements IStorage {
  async getPlayerScore(address: string): Promise<PlayerScore | undefined> {
    const [score] = await db
      .select()
      .from(playerScores)
      .where(eq(playerScores.address, address));
    return score || { address, persuasionScore: 50, lastUpdated: new Date() };
  }

  async updatePlayerScore(address: string, score: number): Promise<PlayerScore> {
    const existingScore = await this.getPlayerScore(address);

    if (existingScore) {
      const [updated] = await db
        .update(playerScores)
        .set({ 
          persuasionScore: score,
          lastUpdated: new Date()
        })
        .where(eq(playerScores.address, address))
        .returning();
      return updated;
    } else {
      const [newScore] = await db
        .insert(playerScores)
        .values({
          address,
          persuasionScore: score
        })
        .returning();
      return newScore;
    }
  }

  async addPlayerResponse(data: InsertPlayerResponse): Promise<PlayerResponse> {
    const [response] = await db
      .insert(playerResponses)
      .values(data)
      .returning();
    return response;
  }

  async getPlayerResponses(address: string): Promise<PlayerResponse[]> {
    return db
      .select()
      .from(playerResponses)
      .where(eq(playerResponses.address, address));
  }
}

export const storage = new DatabaseStorage();