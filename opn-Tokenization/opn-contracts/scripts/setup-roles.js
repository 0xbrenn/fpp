// scripts/setup-roles.js
// Manual role setup script if needed after deployment

const hre = require("hardhat");

async function main() {
  console.log("================================================================================");
  console.log("   SETUP ROLES - Manual Configuration Script");
  console.log("================================================================================\n");

  const [admin] = await hre.ethers.getSigners();
  console.log("Setting up roles with account:", admin.address);
  console.log("Account balance:", hre.ethers.utils.formatEther(await admin.getBalance()), "OPN\n");

  // ============================================================================
  // CONTRACT ADDRESSES - Update these after deployment
  // ============================================================================
  
  const POSITION_NFT = "0xYOUR_NEW_POSITION_NFT_ADDRESS";  // ← UPDATE THIS
  const PRIMARY_MARKET = "0x49ac1b86b1c1a1da43b2ed13d8d5c45caa1e46e9";
  const SECONDARY_MARKET = "0xYOUR_NEW_SECONDARY_MARKET_ADDRESS";  // ← UPDATE THIS
  const ASSET_REGISTRY = "0x02c24bc4094f028796fec1febef331bfc476400c";

  console.log("Using addresses:");
  console.log("  PositionNFT:", POSITION_NFT);
  console.log("  PrimaryMarket:", PRIMARY_MARKET);
  console.log("  SecondaryMarket:", SECONDARY_MARKET);
  console.log("  AssetRegistry:", ASSET_REGISTRY);
  console.log("");

  // ============================================================================
  // Connect to Contracts
  // ============================================================================
  
  const positionNFT = await hre.ethers.getContractAt("OPNPositionNFT", POSITION_NFT);
  const assetRegistry = await hre.ethers.getContractAt("OPNAssetRegistry", ASSET_REGISTRY);
  
  const MINTER_ROLE = await positionNFT.MINTER_ROLE();
  const ADMIN_ROLE = await positionNFT.ADMIN_ROLE();
  
  console.log("Role Hashes:");
  console.log("  MINTER_ROLE:", MINTER_ROLE);
  console.log("  ADMIN_ROLE:", ADMIN_ROLE);
  console.log("");

  // ============================================================================
  // STEP 1: Check Current Roles
  // ============================================================================
  
  console.log("Step 1: Checking current roles...");
  
  const adminHasAdmin = await positionNFT.hasRole(ADMIN_ROLE, admin.address);
  const primaryHasMinter = await positionNFT.hasRole(MINTER_ROLE, PRIMARY_MARKET);
  const secondaryHasMinter = await positionNFT.hasRole(MINTER_ROLE, SECONDARY_MARKET);
  
  console.log("  Admin has ADMIN_ROLE:", adminHasAdmin ? "✅" : "❌");
  console.log("  PrimaryMarket has MINTER_ROLE:", primaryHasMinter ? "✅" : "❌");
  console.log("  SecondaryMarket has MINTER_ROLE:", secondaryHasMinter ? "✅" : "❌");
  console.log("");

  // ============================================================================
  // STEP 2: Grant MINTER_ROLE to PrimaryMarket (if needed)
  // ============================================================================
  
  if (!primaryHasMinter) {
    console.log("Step 2: Granting MINTER_ROLE to PrimaryMarket...");
    try {
      const tx = await positionNFT.grantRole(MINTER_ROLE, PRIMARY_MARKET);
      await tx.wait();
      console.log("✅ MINTER_ROLE granted to PrimaryMarket");
      console.log("   Transaction hash:", tx.hash);
    } catch (error) {
      console.log("❌ Failed to grant role:", error.message);
    }
  } else {
    console.log("Step 2: PrimaryMarket already has MINTER_ROLE ✅");
  }
  console.log("");

  // ============================================================================
  // STEP 3: Grant MINTER_ROLE to SecondaryMarket (if needed)
  // ============================================================================
  
  if (!secondaryHasMinter) {
    console.log("Step 3: Granting MINTER_ROLE to SecondaryMarket...");
    try {
      const tx = await positionNFT.grantRole(MINTER_ROLE, SECONDARY_MARKET);
      await tx.wait();
      console.log("✅ MINTER_ROLE granted to SecondaryMarket");
      console.log("   Transaction hash:", tx.hash);
    } catch (error) {
      console.log("❌ Failed to grant role:", error.message);
    }
  } else {
    console.log("Step 3: SecondaryMarket already has MINTER_ROLE ✅");
  }
  console.log("");

  // ============================================================================
  // STEP 4: Update AssetRegistry (if needed)
  // ============================================================================
  
  console.log("Step 4: Updating AssetRegistry...");
  try {
    const currentPositionNFT = await assetRegistry.positionNFTContract();
    console.log("  Current PositionNFT in registry:", currentPositionNFT);
    
    if (currentPositionNFT.toLowerCase() !== POSITION_NFT.toLowerCase()) {
      console.log("  Updating to new address...");
      const tx = await assetRegistry.setPositionNFTContract(POSITION_NFT);
      await tx.wait();
      console.log("✅ AssetRegistry updated with new PositionNFT address");
      console.log("   Transaction hash:", tx.hash);
    } else {
      console.log("✅ AssetRegistry already using correct PositionNFT address");
    }
  } catch (error) {
    console.log("❌ Could not update AssetRegistry:", error.message);
    console.log("   You may need to run this with an admin account");
  }
  console.log("");

  // ============================================================================
  // STEP 5: Verify All Roles
  // ============================================================================
  
  console.log("Step 5: Final verification...");
  
  const finalPrimaryHasMinter = await positionNFT.hasRole(MINTER_ROLE, PRIMARY_MARKET);
  const finalSecondaryHasMinter = await positionNFT.hasRole(MINTER_ROLE, SECONDARY_MARKET);
  
  console.log("  PrimaryMarket has MINTER_ROLE:", finalPrimaryHasMinter ? "✅" : "❌");
  console.log("  SecondaryMarket has MINTER_ROLE:", finalSecondaryHasMinter ? "✅" : "❌");
  console.log("");

  // ============================================================================
  // SUMMARY
  // ============================================================================
  
  console.log("================================================================================");
  console.log("   SETUP SUMMARY");
  console.log("================================================================================");
  console.log("");
  
  if (finalPrimaryHasMinter && finalSecondaryHasMinter) {
    console.log("🎉 All roles configured successfully!");
    console.log("");
    console.log("Your contracts are ready to use:");
    console.log("  ✅ PrimaryMarket can mint positions");
    console.log("  ✅ SecondaryMarket can split positions");
    console.log("");
    console.log("Next steps:");
    console.log("  1. Update frontend CONTRACT_ADDRESSES");
    console.log("  2. Test primary market purchase");
    console.log("  3. Test secondary market purchase");
    console.log("  4. Verify portfolio shows correct prices");
  } else {
    console.log("⚠️  Some roles are not configured correctly:");
    if (!finalPrimaryHasMinter) {
      console.log("  ❌ PrimaryMarket missing MINTER_ROLE");
    }
    if (!finalSecondaryHasMinter) {
      console.log("  ❌ SecondaryMarket missing MINTER_ROLE");
    }
    console.log("");
    console.log("Please run this script with an admin account or manually grant roles.");
  }
  console.log("");
  console.log("================================================================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });