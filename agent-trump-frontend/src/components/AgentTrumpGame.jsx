import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import trumpImage from '../assets/trump-button.jpg';

// Contract ABI - Include only the functions we need
const CONTRACT_ABI = [
  "function submitGuess(string calldata response) external payable",
  "function getTimeRemaining() external view returns (uint256)",
  "function getCurrentRequiredAmount() external pure returns (uint256)",
  "function gameWon() external view returns (bool)"
];

const CONTRACT_ADDRESS = "0xF266Bf187f909A8A8fB66F2eddC342Df676110C7";
const GAME_FEE = ethers.utils.parseEther("0.0005"); // 0.0005 ETH in wei

function AgentTrumpGame() {
  const [response, setResponse] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState('');
  const [status, setStatus] = useState('');
  const [isGameWon, setIsGameWon] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    checkConnection();
    updateGameState();
    const interval = setInterval(updateGameState, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const checkConnection = async () => {
    try {
      if (window.ethereum) {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const accounts = await provider.listAccounts();
        setIsConnected(accounts.length > 0);
        if (accounts.length > 0) {
          setAccount(accounts[0]);
        }
      }
    } catch (error) {
      console.error("Connection check failed:", error);
    }
  };

  const updateGameState = async () => {
    try {
      if (window.ethereum) {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
        
        const [remaining, won] = await Promise.all([
          contract.getTimeRemaining(),
          contract.gameWon()
        ]);

        setTimeRemaining(remaining.toNumber());
        setIsGameWon(won);
      }
    } catch (error) {
      console.error("Failed to update game state:", error);
    }
  };

  const connectWallet = async () => {
    try {
      if (window.ethereum) {
        setIsLoading(true);
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        const signer = provider.getSigner();
        const address = await signer.getAddress();
        setAccount(address);
        setIsConnected(true);
        setStatus('Wallet connected successfully!');
      } else {
        setStatus('Please install MetaMask!');
      }
    } catch (error) {
      setStatus('Failed to connect wallet: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const submitGuess = async (e) => {
    e.preventDefault();
    if (!response.trim()) {
      setStatus('Please enter a response');
      return;
    }

    try {
      setIsLoading(true);
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      const tx = await contract.submitGuess(response, {
        value: GAME_FEE
      });

      setStatus('Submitting your response...');
      await tx.wait();
      setStatus('Response submitted successfully! The AI agent will evaluate your response.');
      setResponse('');
    } catch (error) {
      setStatus('Error submitting response: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimeRemaining = (seconds) => {
    if (!seconds) return 'Loading...';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    return `${hours}h ${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Agent Trump Game</h1>
      
      {/* Trump Image */}
      <div className="mb-6">
        <img 
          src={trumpImage} 
          alt="Trump with Button"
          className="w-full rounded-lg shadow-lg"
        />
      </div>

      {/* Game Status */}
      <div className="mb-6">
        <p className="text-lg mb-2">Time Remaining: {formatTimeRemaining(timeRemaining)}</p>
        <p className="text-lg mb-4">Game Fee: 0.0005 ETH</p>
        {isGameWon && (
          <div className="mb-4 bg-green-100 p-4 rounded">
            <p>Game has been won! A player successfully convinced the AI to push the button.</p>
          </div>
        )}
      </div>

      {/* Wallet Connection */}
      {!isConnected ? (
        <button
          onClick={connectWallet}
          disabled={isLoading}
          className="w-full mb-6 bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 disabled:bg-gray-400"
        >
          {isLoading ? 'Connecting...' : 'Connect Wallet'}
        </button>
      ) : (
        <div className="mb-6">
          <p className="text-sm text-gray-600">Connected: {account.slice(0, 6)}...{account.slice(-4)}</p>
        </div>
      )}

      {/* Game Interface */}
      <form onSubmit={submitGuess} className="space-y-4">
        <div>
          <label htmlFor="response" className="block text-sm font-medium text-gray-700 mb-2">
            Your Response
          </label>
          <textarea
            id="response"
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            disabled={!isConnected || isLoading || isGameWon}
            className="w-full h-32 p-2 border rounded focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            placeholder="Try to convince Agent Trump to push the button..."
          />
        </div>

        <button
          type="submit"
          disabled={!isConnected || isLoading || isGameWon}
          className="w-full bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600 disabled:bg-gray-400"
        >
          {isLoading ? 'Submitting...' : 'Submit Response (0.0005 ETH)'}
        </button>
      </form>

      {/* Status Messages */}
      {status && (
        <div className="mt-6 p-4 bg-gray-100 rounded">
          <p>{status}</p>
        </div>
      )}
    </div>
  );
}

export default AgentTrumpGame;
