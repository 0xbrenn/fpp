// scripts/grant-roles-quick.js
// Quick script to grant MINTER_ROLE to PrimaryMarket and SecondaryMarket

async function main() {
  console.log("================================================================================");
  console.log("   GRANTING MINTER ROLES - Updated Addresses");
  console.log("================================================================================\n");

  const [admin] = await ethers.getSigners();
  console.log("Granting roles with account:", admin.address);
  console.log("");

  // ============================================================================
  // YOUR NEW DEPLOYMENT ADDRESSES
  // ============================================================================
  
  const POSITION_NFT = "0x99db2D8c1674Ee2C4957233BC71Cc4C264Da88a3";
  const PRIMARY_MARKET = "0xb13b87C32B0f739f1faE6CA49cFA210A8226D6D3";
  const SECONDARY_MARKET = "0x7939cd0FE1596c424945DC48533f51d1dE546b7C";
  const ASSET_REGISTRY = "0xC04B472240Bc240131abE96e3BBb70D0Ed712B8C";

  console.log("Contract Addresses:");
  console.log("  PositionNFT:", POSITION_NFT);
  console.log("  PrimaryMarket:", PRIMARY_MARKET);
  console.log("  SecondaryMarket:", SECONDARY_MARKET);
  console.log("  AssetRegistry:", ASSET_REGISTRY);
  console.log("");

  // ============================================================================
  // Get Contract Instance
  // ============================================================================
  
  const positionNFT = await ethers.getContractAt("OPNPositionNFT", POSITION_NFT);
  const MINTER_ROLE = await positionNFT.MINTER_ROLE();
  
  console.log("MINTER_ROLE hash:", MINTER_ROLE);
  console.log("");

  // ============================================================================
  // Check Current Roles
  // ============================================================================
  
  console.log("Checking current roles...");
  const primaryHasMinter = await positionNFT.hasRole(MINTER_ROLE, PRIMARY_MARKET);
  const secondaryHasMinter = await positionNFT.hasRole(MINTER_ROLE, SECONDARY_MARKET);
  
  console.log("  PrimaryMarket has MINTER_ROLE:", primaryHasMinter ? "✅" : "❌");
  console.log("  SecondaryMarket has MINTER_ROLE:", secondaryHasMinter ? "✅" : "❌");
  console.log("");

  // ============================================================================
  // Grant Roles
  // ============================================================================
  
  if (!primaryHasMinter) {
    console.log("Granting MINTER_ROLE to PrimaryMarket...");
    const tx1 = await positionNFT.grantRole(MINTER_ROLE, PRIMARY_MARKET);
    console.log("  Transaction sent:", tx1.hash);
    await tx1.wait();
    console.log("  ✅ MINTER_ROLE granted to PrimaryMarket");
    console.log("");
  } else {
    console.log("✅ PrimaryMarket already has MINTER_ROLE");
    console.log("");
  }
  
  if (!secondaryHasMinter) {
    console.log("Granting MINTER_ROLE to SecondaryMarket...");
    const tx2 = await positionNFT.grantRole(MINTER_ROLE, SECONDARY_MARKET);
    console.log("  Transaction sent:", tx2.hash);
    await tx2.wait();
    console.log("  ✅ MINTER_ROLE granted to SecondaryMarket");
    console.log("");
  } else {
    console.log("✅ SecondaryMarket already has MINTER_ROLE");
    console.log("");
  }

  // ============================================================================
  // Update AssetRegistry
  // ============================================================================
  
  console.log("Updating AssetRegistry with new PositionNFT address...");
  const assetRegistry = await ethers.getContractAt("OPNAssetRegistry", ASSET_REGISTRY);
  
  try {
    const currentPositionNFT = await assetRegistry.positionNFTContract();
    console.log("  Current PositionNFT in registry:", currentPositionNFT);
    
    if (currentPositionNFT.toLowerCase() !== POSITION_NFT.toLowerCase()) {
      console.log("  Updating to new address...");
      const tx = await assetRegistry.setPositionNFTContract(POSITION_NFT);
      console.log("  Transaction sent:", tx.hash);
      await tx.wait();
      console.log("  ✅ AssetRegistry updated");
    } else {
      console.log("  ✅ AssetRegistry already has correct address");
    }
  } catch (error) {
    console.log("  ⚠️  Could not update AssetRegistry:", error.message);
  }
  console.log("");

  // ============================================================================
  // Verify
  // ============================================================================
  
  console.log("Verifying roles...");
  const finalPrimaryHasMinter = await positionNFT.hasRole(MINTER_ROLE, PRIMARY_MARKET);
  const finalSecondaryHasMinter = await positionNFT.hasRole(MINTER_ROLE, SECONDARY_MARKET);
  
  console.log("  PrimaryMarket has MINTER_ROLE:", finalPrimaryHasMinter ? "✅" : "❌");
  console.log("  SecondaryMarket has MINTER_ROLE:", finalSecondaryHasMinter ? "✅" : "❌");
  console.log("");

  if (finalPrimaryHasMinter && finalSecondaryHasMinter) {
    console.log("================================================================================");
    console.log("🎉 SUCCESS! All roles granted!");
    console.log("================================================================================");
    console.log("");
    console.log("You can now:");
    console.log("  ✅ Purchase from primary market");
    console.log("  ✅ Purchase from secondary market");
    console.log("  ✅ P2P purchases will show correct prices");
    console.log("");
    console.log("Next: Update frontend CONTRACT_ADDRESSES in src/utils/contracts.js:");
    console.log("");
    console.log("export const CONTRACT_ADDRESSES = {");
    console.log("  ASSET_REGISTRY: '" + ASSET_REGISTRY + "',");
    console.log("  POSITION_NFT: '" + POSITION_NFT + "',");
    console.log("  PRIMARY_MARKET: '" + PRIMARY_MARKET + "',");
    console.log("  SECONDARY_MARKET: '" + SECONDARY_MARKET + "',");
    console.log("  GOVERNANCE: '0xd7714d0aaC4a07C9C51e832E0e75FbB9C87b374b'");
    console.log("};");
  } else {
    console.log("⚠️  Some roles failed to grant. You may need admin privileges.");
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