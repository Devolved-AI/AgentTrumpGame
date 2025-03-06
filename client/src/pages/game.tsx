import { WalletButton } from "@/components/WalletButton";
import { GameStatus } from "@/components/GameStatus";
import { GuessForm } from "@/components/GuessForm";
import { Globe } from "lucide-react";
import { SiX, SiTelegram, SiEthereum } from "react-icons/si";
import { ThemeToggle } from "@/components/theme-toggle";
import { PersuasionScore } from "@/components/PersuasionScore";
import { useQuery } from "@tanstack/react-query";
import { GameOverDialog } from "@/components/GameOverDialog";
import { useWeb3Store } from "@/lib/web3";
import { useState } from 'react';

const fetchEthPrice = async () => {
  const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
  const data = await response.json();
  return data.ethereum.usd;
};

export default function Game() {
  const { data: ethPrice = 0 } = useQuery({
    queryKey: ['ethPrice'],
    queryFn: fetchEthPrice,
    refetchInterval: 60000,
  });

  const { address, isInitialized } = useWeb3Store();
  const [gameOver, setGameOver] = useState(false);

  const guessPrice = 0.0018;
  const guessPriceUsd = (guessPrice * ethPrice).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD'
  });

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <GameOverDialog />
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-start mb-8">
          <div className="w-full flex flex-col gap-6">
            <div className="flex justify-between items-center w-full">
              <h1 className="text-2xl font-bold text-black dark:text-white">
                Agent Trump Game
              </h1>

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

            {address && isInitialized && (
              <div className="flex gap-8 items-start">
                <video 
                  autoPlay 
                  loop 
                  muted 
                  playsInline
                  className="w-96 h-48 rounded-lg object-cover border-2 border-black dark:border-white"
                >
                  <source src="/donald-trump-icegif.mp4" type="video/mp4" />
                </video>
                <div className="flex-1">
                  <GameStatus showPrizePoolOnly={true} />
                </div>
              </div>
            )}
          </div>
        </div>

        {address && isInitialized ? (
          <div className="space-y-8">
            <div className="grid grid-cols-3 gap-4">
              <PersuasionScore />
              <GameStatus showTimeRemainingOnly={true} onTimerEnd={() => setGameOver(true)} />
              <GameStatus showLastGuessOnly={true} />
            </div>

            <div className="space-y-4">
              <GuessForm onTimerEnd={() => setGameOver(true)}/>
            </div>

            <div className="mt-12 bg-white dark:bg-black rounded-lg p-6 border border-black dark:border-white">
              <h2 className="text-2xl font-bold mb-6 text-black dark:text-white">
                Agent Trump Game Rules
              </h2>

              <div className="space-y-6 text-black dark:text-white">
                <p className="font-bold uppercase flex items-center gap-2">
                  THE COST TO SUBMIT A GUESS IS <SiEthereum className="h-5 w-5" /> {guessPrice} ({guessPriceUsd}).
                </p>

                <p>
                  You have 72 hours to convince Agent Trump (AGT) to give the Prize Pool Money to you.
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
                    <li>The game enters a single 5-minute final round.</li>
                    <li>The cost to guess doubles during this round (2x the normal price).</li>
                    <li>When the timer reaches 0:00, the game ends for everyone.</li>
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
                    <li>Available on <a 
                      href="https://app.uniswap.org/swap?outputCurrency=0x0803d65b93621c0d89f2081d6980c0a6e1ce2e98&chain=base"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-500"
                    >Uniswap, Base Network</a></li>
                    <li>Can be purchased with wAGC or ETH</li>
                    <li className="break-all">Agent Trump Contract Address: 0x0803d65b93621c0d89f2081d6980c0a6e1ce2e98</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-6 mt-12">
            <p className="text-xl text-black dark:text-white text-center">
              Connect your wallet to play Agent Trump Game
            </p>
          </div>
        )}

        <footer className="mt-12 text-center pt-8">
          <p className="text-black dark:text-white mb-4">Copyright 2025 Devolved AI. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}