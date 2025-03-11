// Script to reset the game state on the contract
import { ethers } from 'ethers';

// Use the new contract address
const CONTRACT_ADDRESS = "0x55C7E558Ca15aeDaB08CFA30bB9fD0F2d777bF4e";

// Contract ABI (we only need the function we're calling - endGame)
const CONTRACT_ABI = [
  {
    "inputs": [],
    "name": "endGame",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTimeRemaining",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "gameWon",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "gameEndBlock",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

// IMPORTANT: Issue discovered in the contract's endGame() function
console.log("=================== CONTRACT ISSUE IDENTIFIED ===================");
console.log("The contract has a design issue in the endGame() function:");
console.log("1. When endGame() is called, it sets gameEndBlock = block.number");
console.log("2. This makes the game immediately 'over' since the current block is ≥ gameEndBlock");
console.log("3. The function should set gameEndBlock = block.number + INITIAL_GAME_DURATION");
console.log("   to start a fresh game period, but it doesn't");
console.log("\nThis explains why the game shows as 'over' when connecting to it.");
console.log("===================================================================");
console.log("\nTo fix this issue, you would need to:");
console.log("1. Deploy a fixed version of the contract that sets a future block for gameEndBlock in endGame()");
console.log("2. OR implement a workaround in the frontend to detect this state and handle it properly");
console.log("\n");

async function resetContractGame() {
  try {
    // Assume we need to use the Base Sepolia network
    const provider = new ethers.JsonRpcProvider("https://sepolia.base.org");
    
    // To interact with the contract, you need the private key of a wallet that
    // has permission to call endGame (typically the contract owner)
    console.log("To run this script, you would need to replace 'YOUR_PRIVATE_KEY' with a real private key that has owner access to the contract.");
    console.log("Since we can't do that here for security reasons, this script is for demonstration purposes only.");
    console.log("\nHere's what the script would do if properly configured:");
    
    console.log(`\n1. Connect to contract at ${CONTRACT_ADDRESS}`);
    console.log(`2. Call endGame() to reset the game state`);
    console.log(`3. This would reset gameWon = false and distribute funds,`);
    console.log(`   but it would NOT restart the game timer correctly.`);
    
    console.log("\nRECOMMENDATION: The contract needs to be modified or a frontend workaround implemented");
    console.log("to handle the case where gameEndBlock = currentBlock.");
    
    // In a real implementation, we would uncomment and properly configure the code below:
    /*
    const wallet = new ethers.Wallet("YOUR_PRIVATE_KEY", provider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);
    
    // Check current game state
    const gameWon = await contract.gameWon();
    const timeRemaining = await contract.getTimeRemaining();
    const gameEndBlock = await contract.gameEndBlock();
    const currentBlock = await provider.getBlockNumber();
    
    console.log("Current game state:");
    console.log(`Game won: ${gameWon}`);
    console.log(`Time remaining: ${timeRemaining} seconds`);
    console.log(`Game end block: ${gameEndBlock}`);
    console.log(`Current block: ${currentBlock}`);
    
    // Call endGame to reset the game
    const tx = await contract.endGame();
    console.log(`Transaction sent: ${tx.hash}`);
    
    // Wait for confirmation
    const receipt = await tx.wait();
    console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
    
    // Check new game state
    const newGameWon = await contract.gameWon();
    const newTimeRemaining = await contract.getTimeRemaining();
    const newGameEndBlock = await contract.gameEndBlock();
    
    console.log("\nNew game state:");
    console.log(`Game won: ${newGameWon}`);
    console.log(`Time remaining: ${newTimeRemaining} seconds`);
    console.log(`Game end block: ${newGameEndBlock}`);
    */
  } catch (error) {
    console.error("Error resetting game:", error);
  }
}

// Run the reset function
resetContractGame();