// Debug script to test tier access logic
console.log('🔧 Tier Access Debug Test');
console.log('========================');

// Mock tier hierarchy
const tierHierarchy = {
  basic: 1,
  premium: 2,
  vip: 3,
  vvip: 4
};

// Test function that mimics useTierAccessControl logic
function checkTierAccess(userTier, hostTier, allowHigherTier = true) {
  console.log(`\n🧪 Testing: User(${userTier}) accessing Host(${hostTier})`);
  
  const userLevel = tierHierarchy[userTier];
  const hostLevel = tierHierarchy[hostTier];
  
  if (allowHigherTier) {
    const canAccess = userLevel >= hostLevel;
    console.log(`   User Level: ${userLevel}, Host Level: ${hostLevel}`);
    console.log(`   Can Access: ${canAccess ? '✅ YES' : '❌ NO'}`);
    console.log(`   Reason: ${canAccess ? 'User tier is equal or higher' : `User needs ${hostTier} tier or higher`}`);
    return canAccess;
  }
  
  const canAccess = userTier === hostTier;
  console.log(`   Can Access: ${canAccess ? '✅ YES' : '❌ NO'}`);
  return canAccess;
}

// Test scenarios
console.log('\n📊 Testing all tier combinations (allowHigherTier: true):');

const tiers = ['basic', 'premium', 'vip', 'vvip'];

tiers.forEach(userTier => {
  console.log(`\n👤 User Tier: ${userTier.toUpperCase()}`);
  tiers.forEach(hostTier => {
    checkTierAccess(userTier, hostTier, true);
  });
});

console.log('\n' + '='.repeat(50));
console.log('🎯 Key Scenarios:');
console.log('• Basic user trying to view VIP stream → Should be BLOCKED');
console.log('• VIP user trying to view Basic stream → Should be ALLOWED');
console.log('• Premium user trying to view Premium stream → Should be ALLOWED');
console.log('• Basic user trying to view Basic stream → Should be ALLOWED');
