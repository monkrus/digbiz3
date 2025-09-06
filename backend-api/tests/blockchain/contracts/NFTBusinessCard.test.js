const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("NFTBusinessCard Contract", function () {
  // Fixture for deploying the contract
  async function deployNFTBusinessCardFixture() {
    const [owner, user1, user2, user3, minter] = await ethers.getSigners();

    const NFTBusinessCard = await ethers.getContractFactory("NFTBusinessCard");
    const nftContract = await NFTBusinessCard.deploy("DigBiz Business Cards", "DBBC", "https://api.digbiz.com/metadata/");

    // Grant minter role to the minter account
    const MINTER_ROLE = await nftContract.MINTER_ROLE();
    await nftContract.grantRole(MINTER_ROLE, minter.address);

    return { 
      nftContract, 
      owner, 
      user1, 
      user2, 
      user3, 
      minter,
      MINTER_ROLE 
    };
  }

  describe("Contract Deployment", function () {
    it("should deploy with correct name, symbol, and base URI", async function () {
      const { nftContract } = await loadFixture(deployNFTBusinessCardFixture);

      expect(await nftContract.name()).to.equal("DigBiz Business Cards");
      expect(await nftContract.symbol()).to.equal("DBBC");
      expect(await nftContract.getBaseURI()).to.equal("https://api.digbiz.com/metadata/");
    });

    it("should support required interfaces", async function () {
      const { nftContract } = await loadFixture(deployNFTBusinessCardFixture);

      // ERC721 interface ID
      expect(await nftContract.supportsInterface("0x80ac58cd")).to.be.true;
      // ERC721Metadata interface ID
      expect(await nftContract.supportsInterface("0x5b5e139f")).to.be.true;
      // ERC721Enumerable interface ID
      expect(await nftContract.supportsInterface("0x780e9d63")).to.be.true;
    });
  });

  describe("Business Card Minting", function () {
    it("should allow minters to mint business card NFTs", async function () {
      const { nftContract, minter, user1 } = await loadFixture(deployNFTBusinessCardFixture);

      const cardData = {
        name: "John Doe",
        title: "Senior Software Engineer",
        company: "Tech Corp",
        email: "john@techcorp.com",
        phone: "+1-555-0123",
        website: "https://johndoe.dev",
        linkedin: "https://linkedin.com/in/johndoe",
        industry: "technology",
        bio: "Passionate software engineer with 10 years of experience",
        skills: ["JavaScript", "React", "Node.js", "Python"],
        location: "San Francisco, CA"
      };

      await expect(
        nftContract.connect(minter).mintBusinessCard(
          user1.address,
          cardData.name,
          cardData.title,
          cardData.company,
          cardData.email,
          cardData.phone,
          cardData.website,
          cardData.linkedin,
          cardData.industry,
          cardData.bio,
          cardData.skills,
          cardData.location
        )
      ).to.emit(nftContract, "BusinessCardMinted")
       .withArgs(user1.address, 1); // First token ID should be 1

      expect(await nftContract.ownerOf(1)).to.equal(user1.address);
      expect(await nftContract.balanceOf(user1.address)).to.equal(1);
      expect(await nftContract.totalSupply()).to.equal(1);
    });

    it("should prevent non-minters from minting", async function () {
      const { nftContract, user1, user2 } = await loadFixture(deployNFTBusinessCardFixture);

      await expect(
        nftContract.connect(user1).mintBusinessCard(
          user2.address,
          "John Doe",
          "Engineer",
          "Tech Corp",
          "john@techcorp.com",
          "+1-555-0123",
          "https://johndoe.dev",
          "https://linkedin.com/in/johndoe",
          "technology",
          "Bio text",
          ["JavaScript"],
          "San Francisco, CA"
        )
      ).to.be.revertedWith("AccessControl: account");
    });

    it("should store business card data correctly", async function () {
      const { nftContract, minter, user1 } = await loadFixture(deployNFTBusinessCardFixture);

      const cardData = {
        name: "John Doe",
        title: "Senior Software Engineer",
        company: "Tech Corp",
        email: "john@techcorp.com",
        phone: "+1-555-0123",
        website: "https://johndoe.dev",
        linkedin: "https://linkedin.com/in/johndoe",
        industry: "technology",
        bio: "Passionate software engineer with 10 years of experience",
        skills: ["JavaScript", "React", "Node.js"],
        location: "San Francisco, CA"
      };

      await nftContract.connect(minter).mintBusinessCard(
        user1.address,
        cardData.name,
        cardData.title,
        cardData.company,
        cardData.email,
        cardData.phone,
        cardData.website,
        cardData.linkedin,
        cardData.industry,
        cardData.bio,
        cardData.skills,
        cardData.location
      );

      const storedCard = await nftContract.getBusinessCard(1);
      expect(storedCard.name).to.equal(cardData.name);
      expect(storedCard.title).to.equal(cardData.title);
      expect(storedCard.company).to.equal(cardData.company);
      expect(storedCard.email).to.equal(cardData.email);
      expect(storedCard.phone).to.equal(cardData.phone);
      expect(storedCard.website).to.equal(cardData.website);
      expect(storedCard.linkedin).to.equal(cardData.linkedin);
      expect(storedCard.industry).to.equal(cardData.industry);
      expect(storedCard.bio).to.equal(cardData.bio);
      expect(storedCard.skills).to.deep.equal(cardData.skills);
      expect(storedCard.location).to.equal(cardData.location);
    });

    it("should validate required fields", async function () {
      const { nftContract, minter, user1 } = await loadFixture(deployNFTBusinessCardFixture);

      // Empty name should fail
      await expect(
        nftContract.connect(minter).mintBusinessCard(
          user1.address,
          "", // Empty name
          "Engineer",
          "Tech Corp",
          "john@techcorp.com",
          "+1-555-0123",
          "https://johndoe.dev",
          "https://linkedin.com/in/johndoe",
          "technology",
          "Bio text",
          ["JavaScript"],
          "San Francisco, CA"
        )
      ).to.be.revertedWith("Name cannot be empty");

      // Empty email should fail
      await expect(
        nftContract.connect(minter).mintBusinessCard(
          user1.address,
          "John Doe",
          "Engineer",
          "Tech Corp",
          "", // Empty email
          "+1-555-0123",
          "https://johndoe.dev",
          "https://linkedin.com/in/johndoe",
          "technology",
          "Bio text",
          ["JavaScript"],
          "San Francisco, CA"
        )
      ).to.be.revertedWith("Email cannot be empty");
    });

    it("should enforce one card per user limit", async function () {
      const { nftContract, minter, user1 } = await loadFixture(deployNFTBusinessCardFixture);

      // Mint first card
      await nftContract.connect(minter).mintBusinessCard(
        user1.address,
        "John Doe",
        "Engineer",
        "Tech Corp",
        "john@techcorp.com",
        "+1-555-0123",
        "https://johndoe.dev",
        "https://linkedin.com/in/johndoe",
        "technology",
        "Bio text",
        ["JavaScript"],
        "San Francisco, CA"
      );

      // Try to mint second card for same user
      await expect(
        nftContract.connect(minter).mintBusinessCard(
          user1.address,
          "John Smith", // Different data
          "Manager",
          "Different Corp",
          "johnsmith@different.com",
          "+1-555-9999",
          "https://johnsmith.com",
          "https://linkedin.com/in/johnsmith",
          "finance",
          "Different bio",
          ["Management"],
          "New York, NY"
        )
      ).to.be.revertedWith("User already has a business card");
    });
  });

  describe("Business Card Updates", function () {
    it("should allow card owners to update their business cards", async function () {
      const { nftContract, minter, user1 } = await loadFixture(deployNFTBusinessCardFixture);

      // Mint initial card
      await nftContract.connect(minter).mintBusinessCard(
        user1.address,
        "John Doe",
        "Engineer",
        "Tech Corp",
        "john@techcorp.com",
        "+1-555-0123",
        "https://johndoe.dev",
        "https://linkedin.com/in/johndoe",
        "technology",
        "Original bio",
        ["JavaScript"],
        "San Francisco, CA"
      );

      // Update card data
      const updatedData = {
        name: "John Doe",
        title: "Senior Software Engineer", // Updated title
        company: "New Tech Corp", // Updated company
        email: "john@newtechcorp.com", // Updated email
        phone: "+1-555-0123",
        website: "https://johndoe.dev",
        linkedin: "https://linkedin.com/in/johndoe",
        industry: "technology",
        bio: "Updated bio with more experience", // Updated bio
        skills: ["JavaScript", "React", "Node.js"], // Updated skills
        location: "San Francisco, CA"
      };

      await expect(
        nftContract.connect(user1).updateBusinessCard(
          1,
          updatedData.name,
          updatedData.title,
          updatedData.company,
          updatedData.email,
          updatedData.phone,
          updatedData.website,
          updatedData.linkedin,
          updatedData.industry,
          updatedData.bio,
          updatedData.skills,
          updatedData.location
        )
      ).to.emit(nftContract, "BusinessCardUpdated")
       .withArgs(1);

      const updatedCard = await nftContract.getBusinessCard(1);
      expect(updatedCard.title).to.equal(updatedData.title);
      expect(updatedCard.company).to.equal(updatedData.company);
      expect(updatedCard.email).to.equal(updatedData.email);
      expect(updatedCard.bio).to.equal(updatedData.bio);
      expect(updatedCard.skills).to.deep.equal(updatedData.skills);
    });

    it("should prevent non-owners from updating cards", async function () {
      const { nftContract, minter, user1, user2 } = await loadFixture(deployNFTBusinessCardFixture);

      // Mint card for user1
      await nftContract.connect(minter).mintBusinessCard(
        user1.address,
        "John Doe",
        "Engineer",
        "Tech Corp",
        "john@techcorp.com",
        "+1-555-0123",
        "https://johndoe.dev",
        "https://linkedin.com/in/johndoe",
        "technology",
        "Bio text",
        ["JavaScript"],
        "San Francisco, CA"
      );

      // user2 tries to update user1's card
      await expect(
        nftContract.connect(user2).updateBusinessCard(
          1,
          "Hacker",
          "Criminal",
          "Evil Corp",
          "hacker@evil.com",
          "+1-666-666",
          "https://evil.com",
          "https://evil.com/linkedin",
          "crime",
          "I am evil",
          ["Hacking"],
          "Dark Web"
        )
      ).to.be.revertedWith("Only card owner can update");
    });

    it("should track update history", async function () {
      const { nftContract, minter, user1 } = await loadFixture(deployNFTBusinessCardFixture);

      // Mint card
      await nftContract.connect(minter).mintBusinessCard(
        user1.address,
        "John Doe",
        "Engineer",
        "Tech Corp",
        "john@techcorp.com",
        "+1-555-0123",
        "https://johndoe.dev",
        "https://linkedin.com/in/johndoe",
        "technology",
        "Original bio",
        ["JavaScript"],
        "San Francisco, CA"
      );

      // Update card multiple times
      await nftContract.connect(user1).updateBusinessCard(
        1,
        "John Doe",
        "Senior Engineer", // Update 1
        "Tech Corp",
        "john@techcorp.com",
        "+1-555-0123",
        "https://johndoe.dev",
        "https://linkedin.com/in/johndoe",
        "technology",
        "Updated bio 1",
        ["JavaScript", "React"],
        "San Francisco, CA"
      );

      await nftContract.connect(user1).updateBusinessCard(
        1,
        "John Doe",
        "Lead Engineer", // Update 2
        "Tech Corp",
        "john@techcorp.com",
        "+1-555-0123",
        "https://johndoe.dev",
        "https://linkedin.com/in/johndoe",
        "technology",
        "Updated bio 2",
        ["JavaScript", "React", "Node.js"],
        "San Francisco, CA"
      );

      const updateHistory = await nftContract.getUpdateHistory(1);
      expect(updateHistory.length).to.equal(2);
      expect(updateHistory[0].updateCount).to.equal(1);
      expect(updateHistory[1].updateCount).to.equal(2);
    });
  });

  describe("Card Verification", function () {
    it("should allow admins to verify business cards", async function () {
      const { nftContract, owner, minter, user1 } = await loadFixture(deployNFTBusinessCardFixture);

      // Mint card
      await nftContract.connect(minter).mintBusinessCard(
        user1.address,
        "John Doe",
        "Engineer",
        "Tech Corp",
        "john@techcorp.com",
        "+1-555-0123",
        "https://johndoe.dev",
        "https://linkedin.com/in/johndoe",
        "technology",
        "Bio text",
        ["JavaScript"],
        "San Francisco, CA"
      );

      await expect(
        nftContract.connect(owner).verifyBusinessCard(1, true)
      ).to.emit(nftContract, "BusinessCardVerified")
       .withArgs(1, true);

      const card = await nftContract.getBusinessCard(1);
      expect(card.isVerified).to.be.true;
    });

    it("should only allow admins to verify cards", async function () {
      const { nftContract, minter, user1, user2 } = await loadFixture(deployNFTBusinessCardFixture);

      // Mint card
      await nftContract.connect(minter).mintBusinessCard(
        user1.address,
        "John Doe",
        "Engineer",
        "Tech Corp",
        "john@techcorp.com",
        "+1-555-0123",
        "https://johndoe.dev",
        "https://linkedin.com/in/johndoe",
        "technology",
        "Bio text",
        ["JavaScript"],
        "San Francisco, CA"
      );

      await expect(
        nftContract.connect(user2).verifyBusinessCard(1, true)
      ).to.be.revertedWith("AccessControl: account");
    });
  });

  describe("Card Queries and Search", function () {
    it("should get user's business card", async function () {
      const { nftContract, minter, user1 } = await loadFixture(deployNFTBusinessCardFixture);

      // No card initially
      expect(await nftContract.getUserBusinessCard(user1.address)).to.equal(0);

      // Mint card
      await nftContract.connect(minter).mintBusinessCard(
        user1.address,
        "John Doe",
        "Engineer",
        "Tech Corp",
        "john@techcorp.com",
        "+1-555-0123",
        "https://johndoe.dev",
        "https://linkedin.com/in/johndoe",
        "technology",
        "Bio text",
        ["JavaScript"],
        "San Francisco, CA"
      );

      expect(await nftContract.getUserBusinessCard(user1.address)).to.equal(1);
    });

    it("should search cards by industry", async function () {
      const { nftContract, minter, user1, user2, user3 } = await loadFixture(deployNFTBusinessCardFixture);

      // Mint cards in different industries
      await nftContract.connect(minter).mintBusinessCard(
        user1.address,
        "John Doe",
        "Engineer",
        "Tech Corp",
        "john@techcorp.com",
        "+1-555-0123",
        "https://johndoe.dev",
        "https://linkedin.com/in/johndoe",
        "technology",
        "Bio text",
        ["JavaScript"],
        "San Francisco, CA"
      );

      await nftContract.connect(minter).mintBusinessCard(
        user2.address,
        "Jane Smith",
        "Analyst",
        "Finance Corp",
        "jane@financecorp.com",
        "+1-555-0124",
        "https://janesmith.com",
        "https://linkedin.com/in/janesmith",
        "finance",
        "Bio text",
        ["Excel"],
        "New York, NY"
      );

      await nftContract.connect(minter).mintBusinessCard(
        user3.address,
        "Bob Wilson",
        "Developer",
        "Tech Startup",
        "bob@techstartup.com",
        "+1-555-0125",
        "https://bobwilson.dev",
        "https://linkedin.com/in/bobwilson",
        "technology",
        "Bio text",
        ["Python"],
        "Austin, TX"
      );

      const techCards = await nftContract.getCardsByIndustry("technology");
      expect(techCards.length).to.equal(2);
      expect(techCards).to.include(ethers.BigNumber.from(1));
      expect(techCards).to.include(ethers.BigNumber.from(3));

      const financeCards = await nftContract.getCardsByIndustry("finance");
      expect(financeCards.length).to.equal(1);
      expect(financeCards).to.include(ethers.BigNumber.from(2));
    });

    it("should search cards by company", async function () {
      const { nftContract, minter, user1, user2 } = await loadFixture(deployNFTBusinessCardFixture);

      // Mint cards from same company
      await nftContract.connect(minter).mintBusinessCard(
        user1.address,
        "John Doe",
        "Engineer",
        "Tech Corp",
        "john@techcorp.com",
        "+1-555-0123",
        "https://johndoe.dev",
        "https://linkedin.com/in/johndoe",
        "technology",
        "Bio text",
        ["JavaScript"],
        "San Francisco, CA"
      );

      await nftContract.connect(minter).mintBusinessCard(
        user2.address,
        "Jane Smith",
        "Manager",
        "Different Corp",
        "jane@differentcorp.com",
        "+1-555-0124",
        "https://janesmith.com",
        "https://linkedin.com/in/janesmith",
        "technology",
        "Bio text",
        ["Management"],
        "New York, NY"
      );

      const techCorpCards = await nftContract.getCardsByCompany("Tech Corp");
      expect(techCorpCards.length).to.equal(1);
      expect(techCorpCards).to.include(ethers.BigNumber.from(1));
    });

    it("should search cards by skills", async function () {
      const { nftContract, minter, user1, user2 } = await loadFixture(deployNFTBusinessCardFixture);

      // Mint cards with overlapping skills
      await nftContract.connect(minter).mintBusinessCard(
        user1.address,
        "John Doe",
        "Engineer",
        "Tech Corp",
        "john@techcorp.com",
        "+1-555-0123",
        "https://johndoe.dev",
        "https://linkedin.com/in/johndoe",
        "technology",
        "Bio text",
        ["JavaScript", "React", "Node.js"],
        "San Francisco, CA"
      );

      await nftContract.connect(minter).mintBusinessCard(
        user2.address,
        "Jane Smith",
        "Developer",
        "Different Corp",
        "jane@differentcorp.com",
        "+1-555-0124",
        "https://janesmith.com",
        "https://linkedin.com/in/janesmith",
        "technology",
        "Bio text",
        ["Python", "React", "Django"],
        "New York, NY"
      );

      const reactCards = await nftContract.getCardsBySkill("React");
      expect(reactCards.length).to.equal(2);
      expect(reactCards).to.include(ethers.BigNumber.from(1));
      expect(reactCards).to.include(ethers.BigNumber.from(2));

      const pythonCards = await nftContract.getCardsBySkill("Python");
      expect(pythonCards.length).to.equal(1);
      expect(pythonCards).to.include(ethers.BigNumber.from(2));
    });
  });

  describe("Token URI and Metadata", function () {
    it("should return correct token URI", async function () {
      const { nftContract, minter, user1 } = await loadFixture(deployNFTBusinessCardFixture);

      await nftContract.connect(minter).mintBusinessCard(
        user1.address,
        "John Doe",
        "Engineer",
        "Tech Corp",
        "john@techcorp.com",
        "+1-555-0123",
        "https://johndoe.dev",
        "https://linkedin.com/in/johndoe",
        "technology",
        "Bio text",
        ["JavaScript"],
        "San Francisco, CA"
      );

      const tokenURI = await nftContract.tokenURI(1);
      expect(tokenURI).to.equal("https://api.digbiz.com/metadata/1");
    });

    it("should allow admin to update base URI", async function () {
      const { nftContract, owner, minter, user1 } = await loadFixture(deployNFTBusinessCardFixture);

      await nftContract.connect(minter).mintBusinessCard(
        user1.address,
        "John Doe",
        "Engineer",
        "Tech Corp",
        "john@techcorp.com",
        "+1-555-0123",
        "https://johndoe.dev",
        "https://linkedin.com/in/johndoe",
        "technology",
        "Bio text",
        ["JavaScript"],
        "San Francisco, CA"
      );

      // Update base URI
      const newBaseURI = "https://newapi.digbiz.com/metadata/";
      await nftContract.connect(owner).setBaseURI(newBaseURI);

      const tokenURI = await nftContract.tokenURI(1);
      expect(tokenURI).to.equal("https://newapi.digbiz.com/metadata/1");
    });

    it("should revert for non-existent tokens", async function () {
      const { nftContract } = await loadFixture(deployNFTBusinessCardFixture);

      await expect(
        nftContract.tokenURI(999)
      ).to.be.revertedWith("ERC721: invalid token ID");
    });
  });

  describe("Transfer Restrictions", function () {
    it("should prevent transfers of business cards", async function () {
      const { nftContract, minter, user1, user2 } = await loadFixture(deployNFTBusinessCardFixture);

      // Mint card
      await nftContract.connect(minter).mintBusinessCard(
        user1.address,
        "John Doe",
        "Engineer",
        "Tech Corp",
        "john@techcorp.com",
        "+1-555-0123",
        "https://johndoe.dev",
        "https://linkedin.com/in/johndoe",
        "technology",
        "Bio text",
        ["JavaScript"],
        "San Francisco, CA"
      );

      // Try to transfer - should be blocked
      await expect(
        nftContract.connect(user1).transferFrom(user1.address, user2.address, 1)
      ).to.be.revertedWith("Business cards are soulbound and cannot be transferred");

      await expect(
        nftContract.connect(user1).safeTransferFrom(user1.address, user2.address, 1)
      ).to.be.revertedWith("Business cards are soulbound and cannot be transferred");
    });

    it("should prevent approvals", async function () {
      const { nftContract, minter, user1, user2 } = await loadFixture(deployNFTBusinessCardFixture);

      // Mint card
      await nftContract.connect(minter).mintBusinessCard(
        user1.address,
        "John Doe",
        "Engineer",
        "Tech Corp",
        "john@techcorp.com",
        "+1-555-0123",
        "https://johndoe.dev",
        "https://linkedin.com/in/johndoe",
        "technology",
        "Bio text",
        ["JavaScript"],
        "San Francisco, CA"
      );

      // Try to approve - should be blocked
      await expect(
        nftContract.connect(user1).approve(user2.address, 1)
      ).to.be.revertedWith("Business cards cannot be approved for transfer");

      await expect(
        nftContract.connect(user1).setApprovalForAll(user2.address, true)
      ).to.be.revertedWith("Business cards cannot be approved for transfer");
    });
  });

  describe("Card Statistics", function () {
    it("should track card statistics correctly", async function () {
      const { nftContract, minter, user1, user2, user3 } = await loadFixture(deployNFTBusinessCardFixture);

      expect(await nftContract.totalSupply()).to.equal(0);

      // Mint cards
      await nftContract.connect(minter).mintBusinessCard(
        user1.address,
        "John Doe",
        "Engineer",
        "Tech Corp",
        "john@techcorp.com",
        "+1-555-0123",
        "https://johndoe.dev",
        "https://linkedin.com/in/johndoe",
        "technology",
        "Bio text",
        ["JavaScript"],
        "San Francisco, CA"
      );

      await nftContract.connect(minter).mintBusinessCard(
        user2.address,
        "Jane Smith",
        "Manager",
        "Corp Inc",
        "jane@corp.com",
        "+1-555-0124",
        "https://janesmith.com",
        "https://linkedin.com/in/janesmith",
        "finance",
        "Bio text",
        ["Management"],
        "New York, NY"
      );

      expect(await nftContract.totalSupply()).to.equal(2);
      
      const stats = await nftContract.getContractStats();
      expect(stats.totalCards).to.equal(2);
      expect(stats.verifiedCards).to.equal(0);
      expect(stats.uniqueIndustries).to.equal(2);
    });

    it("should track industry distribution", async function () {
      const { nftContract, minter, user1, user2, user3 } = await loadFixture(deployNFTBusinessCardFixture);

      // Mint cards in different industries
      await nftContract.connect(minter).mintBusinessCard(
        user1.address,
        "John Doe",
        "Engineer",
        "Tech Corp",
        "john@techcorp.com",
        "+1-555-0123",
        "https://johndoe.dev",
        "https://linkedin.com/in/johndoe",
        "technology",
        "Bio text",
        ["JavaScript"],
        "San Francisco, CA"
      );

      await nftContract.connect(minter).mintBusinessCard(
        user2.address,
        "Jane Smith",
        "Developer",
        "Startup",
        "jane@startup.com",
        "+1-555-0124",
        "https://janesmith.com",
        "https://linkedin.com/in/janesmith",
        "technology",
        "Bio text",
        ["Python"],
        "New York, NY"
      );

      await nftContract.connect(minter).mintBusinessCard(
        user3.address,
        "Bob Wilson",
        "Analyst",
        "Finance Corp",
        "bob@finance.com",
        "+1-555-0125",
        "https://bobwilson.com",
        "https://linkedin.com/in/bobwilson",
        "finance",
        "Bio text",
        ["Excel"],
        "Chicago, IL"
      );

      const industryCount = await nftContract.getIndustryCount("technology");
      expect(industryCount).to.equal(2);
      
      const financeCount = await nftContract.getIndustryCount("finance");
      expect(financeCount).to.equal(1);
    });
  });

  describe("Emergency Functions", function () {
    it("should allow admin to pause and unpause contract", async function () {
      const { nftContract, owner, minter, user1 } = await loadFixture(deployNFTBusinessCardFixture);

      // Pause contract
      await nftContract.connect(owner).pause();
      expect(await nftContract.paused()).to.be.true;

      // Should not allow minting when paused
      await expect(
        nftContract.connect(minter).mintBusinessCard(
          user1.address,
          "John Doe",
          "Engineer",
          "Tech Corp",
          "john@techcorp.com",
          "+1-555-0123",
          "https://johndoe.dev",
          "https://linkedin.com/in/johndoe",
          "technology",
          "Bio text",
          ["JavaScript"],
          "San Francisco, CA"
        )
      ).to.be.revertedWith("Pausable: paused");

      // Unpause contract
      await nftContract.connect(owner).unpause();
      expect(await nftContract.paused()).to.be.false;

      // Should allow minting when unpaused
      await expect(
        nftContract.connect(minter).mintBusinessCard(
          user1.address,
          "John Doe",
          "Engineer",
          "Tech Corp",
          "john@techcorp.com",
          "+1-555-0123",
          "https://johndoe.dev",
          "https://linkedin.com/in/johndoe",
          "technology",
          "Bio text",
          ["JavaScript"],
          "San Francisco, CA"
        )
      ).to.not.be.reverted;
    });
  });
});