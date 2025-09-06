const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("DigBizIdentity Contract", function () {
  // Fixture for deploying the contract
  async function deployDigBizIdentityFixture() {
    const [owner, user1, user2, user3, verifier] = await ethers.getSigners();

    const DigBizIdentity = await ethers.getContractFactory("DigBizIdentity");
    const identityContract = await DigBizIdentity.deploy();

    return { 
      identityContract, 
      owner, 
      user1, 
      user2, 
      user3, 
      verifier 
    };
  }

  describe("Identity Registration", function () {
    it("should allow users to register their identity", async function () {
      const { identityContract, user1 } = await loadFixture(deployDigBizIdentityFixture);

      const identityData = {
        name: "John Doe",
        email: "john@example.com",
        company: "Tech Corp",
        title: "Senior Engineer",
        industry: "technology",
        profileHash: ethers.utils.keccak256(ethers.utils.toUtf8Bytes("profile_data"))
      };

      await expect(
        identityContract.connect(user1).registerIdentity(
          identityData.name,
          identityData.email,
          identityData.company,
          identityData.title,
          identityData.industry,
          identityData.profileHash
        )
      ).to.emit(identityContract, "IdentityRegistered")
       .withArgs(user1.address, identityData.profileHash);

      const identity = await identityContract.getIdentity(user1.address);
      expect(identity.name).to.equal(identityData.name);
      expect(identity.email).to.equal(identityData.email);
      expect(identity.isVerified).to.be.false;
      expect(identity.reputationScore).to.equal(100); // Initial score
    });

    it("should prevent duplicate identity registration", async function () {
      const { identityContract, user1 } = await loadFixture(deployDigBizIdentityFixture);

      const identityData = {
        name: "John Doe",
        email: "john@example.com",
        company: "Tech Corp",
        title: "Senior Engineer",
        industry: "technology",
        profileHash: ethers.utils.keccak256(ethers.utils.toUtf8Bytes("profile_data"))
      };

      // First registration should succeed
      await identityContract.connect(user1).registerIdentity(
        identityData.name,
        identityData.email,
        identityData.company,
        identityData.title,
        identityData.industry,
        identityData.profileHash
      );

      // Second registration should fail
      await expect(
        identityContract.connect(user1).registerIdentity(
          "Different Name",
          "different@email.com",
          "Different Corp",
          "Different Title",
          "finance",
          ethers.utils.keccak256(ethers.utils.toUtf8Bytes("different_data"))
        )
      ).to.be.revertedWith("Identity already registered");
    });

    it("should validate required fields", async function () {
      const { identityContract, user1 } = await loadFixture(deployDigBizIdentityFixture);

      // Empty name should fail
      await expect(
        identityContract.connect(user1).registerIdentity(
          "",
          "john@example.com",
          "Tech Corp",
          "Senior Engineer",
          "technology",
          ethers.utils.keccak256(ethers.utils.toUtf8Bytes("profile_data"))
        )
      ).to.be.revertedWith("Name cannot be empty");

      // Empty email should fail
      await expect(
        identityContract.connect(user1).registerIdentity(
          "John Doe",
          "",
          "Tech Corp",
          "Senior Engineer",
          "technology",
          ethers.utils.keccak256(ethers.utils.toUtf8Bytes("profile_data"))
        )
      ).to.be.revertedWith("Email cannot be empty");
    });
  });

  describe("Identity Verification", function () {
    it("should allow owner to verify identities", async function () {
      const { identityContract, owner, user1 } = await loadFixture(deployDigBizIdentityFixture);

      // Register identity first
      await identityContract.connect(user1).registerIdentity(
        "John Doe",
        "john@example.com",
        "Tech Corp",
        "Senior Engineer",
        "technology",
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes("profile_data"))
      );

      // Verify identity
      await expect(
        identityContract.connect(owner).verifyIdentity(user1.address, true)
      ).to.emit(identityContract, "IdentityVerified")
       .withArgs(user1.address, true);

      const identity = await identityContract.getIdentity(user1.address);
      expect(identity.isVerified).to.be.true;
      expect(identity.reputationScore).to.equal(150); // Bonus for verification
    });

    it("should only allow owner to verify identities", async function () {
      const { identityContract, user1, user2 } = await loadFixture(deployDigBizIdentityFixture);

      // Register identity first
      await identityContract.connect(user1).registerIdentity(
        "John Doe",
        "john@example.com",
        "Tech Corp",
        "Senior Engineer",
        "technology",
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes("profile_data"))
      );

      // Non-owner should not be able to verify
      await expect(
        identityContract.connect(user2).verifyIdentity(user1.address, true)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should handle verification revocation", async function () {
      const { identityContract, owner, user1 } = await loadFixture(deployDigBizIdentityFixture);

      // Register and verify identity
      await identityContract.connect(user1).registerIdentity(
        "John Doe",
        "john@example.com",
        "Tech Corp",
        "Senior Engineer",
        "technology",
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes("profile_data"))
      );

      await identityContract.connect(owner).verifyIdentity(user1.address, true);

      // Revoke verification
      await expect(
        identityContract.connect(owner).verifyIdentity(user1.address, false)
      ).to.emit(identityContract, "IdentityVerified")
       .withArgs(user1.address, false);

      const identity = await identityContract.getIdentity(user1.address);
      expect(identity.isVerified).to.be.false;
      expect(identity.reputationScore).to.equal(100); // Back to initial score
    });
  });

  describe("Reputation System", function () {
    it("should allow reputation score updates", async function () {
      const { identityContract, owner, user1 } = await loadFixture(deployDigBizIdentityFixture);

      // Register identity
      await identityContract.connect(user1).registerIdentity(
        "John Doe",
        "john@example.com",
        "Tech Corp",
        "Senior Engineer",
        "technology",
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes("profile_data"))
      );

      // Update reputation score
      const newScore = 200;
      await expect(
        identityContract.connect(owner).updateReputationScore(user1.address, newScore)
      ).to.emit(identityContract, "ReputationUpdated")
       .withArgs(user1.address, newScore);

      const identity = await identityContract.getIdentity(user1.address);
      expect(identity.reputationScore).to.equal(newScore);
    });

    it("should prevent negative reputation scores", async function () {
      const { identityContract, owner, user1 } = await loadFixture(deployDigBizIdentityFixture);

      // Register identity
      await identityContract.connect(user1).registerIdentity(
        "John Doe",
        "john@example.com",
        "Tech Corp",
        "Senior Engineer",
        "technology",
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes("profile_data"))
      );

      // Try to set negative reputation score
      await expect(
        identityContract.connect(owner).updateReputationScore(user1.address, -50)
      ).to.be.revertedWith("Reputation score cannot be negative");
    });

    it("should cap reputation score at maximum", async function () {
      const { identityContract, owner, user1 } = await loadFixture(deployDigBizIdentityFixture);

      // Register identity
      await identityContract.connect(user1).registerIdentity(
        "John Doe",
        "john@example.com",
        "Tech Corp",
        "Senior Engineer",
        "technology",
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes("profile_data"))
      );

      // Try to set reputation score above maximum
      const maxScore = 1000;
      await identityContract.connect(owner).updateReputationScore(user1.address, maxScore + 100);

      const identity = await identityContract.getIdentity(user1.address);
      expect(identity.reputationScore).to.equal(maxScore);
    });
  });

  describe("Identity Queries", function () {
    it("should retrieve identity data correctly", async function () {
      const { identityContract, user1 } = await loadFixture(deployDigBizIdentityFixture);

      const identityData = {
        name: "John Doe",
        email: "john@example.com",
        company: "Tech Corp",
        title: "Senior Engineer",
        industry: "technology",
        profileHash: ethers.utils.keccak256(ethers.utils.toUtf8Bytes("profile_data"))
      };

      await identityContract.connect(user1).registerIdentity(
        identityData.name,
        identityData.email,
        identityData.company,
        identityData.title,
        identityData.industry,
        identityData.profileHash
      );

      const identity = await identityContract.getIdentity(user1.address);
      expect(identity.name).to.equal(identityData.name);
      expect(identity.email).to.equal(identityData.email);
      expect(identity.company).to.equal(identityData.company);
      expect(identity.title).to.equal(identityData.title);
      expect(identity.industry).to.equal(identityData.industry);
      expect(identity.profileHash).to.equal(identityData.profileHash);
    });

    it("should check if identity exists", async function () {
      const { identityContract, user1, user2 } = await loadFixture(deployDigBizIdentityFixture);

      // User1 registers, user2 doesn't
      await identityContract.connect(user1).registerIdentity(
        "John Doe",
        "john@example.com",
        "Tech Corp",
        "Senior Engineer",
        "technology",
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes("profile_data"))
      );

      expect(await identityContract.identityExists(user1.address)).to.be.true;
      expect(await identityContract.identityExists(user2.address)).to.be.false;
    });

    it("should get identities by industry", async function () {
      const { identityContract, user1, user2, user3 } = await loadFixture(deployDigBizIdentityFixture);

      // Register users in different industries
      await identityContract.connect(user1).registerIdentity(
        "John Doe",
        "john@example.com",
        "Tech Corp",
        "Engineer",
        "technology",
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes("profile_data_1"))
      );

      await identityContract.connect(user2).registerIdentity(
        "Jane Smith",
        "jane@example.com",
        "Finance Corp",
        "Analyst",
        "finance",
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes("profile_data_2"))
      );

      await identityContract.connect(user3).registerIdentity(
        "Bob Wilson",
        "bob@example.com",
        "Tech Startup",
        "Developer",
        "technology",
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes("profile_data_3"))
      );

      const techUsers = await identityContract.getIdentitiesByIndustry("technology");
      expect(techUsers.length).to.equal(2);
      expect(techUsers).to.include(user1.address);
      expect(techUsers).to.include(user3.address);

      const financeUsers = await identityContract.getIdentitiesByIndustry("finance");
      expect(financeUsers.length).to.equal(1);
      expect(financeUsers).to.include(user2.address);
    });
  });

  describe("Access Control", function () {
    it("should handle profile updates by identity owner", async function () {
      const { identityContract, user1 } = await loadFixture(deployDigBizIdentityFixture);

      // Register identity
      await identityContract.connect(user1).registerIdentity(
        "John Doe",
        "john@example.com",
        "Tech Corp",
        "Senior Engineer",
        "technology",
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes("profile_data"))
      );

      // Update profile hash
      const newProfileHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("updated_profile_data"));
      
      await expect(
        identityContract.connect(user1).updateProfileHash(newProfileHash)
      ).to.emit(identityContract, "ProfileUpdated")
       .withArgs(user1.address, newProfileHash);

      const identity = await identityContract.getIdentity(user1.address);
      expect(identity.profileHash).to.equal(newProfileHash);
    });

    it("should prevent profile updates by non-owners", async function () {
      const { identityContract, user1, user2 } = await loadFixture(deployDigBizIdentityFixture);

      // Register identity
      await identityContract.connect(user1).registerIdentity(
        "John Doe",
        "john@example.com",
        "Tech Corp",
        "Senior Engineer",
        "technology",
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes("profile_data"))
      );

      const newProfileHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("malicious_update"));
      
      // User2 should not be able to update user1's profile
      await expect(
        identityContract.connect(user2).updateProfileHash(newProfileHash)
      ).to.be.revertedWith("Identity not found");
    });
  });

  describe("Events and Logging", function () {
    it("should emit events for all major operations", async function () {
      const { identityContract, owner, user1 } = await loadFixture(deployDigBizIdentityFixture);

      // Test IdentityRegistered event
      await expect(
        identityContract.connect(user1).registerIdentity(
          "John Doe",
          "john@example.com",
          "Tech Corp",
          "Senior Engineer",
          "technology",
          ethers.utils.keccak256(ethers.utils.toUtf8Bytes("profile_data"))
        )
      ).to.emit(identityContract, "IdentityRegistered");

      // Test IdentityVerified event
      await expect(
        identityContract.connect(owner).verifyIdentity(user1.address, true)
      ).to.emit(identityContract, "IdentityVerified");

      // Test ReputationUpdated event
      await expect(
        identityContract.connect(owner).updateReputationScore(user1.address, 200)
      ).to.emit(identityContract, "ReputationUpdated");

      // Test ProfileUpdated event
      await expect(
        identityContract.connect(user1).updateProfileHash(
          ethers.utils.keccak256(ethers.utils.toUtf8Bytes("new_profile_data"))
        )
      ).to.emit(identityContract, "ProfileUpdated");
    });
  });

  describe("Gas Optimization", function () {
    it("should have reasonable gas costs for operations", async function () {
      const { identityContract, user1 } = await loadFixture(deployDigBizIdentityFixture);

      const tx = await identityContract.connect(user1).registerIdentity(
        "John Doe",
        "john@example.com",
        "Tech Corp",
        "Senior Engineer",
        "technology",
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes("profile_data"))
      );

      const receipt = await tx.wait();
      console.log(`Identity registration gas used: ${receipt.gasUsed.toString()}`);
      
      // Gas usage should be reasonable (under 200k gas)
      expect(receipt.gasUsed.toNumber()).to.be.lessThan(200000);
    });

    it("should batch identity operations efficiently", async function () {
      const { identityContract, owner, user1, user2, user3 } = await loadFixture(deployDigBizIdentityFixture);

      // Register multiple identities
      const users = [user1, user2, user3];
      const gasUsages = [];

      for (let i = 0; i < users.length; i++) {
        const tx = await identityContract.connect(users[i]).registerIdentity(
          `User ${i + 1}`,
          `user${i + 1}@example.com`,
          `Company ${i + 1}`,
          `Title ${i + 1}`,
          "technology",
          ethers.utils.keccak256(ethers.utils.toUtf8Bytes(`profile_data_${i + 1}`))
        );

        const receipt = await tx.wait();
        gasUsages.push(receipt.gasUsed.toNumber());
      }

      // Gas usage should be consistent across operations
      const avgGas = gasUsages.reduce((sum, gas) => sum + gas, 0) / gasUsages.length;
      gasUsages.forEach(gas => {
        expect(Math.abs(gas - avgGas) / avgGas).to.be.lessThan(0.1); // Within 10% variance
      });
    });
  });
});