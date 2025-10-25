export const formatAddress = (address) => {
  if (!address) return 'Not Connected';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const formatEth = (wei, decimals = 4) => {
  return (Number(wei) / 1e18).toFixed(decimals);
};

export const formatPrice = (price, decimals = 2) => {
  return (Number(price) / 1e8).toFixed(decimals);
};

export const formatTime = (timestamp) => {
  const date = new Date(timestamp * 1000);
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

export const getTimeRemaining = (targetTime) => {
  const now = Math.floor(Date.now() / 1000);
  const remaining = Number(targetTime) - now;
  
  if (remaining <= 0) return null;
  
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const getSlotStatus = (slot, now) => {
  const [startTime, endTime, targetTime, , , , , settled] = slot;
  
  if (Number(startTime) === 0) {
    return { status: 'empty', statusClass: 'status-settled' };
  }
  
  if (settled) {
    return { status: 'settled', statusClass: 'status-settled' };
  }
  
  if (now < Number(endTime)) {
    return { status: 'open', statusClass: 'status-open' };
  }
  
  if (now < Number(targetTime)) {
    return { status: 'waiting', statusClass: 'status-closed' };
  }
  
  return { status: 'ready', statusClass: 'status-closed' };
};

export const calculatePayout = (betAmount, betAbove, poolAbove, poolBelow, targetPrice, startPrice) => {
  const didWin = betAbove ? (targetPrice > startPrice) : (targetPrice < startPrice);
  
  if (!didWin) return 0;
  
  const userPool = betAbove ? poolAbove : poolBelow;
  const oppositePool = betAbove ? poolBelow : poolAbove;
  const totalPool = Number(userPool) + Number(oppositePool);
  
  if (Number(userPool) === 0) return Number(betAmount);
  if (totalPool === 0) return Number(betAmount);
  
  return (Number(betAmount) * totalPool) / Number(userPool);
};