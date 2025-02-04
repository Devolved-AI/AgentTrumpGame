// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "./src/AgentTrumpGame.sol";

contract AgentTrumpGameEchidna is AgentTrumpGame {
    constructor() AgentTrumpGame() {}

    function echidna_balance_check() public view returns (bool) {
        return address(this).balance >= totalCollected;
    }

    function echidna_game_won_state() public view returns (bool) {
        if (gameWon) {
            return totalCollected == 0;
        }
        return true;
    }

    function echidna_valid_required_amount() public view returns (bool) {
        return getCurrentRequiredAmount() >= GAME_FEE;
    }

    function echidna_escalation_check() public view returns (bool) {
        if (escalationActive) {
            return block.number >= (gameEndBlock - ESCALATION_PERIOD) &&
                   currentRequiredAmount >= GAME_FEE;
        }
        return true;
    }

    function echidna_last_player_valid() public view returns (bool) {
        if (totalCollected > 0) {
            return lastPlayer != address(0);
        }
        return true;
    }

    function echidna_response_validity() public view returns (bool) {
        if (lastPlayer != address(0)) {
            return playerResponses[lastPlayer].length > 0;
        }
        return true;
    }

    function echidna_game_end_conditions() public view returns (bool) {
        if (block.number >= gameEndBlock && !gameWon) {
            return getTimeRemaining() == 0;
        }
        return true;
    }

    function echidna_escrow_consistency() public view returns (bool) {
        uint256 contractBalance = address(this).balance;
        return contractBalance >= totalCollected;
    }

    function echidna_no_zero_fee() public view returns (bool) {
        return GAME_FEE > 0 && getCurrentRequiredAmount() > 0;
    }

    function echidna_valid_game_duration() public view returns (bool) {
        return INITIAL_GAME_DURATION > ESCALATION_PERIOD;
    }
}
