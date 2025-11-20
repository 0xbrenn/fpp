// src/utils/errorHandling.js
export const getErrorMessage = (error) => {
  console.error('Transaction error:', error);
  
  // User rejected transaction
  if (error.code === 'ACTION_REJECTED' || error.message?.includes('user rejected')) {
    return 'Transaction cancelled';
  }
  
  // Insufficient funds
  if (error.message?.includes('insufficient funds')) {
    return 'Insufficient funds';
  }
  
  // Contract revert with reason
  if (error.message?.includes('execution reverted')) {
    const revertMatch = error.message.match(/reverted with reason string '([^']+)'/);
    if (revertMatch) return revertMatch[1];
    return 'Transaction failed';
  }
  
  // Has a reason property
  if (error.reason) {
    return error.reason;
  }
  
  // Default
  return 'Transaction failed';
};