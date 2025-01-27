// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import "../src/AgentTrumpGame.sol";

contract DeployAgentTrumpGame is Script {
    function run() external {
        // Retrieve private key from environment variable
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        // Get Chainlink ETH/USD Price Feed address for Base network
        address priceFeed = vm.envAddress("PRICE_FEED_ADDRESS");
        
        // Start broadcasting transactions
        vm.startBroadcast(deployerPrivateKey);

        // Deploy the contract
        AgentTrumpGame game = new AgentTrumpGame(priceFeed);
        
        // Stop broadcasting transactions
        vm.stopBroadcast();

        // Log the deployment
        console.log("AgentTrumpGame deployed to:", address(game));
        console.log("Owner address:", game.owner());
        console.log("Price Feed address:", address(game.priceFeed()));
        console.log("Initial game end time:", game.gameEndTime());
    }
}
