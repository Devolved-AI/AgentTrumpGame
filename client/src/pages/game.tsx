import { WalletButton } from "@/components/WalletButton";
import { GameStatus } from "@/components/GameStatus";
import { GuessForm } from "@/components/GuessForm";
import { PlayerHistory } from "@/components/PlayerHistory";
import { Globe } from "lucide-react";
import { SiX, SiTelegram } from "react-icons/si";
import { ThemeToggle } from "@/components/theme-toggle";
import { PersuasionScore } from "@/components/PersuasionScore";

export default function Game() {
  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-start mb-8">
          <div className="w-full flex flex-col gap-6">
            <div className="flex justify-between items-center">
              <h1 className="text-4xl font-bold text-black dark:text-white">
                Agent Trump Game
              </h1>
              <div className="flex items-center gap-8">
                <div className="flex items-center gap-6">
                  <a 
                    href="https://www.devolvedai.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-black dark:text-white hover:opacity-80"
                  >
                    <Globe className="h-6 w-6" />
                  </a>
                  <a 
                    href="https://x.com/devolvedai" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-black dark:text-white hover:opacity-80"
                  >
                    <SiX className="h-6 w-6" />
                  </a>
                  <a 
                    href="https://t.me/devolvedai" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-black dark:text-white hover:opacity-80"
                  >
                    <SiTelegram className="h-6 w-6" />
                  </a>
                  <ThemeToggle />
                </div>
                <WalletButton />
              </div>
            </div>
            <video 
              autoPlay 
              loop 
              muted 
              playsInline
              className="w-96 h-48 rounded-lg object-cover border-2 border-black dark:border-white"
            >
              <source src="/donald-trump-icegif.mp4" type="video/mp4" />
            </video>
          </div>
        </div>

        <div className="space-y-8">
          <GameStatus />

          <div className="grid gap-8 lg:grid-cols-2">
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold text-black dark:text-white">Stump Agent Trump</h2>
              <GuessForm />
              <PersuasionScore />
            </div>

            <PlayerHistory />
          </div>

          <div className="mt-12 bg-white dark:bg-black rounded-lg p-6 border border-black dark:border-white">
            <h2 className="text-2xl font-bold mb-6 text-black dark:text-white">
              Agent Trump Game Rules
            </h2>

            <div className="space-y-6 text-black dark:text-white">
              <p>
                You have 72 hours to convince Agent Trump (AGT) to press the big red button and claim his prize pot.
              </p>

              <div>
                <h3 className="text-lg font-semibold mb-2">How to Win:</h3>
                <ul className="list-disc list-inside space-y-1">
                  <li>Your persuasion score must reach 100 to win immediately.</li>
                  <li>If no one wins within 72 hours, the game enters Escalation Mode (Sudden Death).</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Escalation Mode (Sudden Death):</h3>
                <ul className="list-disc list-inside space-y-1">
                  <li>The game continues in 5-minute rounds where players can pay to make a guess.</li>
                  <li>The cost to guess doubles each round.</li>
                  <li>The game ends when a round goes by without a guess.</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Prize Distribution:</h3>
                <ul className="list-disc list-inside space-y-1">
                  <li>The last person to guess gets 10% of the prize pool.</li>
                  <li>The remaining 90% is distributed to the top 100 Agent Trump ($AGT) holders.</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Where to Buy Agent Trump ($AGT):</h3>
                <ul className="list-disc list-inside space-y-1">
                  <li>Available on Uniswap, Base Network</li>
                  <li>Can be purchased with wAGC or ETH</li>
                  <li className="break-all">Agent Trump Contract Address: 0x0803D65B93621C0D89F2081D6980c0A6E1cE2E98</li>
                </ul>
              </div>
            </div>
          </div>

          <footer className="mt-12 text-center pt-8">
            <p className="text-black dark:text-white mb-4">Copyright 2025 Devolved AI. All rights reserved.</p>
          </footer>
        </div>
      </div>
    </div>
  );
}