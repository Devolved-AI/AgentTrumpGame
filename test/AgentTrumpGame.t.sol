// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test, console2} from "forge-std/Test.sol";
import {AgentTrumpGame} from "../src/AgentTrumpGame.sol";

contract AgentTrumpGameTest is Test {
    AgentTrumpGame public game;
    address public owner;
    address public player1;
    address public player2;
    uint256 public constant GAME_FEE = 0.0009 ether;
    
    function setUp() public {
        owner = makeAddr("owner");
        player1 = makeAddr("player1");
        player2 = makeAddr("player2");
        
        vm.startPrank(owner);
        game = new AgentTrumpGame();
        vm.deal(owner, 100 ether);
        vm.deal(player1, 100 ether);
        vm.deal(player2, 100 ether);
        vm.stopPrank();
    }

    function test_InitialState() public {
        assertEq(game.owner(), owner);
        assertEq(game.currentMultiplier(), 100);
        assertEq(game.getCurrentRequiredAmount(), GAME_FEE);
        assertFalse(game.gameWon());
        assertFalse(game.escalationActive());
    }

    function test_SubmitGuess() public {
        vm.startPrank(player1);
        game.submitGuess{value: GAME_FEE}("Test response");
        
        (string memory response, uint256 blockNumber, bool exists) = game.getPlayerResponseByIndex(player1, 0);
        assertEq(response, "Test response");
        assertTrue(exists);
        assertGt(blockNumber, 0);
        vm.stopPrank();
    }

    function test_RevertOnInsufficientPayment() public {
        vm.startPrank(player1);
        vm.expectRevert("Insufficient payment");
        game.submitGuess{value: GAME_FEE - 0.0001 ether}("Test response");
        vm.stopPrank();
    }

    function test_Escalation() public {
        uint256 blocksToEscalation = 15 * game.BLOCKS_PER_MINUTE();
        vm.roll(block.number + blocksToEscalation);
        
        vm.startPrank(player1);
        game.submitGuess{value: GAME_FEE}("Trigger escalation");
        
        assertTrue(game.escalationActive());
        assertEq(game.getCurrentRequiredAmount(), GAME_FEE * game.BASE_MULTIPLIER() / 100);
        vm.stopPrank();
    }

    function test_GameWin() public {
        vm.startPrank(player1);
        game.submitGuess{value: GAME_FEE}("Winning response");
        vm.stopPrank();

        uint256 initialBalance = player1.balance;
        
        vm.startPrank(owner);
        game.buttonPushed(player1);
        
        assertTrue(game.gameWon());
        assertGt(player1.balance, initialBalance);
        vm.stopPrank();
    }

    function test_EndGame() public {
        vm.startPrank(player1);
        game.submitGuess{value: GAME_FEE}("Final response");
        vm.stopPrank();

        uint256 blocksToEnd = 21 * game.BLOCKS_PER_MINUTE();
        vm.roll(block.number + blocksToEnd);
        
        uint256 initialOwnerBalance = owner.balance;
        uint256 initialPlayerBalance = player1.balance;
        
        vm.startPrank(owner);
        game.endGame();
        
        assertGt(owner.balance, initialOwnerBalance);
        assertGt(player1.balance, initialPlayerBalance);
        vm.stopPrank();
    }

    function test_RevertOnEmptyResponse() public {
        vm.startPrank(player1);
        vm.expectRevert("Response cannot be empty");
        game.submitGuess{value: GAME_FEE}("");
        vm.stopPrank();
    }

    function test_RevertOnLongResponse() public {
        string memory longResponse = new string(1001);
        
        vm.startPrank(player1);
        vm.expectRevert("Response too long");
        game.submitGuess{value: GAME_FEE}(longResponse);
        vm.stopPrank();
    }

    function test_RefundExcessPayment() public {
        uint256 excess = 0.001 ether;
        uint256 initialBalance = player1.balance;
        
        vm.startPrank(player1);
        game.submitGuess{value: GAME_FEE + excess}("Test response");
        
        assertEq(player1.balance, initialBalance - GAME_FEE);
        vm.stopPrank();
    }

    function test_GetAllPlayerResponses() public {
        vm.startPrank(player1);
        
        string[] memory responses = new string[](2);
        responses[0] = "First response";
        responses[1] = "Second response";
        
        game.submitGuess{value: GAME_FEE}(responses[0]);
        game.submitGuess{value: GAME_FEE}(responses[1]);
        
        (
            string[] memory returnedResponses,
            uint256[] memory blockNumbers,
            bool[] memory exists
        ) = game.getAllPlayerResponses(player1);
        
        assertEq(returnedResponses.length, 2);
        assertEq(returnedResponses[0], responses[0]);
        assertEq(returnedResponses[1], responses[1]);
        assertTrue(exists[0]);
        assertTrue(exists[1]);
        vm.stopPrank();
    }

    function test_GameExtension() public {
        uint256 blocksToEscalation = 15 * game.BLOCKS_PER_MINUTE();
        vm.roll(block.number + blocksToEscalation);
        
        vm.startPrank(player1);
        game.submitGuess{value: GAME_FEE}("Start escalation");
        
        uint256 requiredAmount = game.getCurrentRequiredAmount();
        uint256 initialEndBlock = game.gameEndBlock();
        
        vm.roll(block.number + 2 * game.BLOCKS_PER_MINUTE());
        game.submitGuess{value: requiredAmount}("Extend game");
        
        assertGt(game.gameEndBlock(), initialEndBlock);
        assertGt(game.getCurrentRequiredAmount(), requiredAmount);
        vm.stopPrank();
    }
}
