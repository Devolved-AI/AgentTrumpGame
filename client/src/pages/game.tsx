import { WalletButton } from "@/components/WalletButton";
import { GameStatus } from "@/components/GameStatus";
import { GuessForm } from "@/components/GuessForm";
import { Globe, ExternalLink } from "lucide-react";
import { SiX, SiTelegram, SiEthereum } from "react-icons/si";
import { ThemeToggle } from "@/components/theme-toggle";
import { PersuasionScore } from "@/components/PersuasionScore";
import { GameOverDialog } from "@/components/GameOverDialog";
import { useWeb3Store } from "@/lib/web3";
import { useState } from 'react';
import { useEthPrice } from "@/lib/ethPrice";

export default function Game() {
  const { data: ethPrice = 0 } = useEthPrice();

  const { address, isInitialized } = useWeb3Store();
  const [gameOver, setGameOver] = useState(false);

  const guessPrice = 0.0009;
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
              <div className="flex flex-col w-full">
                <div className="w-full text-center mb-4">
                  <p className="font-bold text-black dark:text-white text-lg">
                    This round is sponsored by Devolved AI{" "}
                    <a 
                      href="https://www.devolvedai.com" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center hover:opacity-80"
                    >
                      <ExternalLink className="ml-1 h-4 w-4" />
                    </a>
                  </p>
                </div>
                
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
              </div>
            )}
          </div>
        </div>

        {address && isInitialized ? (
          <div className="space-y-8">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-semibold text-black dark:text-white">Game Status</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <PersuasionScore />
              <GameStatus showTimeRemainingOnly={true} onTimerEnd={() => setGameOver(true)} />
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
                  You have 72 hours (3 days) to convince Agent Trump (AGT) to give the Prize Pool Money to you. Can you do it?
                </p>

                <div>
                  <h3 className="text-lg font-semibold mb-2">How to Win:</h3>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Your persuasion score must reach 100 to win immediately.</li>
                    <li>If no one wins within 72 hours, the game ends for everyone.</li>
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
                      href="https://app.uniswap.org/swap?chain=base&inputCurrency=ETH&outputCurrency=0x0803D65B93621C0D89F2081D6980c0A6E1cE2E98"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-500"
                    >Uniswap, Base Network</a></li>
                    <li>Can be purchased with wAGC or ETH</li>
                    <li className="break-all">Agent Trump Contract Address: 0x0803D65B93621C0D89F2081D6980c0A6E1cE2E98</li>
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