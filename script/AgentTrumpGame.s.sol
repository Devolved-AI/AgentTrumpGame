// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Script} from "forge-std/Script.sol";
import {AgentTrumpGame} from "../src/AgentTrumpGame.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        AgentTrumpGame game = new AgentTrumpGame();
        
        vm.stopBroadcast();
    }
}
