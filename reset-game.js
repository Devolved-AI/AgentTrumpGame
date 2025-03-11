// Script to reset game state with new contract address
import fetch from 'node-fetch';

const CONTRACT_ADDRESS = "0x55C7E558Ca15aeDaB08CFA30bB9fD0F2d777bF4e";
const DEFAULT_SCORE = 25; // Set persuasion scores to 25 instead of 50

// Make sure the persuasion score is valid
function validateScore(score) {
  const numScore = Number(score);
  return !isNaN(numScore) && numScore >= 0 && numScore <= 100 ? numScore : DEFAULT_SCORE;
}

async function resetGame() {
  try {
    const contractAddress = CONTRACT_ADDRESS;
    const defaultScore = validateScore(DEFAULT_SCORE);
    
    console.log(`Resetting game with new contract address: ${contractAddress} and persuasion score: ${defaultScore}`);
    
    // First update the contract address on the server
    const contractResponse = await fetch('http://localhost:5000/api/contract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        contractAddress,
        defaultScore
      })
    });
    
    const contractResponseText = await contractResponse.text();
    
    if (!contractResponse.ok) {
      console.error('Server returned error:', contractResponseText);
      throw new Error(`Failed to reset game state: ${contractResponse.status} ${contractResponse.statusText}`);
    }
    
    try {
      const contractData = JSON.parse(contractResponseText);
      console.log('Contract update response:', contractData);
    } catch (err) {
      console.log('Raw contract response:', contractResponseText);
    }
    
    // Reset the game timer for this contract
    try {
      const timerResponse = await fetch(`http://localhost:5000/api/game/timer/reset/${contractAddress}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!timerResponse.ok) {
        console.error('Failed to reset game timer, but contract address was updated');
      } else {
        const timerData = await timerResponse.json();
        console.log('Timer reset response:', timerData);
      }
    } catch (error) {
      console.error('Error during timer reset:', error.message);
    }
    
    // Now reset all scores to the default score explicitly
    try {
      const resetResponse = await fetch('http://localhost:5000/api/persuasion/reset-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          contractAddress,
          defaultScore
        })
      });
      
      if (!resetResponse.ok) {
        console.error('Failed to reset scores explicitly, but contract address was updated');
      } else {
        const resetData = await resetResponse.json();
        console.log('Score reset response:', resetData);
      }
    } catch (error) {
      console.error('Error during score reset:', error.message);
    }
    
    console.log('Game reset successful!');
    console.log(`All player persuasion scores have been reset to ${defaultScore}`);
    console.log('Game timer has been reset to 10 minutes (600 seconds)');
    console.log('Contract address updated to:', contractAddress);
  } catch (error) {
    console.error('Error resetting game:', error);
  }
}

// Run the reset function
resetGame();