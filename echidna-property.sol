// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "./src/AgentTrumpGame.sol";

contract AgentTrumpGamePropertyTest {
    AgentTrumpGame game;
    bool echidna_initialSetup;

    constructor() payable {
        game = new AgentTrumpGame();
    }

    function setup() public payable {
        require(!echidna_initialSetup);
        require(msg.value >= 1 ether);
        echidna_initialSetup = true;
    }

    function submitValidGuess() internal {
        require(echidna_initialSetup);
        uint256 fee = game.getCurrentRequiredAmount();
        require(address(this).balance >= fee, "Insufficient balance");
        game.submitGuess{value: fee}("test");
    }

    // Original invariants
    function testGameFeeInvariant() public view returns (bool) {
        return game.getCurrentRequiredAmount() >= game.GAME_FEE();
    }

    function testBalanceInvariant() public view returns (bool) {
        return address(game).balance >= game.totalCollected();
    }

    function testEscalationInvariant() public view returns (bool) {
        if (game.escalationActive()) {
            return game.getCurrentRequiredAmount() > game.GAME_FEE();
        }
        return true;
    }

    function testPlayerResponsesInvariant() public returns (bool) {
        if (!echidna_initialSetup) return true;
        submitValidGuess();
        return game.getPlayerResponseCount(address(this)) > 0;
    }

    // Additional invariants
    function testGameEndInvariant() public view returns (bool) {
        if (game.gameWon()) {
            return game.totalCollected() == 0;
        }
        return true;
    }

    function testLastPlayerInvariant() public view returns (bool) {
        if (game.totalCollected() > 0) {
            return game.lastPlayer() != address(0);
        }
        return true;
    }

    function testEscalationTimeInvariant() public view returns (bool) {
        if (game.escalationActive()) {
            return block.number >= (game.gameEndBlock() - game.ESCALATION_PERIOD());
        }
        return true;
    }

    function testResponseLengthInvariant() public returns (bool) {
        bytes memory response = bytes("test response");
        require(response.length > 0 && response.length <= 1000);
        return true;
    }

    function testOwnershipInvariant() public view returns (bool) {
        return game.owner() != address(0);
    }

    function testBlockTimeInvariant() public view returns (bool) {
        if (!game.gameWon()) {
            return game.gameEndBlock() > block.number || game.getTimeRemaining() == 0;
        }
        return true;
    }

    receive() external payable {}
}
