// Script to reset game state with new contract address
import fetch from 'node-fetch';

const contractAddress = "0x5d1e763f67bb84960a7f1894c906b89f09280E00";
const defaultScore = 25; // Set persuasion scores to 25 instead of 50

async function resetGame() {
  try {
    console.log(`Resetting game with new contract address: ${contractAddress} and persuasion score: ${defaultScore}`);
    
    // First update the contract address on the server
    const contractResponse = await fetch('http://localhost:5000/api/contract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        contractAddress,
        defaultScore // Pass the default score to use for reset
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
    
    // Now reset all scores to 25 explicitly
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
      console.error('Failed to reset scores explicitly');
    } else {
      const resetData = await resetResponse.json();
      console.log('Score reset response:', resetData);
    }
    
    console.log('Game reset successful!');
    console.log(`All player persuasion scores have been reset to ${defaultScore}`);
    console.log('Contract address updated to:', contractAddress);
  } catch (error) {
    console.error('Error resetting game:', error);
  }
}

// Run the reset function
resetGame();