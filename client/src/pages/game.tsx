import { WalletButton } from "@/components/WalletButton";
import { GameStatus } from "@/components/GameStatus";
import { GuessForm } from "@/components/GuessForm";
import { PlayerHistory } from "@/components/PlayerHistory";

export default function Game() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-500 to-blue-700 bg-clip-text text-transparent">
            Agent Trump Game
          </h1>
          <WalletButton />
        </div>

        <div className="space-y-8">
          <GameStatus />
          
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold">Submit Your Guess</h2>
              <GuessForm />
            </div>
            
            <PlayerHistory />
          </div>
        </div>
      </div>
    </div>
  );
}
