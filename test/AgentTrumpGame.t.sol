// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Test.sol";
import "../src/AgentTrumpGame.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

contract MockPriceFeed is AggregatorV3Interface {
    int256 private price;

    constructor(int256 _price) {
        price = _price;
    }

    function decimals() external pure returns (uint8) {
        return 8;
    }

    function description() external pure returns (string memory) {
        return "Mock ETH/USD Price Feed";
    }

    function version() external pure returns (uint256) {
        return 1;
    }

    function getRoundData(uint80)
        external
        pure
        returns (uint80, int256, uint256, uint256, uint80)
    {
        revert("Not implemented");
    }

    function latestRoundData()
        external
        view
        returns (uint80, int256, uint256, uint256, uint80)
    {
        return (0, price, block.timestamp, block.timestamp, 0);
    }

    function setPrice(int256 _price) external {
        price = _price;
    }
}

contract AgentTrumpGameTest is Test {
    AgentTrumpGame public game;
    MockPriceFeed public priceFeed;
    address public owner;
    address public player1;
    address public player2;

    // Events for testing
    event GuessSubmitted(address indexed player, uint256 amount, uint256 multiplier);
    event GameWon(address indexed winner, uint256 reward);
    event GameEnded(address indexed lastPlayer, uint256 lastPlayerReward, uint256 ownerReward);
    event EscalationStarted(uint256 startTime);
    event GameExtended(uint256 newEndTime, uint256 newMultiplier);

    function setUp() public {
        // Set up accounts
        owner = makeAddr("owner");
        player1 = makeAddr("player1");
        player2 = makeAddr("player2");
        
        // Fund accounts
        vm.deal(player1, 100 ether);
        vm.deal(player2, 100 ether);
        
        // Deploy mock price feed with ETH at ~$3116.93
        priceFeed = new MockPriceFeed(311693310000);
        
        // Deploy game contract
        vm.prank(owner);
        game = new AgentTrumpGame(address(priceFeed));
    }

    function test_InitialState() public {
        assertEq(game.owner(), owner);
        assertEq(game.gameWon(), false);
        assertEq(game.escalationActive(), false);
        assertEq(game.currentMultiplier(), 100);
        assertEq(game.totalCollected(), 0);
        assertEq(address(game.priceFeed()), address(priceFeed));
    }

    function test_GetLatestPrice() public {
        uint256 price = game.getLatestPrice();
        assertEq(price, 311693310000);
    }

    function test_GetDollarEquivalent() public {
        uint256 dollarAmount = game.getDollarEquivalent();
        // Should be approximately 0.00032 ETH in wei
        assertApproxEqRel(dollarAmount, 320000000000000, 0.05e18); // 5% tolerance
    }

    function test_SubmitGuess() public {
        uint256 requiredAmount = game.getCurrentRequiredAmount();
        
        vm.prank(player1);
        game.submitGuess{value: requiredAmount}();
        
        assertEq(game.lastPlayer(), player1);
        assertTrue(game.totalCollected() > 0);
    }

    function test_SubmitGuessWithExcessPayment() public {
        uint256 requiredAmount = game.getCurrentRequiredAmount();
        uint256 excess = 0.1 ether;
        uint256 initialBalance = player1.balance;
        
        vm.prank(player1);
        game.submitGuess{value: requiredAmount + excess}();
        
        // Should refund excess
        assertApproxEqRel(
            player1.balance,
            initialBalance - requiredAmount,
            0.01e18 // 1% tolerance
        );
    }

    function test_EscalationPeriod() public {
        // Fast forward to 5 minutes before game end
        vm.warp(block.timestamp + 72 hours - 5 minutes);
        
        uint256 requiredAmount = game.getCurrentRequiredAmount();
        vm.prank(player1);
        game.submitGuess{value: requiredAmount}();
        
        assertTrue(game.escalationActive());
        assertEq(game.currentMultiplier(), 101); // 1.01 in basis points
    }

    function test_GameExtension() public {
        // Start escalation period
        vm.warp(block.timestamp + 72 hours - 5 minutes);
        
        // Submit first guess
        uint256 requiredAmount = game.getCurrentRequiredAmount();
        vm.prank(player1);
        game.submitGuess{value: requiredAmount}();
        
        // Submit second guess within escalation period
        vm.warp(block.timestamp + 2 minutes);
        requiredAmount = game.getCurrentRequiredAmount();
        vm.prank(player2);
        game.submitGuess{value: requiredAmount}();
        
        // Game should be extended
        assertTrue(game.gameEndTime() > block.timestamp + 3 minutes);
        assertEq(game.currentMultiplier(), 102); // 1.01 * 1.01 in basis points
    }

    function test_ButtonPushed() public {
        // Submit a guess
        uint256 requiredAmount = game.getCurrentRequiredAmount();
        vm.prank(player1);
        game.submitGuess{value: requiredAmount}();
        
        uint256 totalCollected = game.totalCollected();
        
        // Owner declares winner
        vm.prank(owner);
        game.buttonPushed(player1);
        
        assertTrue(game.gameWon());
        assertEq(game.totalCollected(), 0);
        assertEq(player1.balance, 100 ether - requiredAmount + totalCollected);
    }

    function test_EndGame() public {
        // Submit a guess
        uint256 requiredAmount = game.getCurrentRequiredAmount();
        vm.prank(player1);
        game.submitGuess{value: requiredAmount}();
        
        // Fast forward past game end
        vm.warp(block.timestamp + 73 hours);
        
        uint256 totalCollected = game.totalCollected();
        uint256 lastPlayerReward = (totalCollected * 10) / 100;
        uint256 ownerReward = totalCollected - lastPlayerReward;
        
        game.endGame();
        
        assertEq(game.totalCollected(), 0);
        assertEq(player1.balance, 100 ether - requiredAmount + lastPlayerReward);
        assertEq(owner.balance, ownerReward);
    }

    function testFail_ButtonPushedAfterEnd() public {
        vm.warp(block.timestamp + 73 hours);
        vm.prank(owner);
        game.buttonPushed(player1);
    }

    function testFail_SubmitGuessAfterEnd() public {
        vm.warp(block.timestamp + 73 hours);
        uint256 requiredAmount = game.getCurrentRequiredAmount();
        vm.prank(player1);
        game.submitGuess{value: requiredAmount}();
    }

    function testFail_InsufficientPayment() public {
        uint256 requiredAmount = game.getCurrentRequiredAmount();
        vm.prank(player1);
        game.submitGuess{value: requiredAmount - 1}();
    }

    function test_GetTimeRemaining() public {
        uint256 timeRemaining = game.getTimeRemaining();
        assertEq(timeRemaining, 72 hours);
        
        vm.warp(block.timestamp + 36 hours);
        timeRemaining = game.getTimeRemaining();
        assertEq(timeRemaining, 36 hours);
    }

    function test_GetCurrentEscalationPeriod() public {
        // Start escalation
        vm.warp(block.timestamp + 72 hours - 5 minutes);
        uint256 requiredAmount = game.getCurrentRequiredAmount();
        vm.prank(player1);
        game.submitGuess{value: requiredAmount}();
        
        // Check escalation period
        assertEq(game.getCurrentEscalationPeriod(), 0);
        
        // Move forward 2 escalation periods
        vm.warp(block.timestamp + 10 minutes);
        assertEq(game.getCurrentEscalationPeriod(), 2);
    }

    receive() external payable {}
}
