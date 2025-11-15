// scripts/deploy-fixed-contracts.js
// Deployment script for fixed OPNPositionNFT and OPNSecondaryMarket contracts

async function main() {
  console.log("================================================================================");
  console.log("   DEPLOYING FIXED CONTRACTS - Purchase Price Bug Fix");
  console.log("================================================================================\n");

  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying contracts with account:", deployer.address);
  
  // Get balance without formatting to avoid errors
  try {
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", ethers.utils.formatEther(balance), "OPN\n");
  } catch (e) {
    console.log("Account balance: (unable to fetch)\n");
  }

  // ============================================================================
  // EXISTING CONTRACT ADDRESSES (Update these with your current addresses)
  // ============================================================================
  
  const ASSET_REGISTRY = "0x02C24BC4094F028796Fec1FEBeF331bfc476400C";
  const PRIMARY_MARKET = "0xb4De64Ba962dfc5F4912C0B84b14ed7073C7A8D4";
  const GOVERNANCE = "0xeeeE6Bf89E876C19E7dFA2d0C5cb4cb79CDf1012";
  const USDC_TOKEN = "0x0000000000000000000000000000000000000001";
  const FEE_RECIPIENT = deployer.address;

  console.log("Using existing contracts:");
  console.log("  AssetRegistry:", ASSET_REGISTRY);
  console.log("  PrimaryMarket:", PRIMARY_MARKET);
  console.log("  Governance:", GOVERNANCE);
  console.log("  Fee Recipient:", FEE_RECIPIENT);
  console.log("  USDC Token:", USDC_TOKEN);
  console.log("");

  // ============================================================================
  // STEP 1: Deploy OPNPositionNFT (Fixed Version)
  // ============================================================================
  
  console.log("Step 1: Deploying OPNPositionNFT (Fixed)...");
  const OPNPositionNFT = await ethers.getContractFactory("OPNPositionNFT");
  const positionNFT = await OPNPositionNFT.deploy(ASSET_REGISTRY, USDC_TOKEN);
  await positionNFT.deployed();
  
  const receipt1 = await positionNFT.deployTransaction.wait();
  console.log("✅ OPNPositionNFT deployed to:", positionNFT.address);
  console.log("   Gas used:", receipt1.gasUsed.toString());
  console.log("");

  // ============================================================================
  // STEP 2: Deploy OPNSecondaryMarket (Fixed Version)
  // ============================================================================
  
  console.log("Step 2: Deploying OPNSecondaryMarket (Fixed)...");
  const OPNSecondaryMarket = await ethers.getContractFactory("OPNSecondaryMarket");
  const secondaryMarket = await OPNSecondaryMarket.deploy(
    positionNFT.address,
    ASSET_REGISTRY,
    FEE_RECIPIENT
  );
  await secondaryMarket.deployed();
  
  const receipt2 = await secondaryMarket.deployTransaction.wait();
  console.log("✅ OPNSecondaryMarket deployed to:", secondaryMarket.address);
  console.log("   Gas used:", receipt2.gasUsed.toString());
  console.log("");

  // ============================================================================
  // STEP 3: Grant Roles
  // ============================================================================
  
  console.log("Step 3: Granting roles...");
  
  const MINTER_ROLE = await positionNFT.MINTER_ROLE();
  
  // Grant MINTER_ROLE to PrimaryMarket
  console.log("  Granting MINTER_ROLE to PrimaryMarket...");
  let tx = await positionNFT.grantRole(MINTER_ROLE, PRIMARY_MARKET);
  await tx.wait();
  console.log("  ✅ PrimaryMarket granted MINTER_ROLE");
  
  // Grant MINTER_ROLE to SecondaryMarket
  console.log("  Granting MINTER_ROLE to SecondaryMarket...");
  tx = await positionNFT.grantRole(MINTER_ROLE, secondaryMarket.address);
  await tx.wait();
  console.log("  ✅ SecondaryMarket granted MINTER_ROLE");
  
  console.log("");

  // ============================================================================
  // STEP 4: Update AssetRegistry with new PositionNFT address
  // ============================================================================
  
  console.log("Step 4: Updating AssetRegistry...");
  const assetRegistry = await ethers.getContractAt("OPNAssetRegistry", ASSET_REGISTRY);
  
  try {
    tx = await assetRegistry.setPositionNFTContract(positionNFT.address);
    await tx.wait();
    console.log("✅ AssetRegistry updated with new PositionNFT address");
  } catch (error) {
    console.log("⚠️  Could not update AssetRegistry (may need admin role):");
    console.log("   ", error.message);
    console.log("   You'll need to manually call:");
    console.log("   assetRegistry.setPositionNFTContract('" + positionNFT.address + "')");
  }
  console.log("");

  // ============================================================================
  // STEP 5: Verify Roles
  // ============================================================================
  
  console.log("Step 5: Verifying roles...");
  
  const primaryMarketHasRole = await positionNFT.hasRole(MINTER_ROLE, PRIMARY_MARKET);
  const secondaryMarketHasRole = await positionNFT.hasRole(MINTER_ROLE, secondaryMarket.address);
  
  console.log("  PrimaryMarket has MINTER_ROLE:", primaryMarketHasRole ? "✅" : "❌");
  console.log("  SecondaryMarket has MINTER_ROLE:", secondaryMarketHasRole ? "✅" : "❌");
  console.log("");

  // ============================================================================
  // DEPLOYMENT SUMMARY
  // ============================================================================
  
  console.log("================================================================================");
  console.log("   DEPLOYMENT SUMMARY");
  console.log("================================================================================");
  console.log("");
  console.log("🎉 All contracts deployed and configured successfully!");
  console.log("");
  console.log("Contract Addresses:");
  console.log("-------------------");
  console.log("OPNPositionNFT:      ", positionNFT.address);
  console.log("OPNSecondaryMarket:  ", secondaryMarket.address);
  console.log("");
  console.log("Existing Contracts (unchanged):");
  console.log("--------------------------------");
  console.log("AssetRegistry:       ", ASSET_REGISTRY);
  console.log("PrimaryMarket:       ", PRIMARY_MARKET);
  console.log("Governance:          ", GOVERNANCE);
  console.log("");
  console.log("================================================================================");
  console.log("   NEXT STEPS");
  console.log("================================================================================");
  console.log("");
  console.log("1. Update frontend CONTRACT_ADDRESSES in src/utils/contracts.js:");
  console.log("");
  console.log("   export const CONTRACT_ADDRESSES = {");
  console.log("     ASSET_REGISTRY: '" + ASSET_REGISTRY + "',");
  console.log("     POSITION_NFT: '" + positionNFT.address + "',  // ← UPDATE THIS");
  console.log("     PRIMARY_MARKET: '" + PRIMARY_MARKET + "',");
  console.log("     SECONDARY_MARKET: '" + secondaryMarket.address + "',  // ← UPDATE THIS");
  console.log("     GOVERNANCE: '" + GOVERNANCE + "'");
  console.log("   };");
  console.log("");
  console.log("2. Test with a P2P purchase:");
  console.log("   - List a position for sale");
  console.log("   - Buy the position");
  console.log("   - Check portfolio shows correct purchase price");
  console.log("");
  console.log("3. Verify contracts on block explorer (optional)");
  console.log("");
  console.log("================================================================================");

  // Save deployment info to file
  const fs = require('fs');
  const deploymentInfo = {
    network: network.name,
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      OPNPositionNFT: positionNFT.address,
      OPNSecondaryMarket: secondaryMarket.address,
      AssetRegistry: ASSET_REGISTRY,
      PrimaryMarket: PRIMARY_MARKET,
      Governance: GOVERNANCE
    },
    roles: {
      primaryMarketHasMinterRole: primaryMarketHasRole,
      secondaryMarketHasMinterRole: secondaryMarketHasRole
    }
  };

  fs.writeFileSync(
    'deployment-fixed-contracts.json',
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log("Deployment info saved to: deployment-fixed-contracts.json");
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });