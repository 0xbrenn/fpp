// scripts/fix-primarymarket-permissions.js
// Hardhat script to grant PrimaryMarket permission to call recordSale() in AssetRegistry
//npx hardhat run scripts/fix-primarymarket-permissions.js --network opn

async function main() {
  console.log("================================================================================");
  console.log("   FIXING PRIMARYMARKET PERMISSIONS");
  console.log("================================================================================\n");

  const [signer] = await ethers.getSigners();
  
  console.log("Using wallet:", signer.address);
  console.log("");

  // ============================================================================
  // YOUR DEPLOYED CONTRACT ADDRESSES
  // ============================================================================
  
  const ASSET_REGISTRY = "0x7b247945E7Ff41E5b3C703C2a69a553421Ada111";
  const PRIMARY_MARKET = "0x5207C4aeb5D6B29B3447634a0d745CC0120e73fa";

  console.log("Contract Addresses:");
  console.log("  AssetRegistry:", ASSET_REGISTRY);
  console.log("  PrimaryMarket:", PRIMARY_MARKET);
  console.log("");

  // ============================================================================
  // Connect to AssetRegistry
  // ============================================================================
  
  const assetRegistry = await ethers.getContractAt("OPNAssetRegistry", ASSET_REGISTRY);
  
  // Get ADMIN_ROLE
  const ADMIN_ROLE = await assetRegistry.ADMIN_ROLE();
  console.log("ADMIN_ROLE hash:", ADMIN_ROLE);
  console.log("");

  // ============================================================================
  // Check Current Permissions
  // ============================================================================
  
  console.log("Checking current permissions...");
  const hasRole = await assetRegistry.hasRole(ADMIN_ROLE, PRIMARY_MARKET);
  
  console.log("  PrimaryMarket has ADMIN_ROLE:", hasRole ? "✅" : "❌");
  console.log("");

  if (hasRole) {
    console.log("✅ PrimaryMarket already has ADMIN_ROLE!");
    console.log("✅ Permissions are correct - PrimaryMarket can call recordSale()");
    console.log("");
    console.log("If you're still getting errors, the issue is elsewhere.");
    return;
  }

  // ============================================================================
  // Grant ADMIN_ROLE to PrimaryMarket
  // ============================================================================
  
  console.log("❌ PrimaryMarket does NOT have ADMIN_ROLE");
  console.log("⏳ Granting ADMIN_ROLE to PrimaryMarket...\n");
  
  try {
    const tx = await assetRegistry.grantRole(ADMIN_ROLE, PRIMARY_MARKET);
    console.log("📤 Transaction sent:", tx.hash);
    console.log("⏳ Waiting for confirmation...");
    
    const receipt = await tx.wait();
    
    if (receipt.status === 1) {
      console.log("✅ Transaction confirmed!");
      console.log("✅ PrimaryMarket now has ADMIN_ROLE");
      console.log("✅ PrimaryMarket can now call recordSale()");
      console.log("");
      console.log("🎉 Permissions fixed! Try your purchase again!");
    } else {
      console.log("❌ Transaction failed!");
    }
    
    console.log("");
    console.log("Transaction Details:");
    console.log("  Gas used:", receipt.gasUsed.toString());
    console.log("  Block:", receipt.blockNumber);
    
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    
    if (error.message.includes("AccessControl")) {
      console.log("\n⚠️  You don't have admin permissions!");
      console.log("   Only the AssetRegistry admin can grant roles.");
      console.log("   Make sure you're using the wallet that deployed the contracts.");
    }
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