// Script to reset game state with new contract address
import fetch from 'node-fetch';

const contractAddress = "0xF3032E13D338405fd455dF356fa528503a3bf906";

async function resetGame() {
  try {
    console.log(`Resetting game with new contract address: ${contractAddress}`);
    
    // Update the contract address on the server - this will reset all user scores to 25
    const response = await fetch('http://localhost:5000/api/contract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ contractAddress })
    });
    
    const responseText = await response.text();
    
    if (!response.ok) {
      console.error('Server returned error:', responseText);
      throw new Error(`Failed to reset game state: ${response.status} ${response.statusText}`);
    }
    
    try {
      const data = JSON.parse(responseText);
      console.log('Server response:', data);
    } catch (err) {
      console.log('Raw response:', responseText);
    }
    
    console.log('Game reset successful!');
    console.log('All player persuasion scores have been reset to 25');
    console.log('Contract address updated to:', contractAddress);
  } catch (error) {
    console.error('Error resetting game:', error);
  }
}

// Run the reset function
resetGame();