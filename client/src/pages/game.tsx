import { WalletButton } from "@/components/WalletButton";
import { GameStatus } from "@/components/GameStatus";
import { GuessForm } from "@/components/GuessForm";
import { PlayerHistory } from "@/components/PlayerHistory";

export default function Game() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-start mb-8">
          <div className="w-full flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-500 to-blue-700 bg-clip-text text-transparent mb-4">
                Agent Trump Game
              </h1>
              <video 
                autoPlay 
                loop 
                muted 
                playsInline
                className="w-96 h-48 rounded-lg object-cover border-2 border-blue-500/20"
              >
                <source src="/donald-trump-icegif.mp4" type="video/mp4" />
              </video>
            </div>
            <WalletButton />
          </div>
        </div>

        <div className="space-y-8">
          <GameStatus />

          <div className="grid gap-8 lg:grid-cols-2">
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold">Stump Agent Trump</h2>
              <GuessForm />
            </div>

            <PlayerHistory />
          </div>

          <div className="mt-12 bg-card rounded-lg p-6 border border-border/50">
            <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-blue-500 to-blue-700 bg-clip-text text-transparent">
              Agent Trump Game Rules
            </h2>

            <div className="space-y-6 text-card-foreground">
              <p className="text-muted-foreground">
                You have 72 hours to convince Agent Trump (AGT) to press the big red button and claim his prize pot.
              </p>

              <div>
                <h3 className="text-lg font-semibold mb-2">How to Win:</h3>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Your persuasion score must reach 100 to win immediately.</li>
                  <li>If no one wins within 72 hours, the game enters Escalation Mode (Sudden Death).</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Escalation Mode (Sudden Death):</h3>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>The game continues in 5-minute rounds where players can pay to make a guess.</li>
                  <li>The cost to guess doubles each round.</li>
                  <li>The game ends when a round goes by without a guess.</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Prize Distribution:</h3>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>The last person to guess gets 10% of the prize pool.</li>
                  <li>The remaining 90% is distributed to the top 100 Agent Trump ($AGT) holders.</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Where to Buy Agent Trump ($AGT):</h3>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Available on Uniswap, Base Network</li>
                  <li>Can be purchased with wAGC or ETH</li>
                  <li className="break-all">Agent Trump Contract Address: 0x0803D65B93621C0D89F2081D6980c0A6E1cE2E98</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}