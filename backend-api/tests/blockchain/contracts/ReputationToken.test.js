const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");

describe("ReputationToken Contract", function () {
  // Fixture for deploying the contract
  async function deployReputationTokenFixture() {
    const [owner, user1, user2, user3, minter] = await ethers.getSigners();

    const ReputationToken = await ethers.getContractFactory("ReputationToken");
    const tokenContract = await ReputationToken.deploy("DigBiz Reputation Token", "DBR");

    // Grant minter role to the minter account
    const MINTER_ROLE = await tokenContract.MINTER_ROLE();
    await tokenContract.grantRole(MINTER_ROLE, minter.address);

    return { 
      tokenContract, 
      owner, 
      user1, 
      user2, 
      user3, 
      minter,
      MINTER_ROLE 
    };
  }

  describe("Token Deployment", function () {
    it("should deploy with correct name and symbol", async function () {
      const { tokenContract } = await loadFixture(deployReputationTokenFixture);

      expect(await tokenContract.name()).to.equal("DigBiz Reputation Token");
      expect(await tokenContract.symbol()).to.equal("DBR");
      expect(await tokenContract.decimals()).to.equal(18);
    });

    it("should set up roles correctly", async function () {
      const { tokenContract, owner, minter, MINTER_ROLE } = await loadFixture(deployReputationTokenFixture);

      const DEFAULT_ADMIN_ROLE = await tokenContract.DEFAULT_ADMIN_ROLE();
      
      expect(await tokenContract.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.true;
      expect(await tokenContract.hasRole(MINTER_ROLE, minter.address)).to.be.true;
      expect(await tokenContract.hasRole(MINTER_ROLE, owner.address)).to.be.false; // Owner doesn't have minter role by default
    });
  });

  describe("Token Minting", function () {
    it("should allow minters to mint tokens", async function () {
      const { tokenContract, minter, user1 } = await loadFixture(deployReputationTokenFixture);

      const mintAmount = ethers.utils.parseEther("100");
      const reason = "successful_deal";

      await expect(
        tokenContract.connect(minter).mintTokens(user1.address, mintAmount, reason)
      ).to.emit(tokenContract, "TokensAwarded")
       .withArgs(user1.address, mintAmount, reason);

      expect(await tokenContract.balanceOf(user1.address)).to.equal(mintAmount);
      expect(await tokenContract.totalSupply()).to.equal(mintAmount);
    });

    it("should prevent non-minters from minting", async function () {
      const { tokenContract, user1, user2 } = await loadFixture(deployReputationTokenFixture);

      const mintAmount = ethers.utils.parseEther("100");
      const reason = "unauthorized_mint";

      await expect(
        tokenContract.connect(user1).mintTokens(user2.address, mintAmount, reason)
      ).to.be.revertedWith("AccessControl: account");
    });

    it("should track minting history", async function () {
      const { tokenContract, minter, user1 } = await loadFixture(deployReputationTokenFixture);

      const mintAmount1 = ethers.utils.parseEther("50");
      const mintAmount2 = ethers.utils.parseEther("75");
      const reason1 = "successful_deal";
      const reason2 = "verified_profile";

      // First mint
      await tokenContract.connect(minter).mintTokens(user1.address, mintAmount1, reason1);
      
      // Second mint
      await tokenContract.connect(minter).mintTokens(user1.address, mintAmount2, reason2);

      const history = await tokenContract.getMintingHistory(user1.address);
      expect(history.length).to.equal(2);
      
      expect(history[0].amount).to.equal(mintAmount1);
      expect(history[0].reason).to.equal(reason1);
      expect(history[1].amount).to.equal(mintAmount2);
      expect(history[1].reason).to.equal(reason2);

      expect(await tokenContract.balanceOf(user1.address)).to.equal(mintAmount1.add(mintAmount2));
    });

    it("should prevent minting with empty reason", async function () {
      const { tokenContract, minter, user1 } = await loadFixture(deployReputationTokenFixture);

      const mintAmount = ethers.utils.parseEther("100");

      await expect(
        tokenContract.connect(minter).mintTokens(user1.address, mintAmount, "")
      ).to.be.revertedWith("Reason cannot be empty");
    });

    it("should prevent minting zero tokens", async function () {
      const { tokenContract, minter, user1 } = await loadFixture(deployReputationTokenFixture);

      await expect(
        tokenContract.connect(minter).mintTokens(user1.address, 0, "zero_mint")
      ).to.be.revertedWith("Amount must be greater than 0");
    });
  });

  describe("Token Burning", function () {
    it("should allow token holders to burn their tokens", async function () {
      const { tokenContract, minter, user1 } = await loadFixture(deployReputationTokenFixture);

      const mintAmount = ethers.utils.parseEther("100");
      const burnAmount = ethers.utils.parseEther("30");
      const reason = "penalty_violation";

      // First mint tokens
      await tokenContract.connect(minter).mintTokens(user1.address, mintAmount, "initial_mint");

      // Then burn some tokens
      await expect(
        tokenContract.connect(user1).burnTokens(burnAmount, reason)
      ).to.emit(tokenContract, "TokensBurned")
       .withArgs(user1.address, burnAmount, reason);

      expect(await tokenContract.balanceOf(user1.address)).to.equal(mintAmount.sub(burnAmount));
      expect(await tokenContract.totalSupply()).to.equal(mintAmount.sub(burnAmount));
    });

    it("should allow admins to burn tokens from any account", async function () {
      const { tokenContract, owner, minter, user1 } = await loadFixture(deployReputationTokenFixture);

      const mintAmount = ethers.utils.parseEther("100");
      const burnAmount = ethers.utils.parseEther("50");
      const reason = "admin_penalty";

      // First mint tokens
      await tokenContract.connect(minter).mintTokens(user1.address, mintAmount, "initial_mint");

      // Admin burns tokens from user account
      await expect(
        tokenContract.connect(owner).burnFromAccount(user1.address, burnAmount, reason)
      ).to.emit(tokenContract, "TokensBurned")
       .withArgs(user1.address, burnAmount, reason);

      expect(await tokenContract.balanceOf(user1.address)).to.equal(mintAmount.sub(burnAmount));
    });

    it("should prevent burning more tokens than balance", async function () {
      const { tokenContract, minter, user1 } = await loadFixture(deployReputationTokenFixture);

      const mintAmount = ethers.utils.parseEther("100");
      const burnAmount = ethers.utils.parseEther("150"); // More than balance

      // First mint tokens
      await tokenContract.connect(minter).mintTokens(user1.address, mintAmount, "initial_mint");

      // Try to burn more than balance
      await expect(
        tokenContract.connect(user1).burnTokens(burnAmount, "over_burn")
      ).to.be.revertedWith("Insufficient balance");
    });

    it("should track burning history", async function () {
      const { tokenContract, minter, user1 } = await loadFixture(deployReputationTokenFixture);

      const mintAmount = ethers.utils.parseEther("200");
      const burnAmount1 = ethers.utils.parseEther("30");
      const burnAmount2 = ethers.utils.parseEther("50");
      const reason1 = "penalty_1";
      const reason2 = "penalty_2";

      // Mint tokens first
      await tokenContract.connect(minter).mintTokens(user1.address, mintAmount, "initial_mint");

      // Burn tokens twice
      await tokenContract.connect(user1).burnTokens(burnAmount1, reason1);
      await tokenContract.connect(user1).burnTokens(burnAmount2, reason2);

      const history = await tokenContract.getBurningHistory(user1.address);
      expect(history.length).to.equal(2);
      
      expect(history[0].amount).to.equal(burnAmount1);
      expect(history[0].reason).to.equal(reason1);
      expect(history[1].amount).to.equal(burnAmount2);
      expect(history[1].reason).to.equal(reason2);
    });
  });

  describe("Reputation Levels", function () {
    it("should calculate correct reputation levels", async function () {
      const { tokenContract, minter, user1 } = await loadFixture(deployReputationTokenFixture);

      // Test different token amounts and their corresponding levels
      const testCases = [
        { amount: ethers.utils.parseEther("0"), level: "Newcomer" },
        { amount: ethers.utils.parseEther("100"), level: "Contributor" },
        { amount: ethers.utils.parseEther("500"), level: "Trusted" },
        { amount: ethers.utils.parseEther("1000"), level: "Expert" },
        { amount: ethers.utils.parseEther("2500"), level: "Authority" },
        { amount: ethers.utils.parseEther("5000"), level: "Legend" }
      ];

      for (const testCase of testCases) {
        // Reset balance by burning all tokens if any
        const currentBalance = await tokenContract.balanceOf(user1.address);
        if (currentBalance.gt(0)) {
          await tokenContract.connect(user1).burnTokens(currentBalance, "reset");
        }

        // Mint the test amount
        if (testCase.amount.gt(0)) {
          await tokenContract.connect(minter).mintTokens(user1.address, testCase.amount, "test_level");
        }

        const level = await tokenContract.getReputationLevel(user1.address);
        expect(level).to.equal(testCase.level);
      }
    });

    it("should calculate reputation percentage correctly", async function () {
      const { tokenContract, minter, user1 } = await loadFixture(deployReputationTokenFixture);

      const amount = ethers.utils.parseEther("750"); // Between Trusted (500) and Expert (1000)
      await tokenContract.connect(minter).mintTokens(user1.address, amount, "test_percentage");

      const percentage = await tokenContract.getReputationPercentage(user1.address);
      expect(percentage).to.equal(50); // 50% towards Expert level
    });
  });

  describe("Staking Mechanism", function () {
    it("should allow users to stake tokens", async function () {
      const { tokenContract, minter, user1 } = await loadFixture(deployReputationTokenFixture);

      const mintAmount = ethers.utils.parseEther("1000");
      const stakeAmount = ethers.utils.parseEther("500");
      const duration = 30 * 24 * 60 * 60; // 30 days in seconds

      // Mint tokens first
      await tokenContract.connect(minter).mintTokens(user1.address, mintAmount, "initial_mint");

      // Stake tokens
      await expect(
        tokenContract.connect(user1).stakeTokens(stakeAmount, duration)
      ).to.emit(tokenContract, "TokensStaked")
       .withArgs(user1.address, stakeAmount, duration);

      const stakeInfo = await tokenContract.getStakeInfo(user1.address);
      expect(stakeInfo.amount).to.equal(stakeAmount);
      expect(stakeInfo.duration).to.equal(duration);
      expect(stakeInfo.isActive).to.be.true;

      // Available balance should be reduced
      expect(await tokenContract.getAvailableBalance(user1.address)).to.equal(mintAmount.sub(stakeAmount));
    });

    it("should calculate staking rewards correctly", async function () {
      const { tokenContract, minter, user1 } = await loadFixture(deployReputationTokenFixture);

      const mintAmount = ethers.utils.parseEther("1000");
      const stakeAmount = ethers.utils.parseEther("500");
      const duration = 30 * 24 * 60 * 60; // 30 days

      // Mint and stake tokens
      await tokenContract.connect(minter).mintTokens(user1.address, mintAmount, "initial_mint");
      await tokenContract.connect(user1).stakeTokens(stakeAmount, duration);

      // Fast forward time to halfway through staking period
      await time.increase(duration / 2);

      const reward = await tokenContract.calculateStakingReward(user1.address);
      expect(reward).to.be.gt(0);
      
      // Reward should be proportional to time passed
      const expectedReward = stakeAmount.mul(5).div(100).div(2); // 5% APY for half the time
      expect(reward).to.be.approximately(expectedReward, ethers.utils.parseEther("1")); // Allow small variance
    });

    it("should allow unstaking after duration", async function () {
      const { tokenContract, minter, user1 } = await loadFixture(deployReputationTokenFixture);

      const mintAmount = ethers.utils.parseEther("1000");
      const stakeAmount = ethers.utils.parseEther("500");
      const duration = 30 * 24 * 60 * 60; // 30 days

      // Mint and stake tokens
      await tokenContract.connect(minter).mintTokens(user1.address, mintAmount, "initial_mint");
      await tokenContract.connect(user1).stakeTokens(stakeAmount, duration);

      // Fast forward time beyond staking duration
      await time.increase(duration + 1);

      // Unstake tokens
      await expect(
        tokenContract.connect(user1).unstakeTokens()
      ).to.emit(tokenContract, "TokensUnstaked");

      const stakeInfo = await tokenContract.getStakeInfo(user1.address);
      expect(stakeInfo.amount).to.equal(0);
      expect(stakeInfo.isActive).to.be.false;

      // Should receive original stake plus rewards
      const finalBalance = await tokenContract.balanceOf(user1.address);
      expect(finalBalance).to.be.gt(mintAmount);
    });

    it("should prevent early unstaking", async function () {
      const { tokenContract, minter, user1 } = await loadFixture(deployReputationTokenFixture);

      const mintAmount = ethers.utils.parseEther("1000");
      const stakeAmount = ethers.utils.parseEther("500");
      const duration = 30 * 24 * 60 * 60; // 30 days

      // Mint and stake tokens
      await tokenContract.connect(minter).mintTokens(user1.address, mintAmount, "initial_mint");
      await tokenContract.connect(user1).stakeTokens(stakeAmount, duration);

      // Try to unstake early (only 15 days)
      await time.increase(duration / 2);

      await expect(
        tokenContract.connect(user1).unstakeTokens()
      ).to.be.revertedWith("Staking period not complete");
    });

    it("should prevent staking more than available balance", async function () {
      const { tokenContract, minter, user1 } = await loadFixture(deployReputationTokenFixture);

      const mintAmount = ethers.utils.parseEther("100");
      const stakeAmount = ethers.utils.parseEther("150"); // More than balance
      const duration = 30 * 24 * 60 * 60; // 30 days

      // Mint tokens
      await tokenContract.connect(minter).mintTokens(user1.address, mintAmount, "initial_mint");

      // Try to stake more than balance
      await expect(
        tokenContract.connect(user1).stakeTokens(stakeAmount, duration)
      ).to.be.revertedWith("Insufficient available balance");
    });
  });

  describe("Leaderboard and Rankings", function () {
    it("should track top token holders", async function () {
      const { tokenContract, minter, user1, user2, user3 } = await loadFixture(deployReputationTokenFixture);

      // Mint different amounts to users
      await tokenContract.connect(minter).mintTokens(user1.address, ethers.utils.parseEther("500"), "mint_1");
      await tokenContract.connect(minter).mintTokens(user2.address, ethers.utils.parseEther("1000"), "mint_2");
      await tokenContract.connect(minter).mintTokens(user3.address, ethers.utils.parseEther("750"), "mint_3");

      const topHolders = await tokenContract.getTopHolders(3);
      
      expect(topHolders.length).to.equal(3);
      expect(topHolders[0].account).to.equal(user2.address); // Highest balance
      expect(topHolders[1].account).to.equal(user3.address); // Second highest
      expect(topHolders[2].account).to.equal(user1.address); // Third highest
    });

    it("should calculate user rankings", async function () {
      const { tokenContract, minter, user1, user2, user3 } = await loadFixture(deployReputationTokenFixture);

      // Mint tokens to users
      await tokenContract.connect(minter).mintTokens(user1.address, ethers.utils.parseEther("500"), "mint_1");
      await tokenContract.connect(minter).mintTokens(user2.address, ethers.utils.parseEther("1000"), "mint_2");
      await tokenContract.connect(minter).mintTokens(user3.address, ethers.utils.parseEther("750"), "mint_3");

      expect(await tokenContract.getUserRank(user2.address)).to.equal(1); // Highest balance
      expect(await tokenContract.getUserRank(user3.address)).to.equal(2); // Second highest
      expect(await tokenContract.getUserRank(user1.address)).to.equal(3); // Third highest
    });
  });

  describe("Transfer Restrictions", function () {
    it("should restrict transfers to specific conditions", async function () {
      const { tokenContract, minter, user1, user2 } = await loadFixture(deployReputationTokenFixture);

      const mintAmount = ethers.utils.parseEther("100");
      await tokenContract.connect(minter).mintTokens(user1.address, mintAmount, "initial_mint");

      // Direct transfers should be restricted
      await expect(
        tokenContract.connect(user1).transfer(user2.address, ethers.utils.parseEther("50"))
      ).to.be.revertedWith("Direct transfers not allowed");
    });

    it("should allow transfers only through authorized mechanisms", async function () {
      const { tokenContract, owner, minter, user1, user2 } = await loadFixture(deployReputationTokenFixture);

      const mintAmount = ethers.utils.parseEther("100");
      const transferAmount = ethers.utils.parseEther("30");
      
      await tokenContract.connect(minter).mintTokens(user1.address, mintAmount, "initial_mint");

      // Admin can authorize transfers
      await expect(
        tokenContract.connect(owner).authorizedTransfer(user1.address, user2.address, transferAmount, "reward_transfer")
      ).to.emit(tokenContract, "AuthorizedTransfer")
       .withArgs(user1.address, user2.address, transferAmount, "reward_transfer");

      expect(await tokenContract.balanceOf(user1.address)).to.equal(mintAmount.sub(transferAmount));
      expect(await tokenContract.balanceOf(user2.address)).to.equal(transferAmount);
    });
  });

  describe("Token Economics", function () {
    it("should track total token metrics", async function () {
      const { tokenContract, minter, user1, user2 } = await loadFixture(deployReputationTokenFixture);

      // Initial state
      expect(await tokenContract.totalSupply()).to.equal(0);
      expect(await tokenContract.totalMinted()).to.equal(0);
      expect(await tokenContract.totalBurned()).to.equal(0);

      // Mint tokens
      const mintAmount1 = ethers.utils.parseEther("500");
      const mintAmount2 = ethers.utils.parseEther("300");
      
      await tokenContract.connect(minter).mintTokens(user1.address, mintAmount1, "mint_1");
      await tokenContract.connect(minter).mintTokens(user2.address, mintAmount2, "mint_2");

      expect(await tokenContract.totalSupply()).to.equal(mintAmount1.add(mintAmount2));
      expect(await tokenContract.totalMinted()).to.equal(mintAmount1.add(mintAmount2));

      // Burn tokens
      const burnAmount = ethers.utils.parseEther("100");
      await tokenContract.connect(user1).burnTokens(burnAmount, "burn_test");

      expect(await tokenContract.totalSupply()).to.equal(mintAmount1.add(mintAmount2).sub(burnAmount));
      expect(await tokenContract.totalBurned()).to.equal(burnAmount);
    });

    it("should calculate token velocity", async function () {
      const { tokenContract, owner, minter, user1, user2, user3 } = await loadFixture(deployReputationTokenFixture);

      // Mint initial tokens
      await tokenContract.connect(minter).mintTokens(user1.address, ethers.utils.parseEther("1000"), "initial");
      await tokenContract.connect(minter).mintTokens(user2.address, ethers.utils.parseEther("500"), "initial");

      // Perform several authorized transfers to simulate activity
      await tokenContract.connect(owner).authorizedTransfer(user1.address, user2.address, ethers.utils.parseEther("100"), "transfer_1");
      await tokenContract.connect(owner).authorizedTransfer(user2.address, user3.address, ethers.utils.parseEther("50"), "transfer_2");
      await tokenContract.connect(owner).authorizedTransfer(user1.address, user3.address, ethers.utils.parseEther("75"), "transfer_3");

      const velocity = await tokenContract.getTokenVelocity();
      expect(velocity).to.be.gt(0);
    });
  });

  describe("Emergency Controls", function () {
    it("should allow admin to pause and unpause contract", async function () {
      const { tokenContract, owner, minter, user1 } = await loadFixture(deployReputationTokenFixture);

      // Pause contract
      await tokenContract.connect(owner).pause();
      expect(await tokenContract.paused()).to.be.true;

      // Should not allow minting when paused
      await expect(
        tokenContract.connect(minter).mintTokens(user1.address, ethers.utils.parseEther("100"), "paused_mint")
      ).to.be.revertedWith("Pausable: paused");

      // Unpause contract
      await tokenContract.connect(owner).unpause();
      expect(await tokenContract.paused()).to.be.false;

      // Should allow minting when unpaused
      await expect(
        tokenContract.connect(minter).mintTokens(user1.address, ethers.utils.parseEther("100"), "unpaused_mint")
      ).to.not.be.reverted;
    });

    it("should only allow admin to pause/unpause", async function () {
      const { tokenContract, user1 } = await loadFixture(deployReputationTokenFixture);

      await expect(
        tokenContract.connect(user1).pause()
      ).to.be.revertedWith("AccessControl: account");

      await expect(
        tokenContract.connect(user1).unpause()
      ).to.be.revertedWith("AccessControl: account");
    });
  });
});