const { network } = require("hardhat");

/**
 * Deploy NFTBusinessCard Contract
 * 
 * This script deploys the NFT business card contract with proper
 * configuration and role setup for minting and management.
 */

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log, get } = deployments;
  const { deployer, admin, minter } = await getNamedAccounts();

  log("----------------------------------------------------");
  log("Deploying NFTBusinessCard contract...");
  log("Network:", network.name);
  log("Deployer:", deployer);
  log("Admin:", admin);
  log("Minter:", minter);
  log("----------------------------------------------------");

  // Get base URI from environment or use default
  const baseURI = process.env.NFT_BASE_URI || "https://api.digbiz.com/metadata/";

  const args = [
    "DigBiz Business Cards", // Collection name
    "DBBC",                  // Collection symbol
    baseURI                  // Base URI for metadata
  ];
  
  const nftBusinessCard = await deploy("NFTBusinessCard", {
    from: deployer,
    args: args,
    log: true,
    deterministicDeployment: false,
    waitConfirmations: network.name === "hardhat" ? 1 : 6,
  });

  log(`NFTBusinessCard deployed at: ${nftBusinessCard.address}`);

  // Setup roles and initial configuration
  if (network.name !== "hardhat" || process.env.SETUP_ROLES === "true") {
    log("Setting up roles and configuration...");
    
    const nftContract = await ethers.getContractAt("NFTBusinessCard", nftBusinessCard.address);
    
    // Get role identifiers
    const MINTER_ROLE = await nftContract.MINTER_ROLE();
    const DEFAULT_ADMIN_ROLE = await nftContract.DEFAULT_ADMIN_ROLE();
    
    // Grant minter role to specified minter account
    if (minter && minter !== deployer) {
      log(`Granting MINTER_ROLE to: ${minter}`);
      const grantMinterTx = await nftContract.grantRole(MINTER_ROLE, minter);
      await grantMinterTx.wait(1);
      log("MINTER_ROLE granted successfully");
    }
    
    // Also grant minter role to the backend service account if specified
    const backendMinter = process.env.BACKEND_MINTER_ADDRESS;
    if (backendMinter && backendMinter !== minter && backendMinter !== deployer) {
      log(`Granting MINTER_ROLE to backend service: ${backendMinter}`);
      const grantBackendMinterTx = await nftContract.grantRole(MINTER_ROLE, backendMinter);
      await grantBackendMinterTx.wait(1);
      log("Backend MINTER_ROLE granted successfully");
    }
    
    // Transfer admin role to admin account if different from deployer
    if (admin && admin !== deployer) {
      log(`Transferring DEFAULT_ADMIN_ROLE to admin: ${admin}`);
      
      // Grant admin role to new admin
      const grantAdminTx = await nftContract.grantRole(DEFAULT_ADMIN_ROLE, admin);
      await grantAdminTx.wait(1);
      
      // Renounce admin role from deployer
      const renounceAdminTx = await nftContract.renounceRole(DEFAULT_ADMIN_ROLE, deployer);
      await renounceAdminTx.wait(1);
      
      log("Admin role transferred successfully");
    }
    
    log("Role configuration completed");
  }

  // Set up integration with other contracts if they exist
  if (network.name !== "hardhat" || process.env.SETUP_INTEGRATIONS === "true") {
    log("Setting up contract integrations...");
    
    try {
      // Get Identity contract if deployed
      const identityDeployment = await get("DigBizIdentity").catch(() => null);
      if (identityDeployment) {
        log(`Identity contract found at: ${identityDeployment.address}`);
        // Here you would set up any necessary integrations
        // For example, allowing the Identity contract to verify business cards
      }

      // Get ReputationToken contract if deployed
      const tokenDeployment = await get("ReputationToken").catch(() => null);
      if (tokenDeployment) {
        log(`ReputationToken contract found at: ${tokenDeployment.address}`);
        // Here you would set up any necessary integrations
        // For example, allowing business card creation to mint reputation tokens
      }
      
      log("Contract integrations configured");
    } catch (error) {
      log("Integration setup skipped - dependent contracts not found");
    }
  }

  // Configure royalties if supported
  if (network.name !== "hardhat" || process.env.SETUP_ROYALTIES === "true") {
    log("Configuring royalties...");
    
    const nftContract = await ethers.getContractAt("NFTBusinessCard", nftBusinessCard.address);
    
    // Set royalty recipient and percentage (if contract supports royalties)
    const royaltyRecipient = process.env.ROYALTY_RECIPIENT || admin || deployer;
    const royaltyPercentage = process.env.ROYALTY_PERCENTAGE || 250; // 2.5%
    
    try {
      // This would require EIP-2981 implementation in the contract
      if (typeof nftContract.setDefaultRoyalty === 'function') {
        const setRoyaltyTx = await nftContract.setDefaultRoyalty(royaltyRecipient, royaltyPercentage);
        await setRoyaltyTx.wait(1);
        log(`Royalties set to ${royaltyPercentage / 100}% for recipient: ${royaltyRecipient}`);
      }
    } catch (error) {
      log("Royalty configuration skipped - not supported by contract");
    }
  }

  // Verify contract on block explorers
  if (network.name !== "hardhat" && process.env.VERIFY_CONTRACTS === "true") {
    log("Verifying contract on block explorer...");
    
    try {
      await hre.run("verify:verify", {
        address: nftBusinessCard.address,
        constructorArguments: args,
      });
      log("Contract verified successfully");
    } catch (error) {
      log("Contract verification failed:", error.message);
    }
  }

  // Output deployment summary
  log("----------------------------------------------------");
  log("NFTBusinessCard deployment completed!");
  log("Contract Address:", nftBusinessCard.address);
  log("Collection Name: DigBiz Business Cards");
  log("Collection Symbol: DBBC");
  log("Base URI:", baseURI);
  
  // Log role assignments
  if (minter && minter !== deployer) {
    log("Minter Role:", minter);
  }
  if (admin && admin !== deployer) {
    log("Admin Role:", admin);
  }
  
  log("----------------------------------------------------");

  return true;
};

module.exports.tags = ["NFTBusinessCard", "nft", "businesscard", "core"];
module.exports.dependencies = [];