// scripts/fix-primarymarket-permissions.js
// Hardhat script to grant PrimaryMarket permission AND configure SecondaryMarket
//npx hardhat run scripts/fix-primarymarket-permissions.js --network opn

async function main() {
  console.log("================================================================================");
  console.log("   POST-DEPLOYMENT CONFIGURATION SCRIPT");
  console.log("================================================================================\n");

  const [signer] = await ethers.getSigners();
  
  console.log("Using wallet:", signer.address);
  console.log("");

  // ============================================================================
  // YOUR DEPLOYED CONTRACT ADDRESSES
  // ============================================================================
  
  const ASSET_REGISTRY = "0x3CD6d27C575e3E1433cda1187Ed14D769A1073f2";
  const PRIMARY_MARKET = "0x104f9E5f70B57E677fFC7c7d76B5C38607CB49A4";
  const SECONDARY_MARKET = "0x6392aafA7D358cCAAce1Cc658F6603C0E8E0104f"; // ✅ ADD THIS

  console.log("Contract Addresses:");
  console.log("  AssetRegistry:", ASSET_REGISTRY);
  console.log("  PrimaryMarket:", PRIMARY_MARKET);
  console.log("  SecondaryMarket:", SECONDARY_MARKET);
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
  // STEP 1: Check/Grant PrimaryMarket ADMIN_ROLE
  // ============================================================================
  
  console.log("STEP 1: Checking PrimaryMarket permissions...");
  const hasRole = await assetRegistry.hasRole(ADMIN_ROLE, PRIMARY_MARKET);
  
  console.log("  PrimaryMarket has ADMIN_ROLE:", hasRole ? "✅" : "❌");
  console.log("");

  if (!hasRole) {
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
      } else {
        console.log("❌ Transaction failed!");
      }
      
      console.log("");
      console.log("Transaction Details:");
      console.log("  Gas used:", receipt.gasUsed.toString());
      console.log("  Block:", receipt.blockNumber);
      console.log("");
      
    } catch (error) {
      console.error("\n❌ Error:", error.message);
      
      if (error.message.includes("AccessControl")) {
        console.log("\n⚠️  You don't have admin permissions!");
        console.log("   Only the AssetRegistry admin can grant roles.");
        console.log("   Make sure you're using the wallet that deployed the contracts.");
      }
      console.log("");
    }
  } else {
    console.log("✅ PrimaryMarket already has ADMIN_ROLE!");
    console.log("");
  }

  // ============================================================================
  // STEP 2: Configure SecondaryMarket Contract Address
  // ============================================================================
  
  console.log("STEP 2: Configuring SecondaryMarket...");
  
  try {
    // Check if already set
    const currentSecondaryMarket = await assetRegistry.secondaryMarketContract();
    console.log("  Current SecondaryMarket address:", currentSecondaryMarket);
    console.log("");
    
    if (currentSecondaryMarket === "0x0000000000000000000000000000000000000000") {
      console.log("❌ SecondaryMarket NOT configured");
      console.log("⏳ Setting SecondaryMarket contract address...\n");
      
      const tx = await assetRegistry.setSecondaryMarketContract(SECONDARY_MARKET);
      console.log("📤 Transaction sent:", tx.hash);
      console.log("⏳ Waiting for confirmation...");
      
      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        console.log("✅ Transaction confirmed!");
        console.log("✅ SecondaryMarket configured successfully!");
        console.log("✅ Dynamic pricing will now work!");
      } else {
        console.log("❌ Transaction failed!");
      }
      
      console.log("");
      console.log("Transaction Details:");
      console.log("  Gas used:", receipt.gasUsed.toString());
      console.log("  Block:", receipt.blockNumber);
      console.log("");
      
    } else if (currentSecondaryMarket.toLowerCase() === SECONDARY_MARKET.toLowerCase()) {
      console.log("✅ SecondaryMarket already configured correctly!");
      console.log("✅ Address matches:", SECONDARY_MARKET);
      console.log("");
    } else {
      console.log("⚠️  WARNING: SecondaryMarket is set to a different address!");
      console.log("   Expected:", SECONDARY_MARKET);
      console.log("   Actual:  ", currentSecondaryMarket);
      console.log("   Cannot change (already set - security feature)");
      console.log("");
    }
    
  } catch (error) {
    console.error("\n❌ Error configuring SecondaryMarket:", error.message);
    
    if (error.message.includes("Already set")) {
      console.log("\n⚠️  SecondaryMarket address is already set!");
      console.log("   This can only be set once for security reasons.");
      console.log("   Current configuration is locked.");
    }
    console.log("");
  }

  // ============================================================================
  // FINAL STATUS CHECK
  // ============================================================================
  
  console.log("================================================================================");
  console.log("   FINAL CONFIGURATION STATUS");
  console.log("================================================================================\n");
  
  try {
    // Check PrimaryMarket role
    const primaryHasRole = await assetRegistry.hasRole(ADMIN_ROLE, PRIMARY_MARKET);
    console.log("✅ PrimaryMarket ADMIN_ROLE:", primaryHasRole ? "GRANTED" : "NOT GRANTED");
    
    // Check SecondaryMarket address
    const secondaryMarketAddr = await assetRegistry.secondaryMarketContract();
    const secondaryConfigured = secondaryMarketAddr !== "0x0000000000000000000000000000000000000000";
    console.log("✅ SecondaryMarket configured:", secondaryConfigured ? "YES" : "NO");
    
    if (secondaryConfigured) {
      console.log("   Address:", secondaryMarketAddr);
    }
    
    console.log("");
    
    if (primaryHasRole && secondaryConfigured) {
      console.log("🎉 ALL CONFIGURATIONS COMPLETE!");
      console.log("🎉 Your contracts are ready to use!");
      console.log("");
      console.log("✅ Primary Market: Can record sales");
      console.log("✅ Secondary Market: Can update prices");
      console.log("✅ Dynamic pricing: ENABLED");
    } else {
      console.log("⚠️  CONFIGURATION INCOMPLETE:");
      if (!primaryHasRole) console.log("   ❌ PrimaryMarket needs ADMIN_ROLE");
      if (!secondaryConfigured) console.log("   ❌ SecondaryMarket needs to be configured");
    }
    
  } catch (error) {
    console.error("Error checking final status:", error.message);
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