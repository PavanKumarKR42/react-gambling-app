import { useState, useEffect } from 'react';
import { readContract, writeContract } from 'https://esm.sh/@wagmi/core';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../utils/constants';

export const useContract = (config, userAddress, showToast) => {
  const [contractBalance, setContractBalance] = useState('-- ETH');

  const updateContractBalance = async () => {
    if (!config || !userAddress) {
      setContractBalance('-- ETH');
      return;
    }
    
    try {
      const balance = await readContract(config, {
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'balances',
        args: [userAddress]
      });
      setContractBalance(`${(Number(balance) / 1e18).toFixed(4)} ETH`);
    } catch (e) {
      console.error('Contract balance error:', e);
      setContractBalance('-- ETH');
    }
  };

  useEffect(() => {
    if (config && userAddress) {
      updateContractBalance();
    }
  }, [config, userAddress]);

  const deposit = async (amount) => {
    if (!config) throw new Error('Config not initialized');
    
    try {
      const txHash = await writeContract(config, {
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'deposit',
        value: BigInt(Math.floor(parseFloat(amount) * 1e18))
      });
      showToast(`⏳ Deposit pending... <a target="_blank" href="https://sepolia.basescan.org/tx/${txHash}">view</a>`, 5000);
      return txHash;
    } catch (e) {
      console.error('Deposit error:', e);
      throw e;
    }
  };

  const withdraw = async (amount) => {
    if (!config) throw new Error('Config not initialized');
    
    try {
      const txHash = await writeContract(config, {
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'withdraw',
        args: [BigInt(Math.floor(parseFloat(amount) * 1e18))]
      });
      showToast(`⏳ Withdraw pending... <a target="_blank" href="https://sepolia.basescan.org/tx/${txHash}">view</a>`, 5000);
      return txHash;
    } catch (e) {
      console.error('Withdraw error:', e);
      throw e;
    }
  };

  const placeBet = async (slotStartTime, symbol, betAbove, amount) => {
    if (!config) throw new Error('Config not initialized');
    
    try {
      const txHash = await writeContract(config, {
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'placeBet',
        args: [
          BigInt(slotStartTime),
          symbol,
          betAbove,
          BigInt(Math.floor(parseFloat(amount) * 1e18))
        ]
      });
      showToast(`⏳ Bet placed! <a target="_blank" href="https://sepolia.basescan.org/tx/${txHash}">view</a>`, 5000);
      return txHash;
    } catch (e) {
      console.error('Bet error:', e);
      throw e;
    }
  };

  const claim = async (slotStartTime, symbol) => {
    if (!config) throw new Error('Config not initialized');
    
    try {
      const txHash = await writeContract(config, {
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'claim',
        args: [BigInt(slotStartTime), symbol]
      });
      showToast(`🎉 Claim successful! <a target="_blank" href="https://sepolia.basescan.org/tx/${txHash}">view</a>`, 5000);
      return txHash;
    } catch (e) {
      console.error('Claim error:', e);
      throw e;
    }
  };

  const getSlot = async (slotStartTime, symbol) => {
    if (!config) return null;
    
    try {
      return await readContract(config, {
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'slots',
        args: [BigInt(slotStartTime), symbol]
      });
    } catch (e) {
      console.error('Get slot error:', e);
      return null;
    }
  };

  const getBet = async (slotStartTime, symbol, address) => {
    if (!config || !address) return null;
    
    try {
      return await readContract(config, {
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'bets',
        args: [BigInt(slotStartTime), symbol, address]
      });
    } catch (e) {
      return null;
    }
  };

  const getLastSlotTime = async () => {
    if (!config) return 0;
    
    try {
      const lastSlotTime = await readContract(config, {
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'lastSlotTime'
      });
      return Number(lastSlotTime);
    } catch (e) {
      console.error('Get last slot time error:', e);
      return 0;
    }
  };

  return {
    contractBalance,
    updateContractBalance,
    deposit,
    withdraw,
    placeBet,
    claim,
    getSlot,
    getBet,
    getLastSlotTime
  };
};