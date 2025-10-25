import { useEffect, useRef } from 'react';
import { watchContractEvent } from 'https://esm.sh/@wagmi/core';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../utils/constants';

export const useEventWatchers = (config, userAddress, showToast, callbacks) => {
  const watchersSetup = useRef(false);

  useEffect(() => {
    if (!config || !userAddress || watchersSetup.current) return;

    watchersSetup.current = true;

    // Watch BetPlaced events
    const unwatchBetPlaced = watchContractEvent(config, {
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      eventName: 'BetPlaced',
      onLogs: logs => {
        logs.forEach(log => {
          if (log.args?.user?.toLowerCase() === userAddress?.toLowerCase()) {
            const symbol = log.args?.symbol ?? '';
            const amount = log.args?.amount?.toString?.() ?? '';
            const above = log.args?.above ?? false;
            showToast(`✅ Bet placed on ${symbol}: ${(Number(amount) / 1e18).toFixed(4)} ETH ${above ? '📈' : '📉'}`);
            callbacks.onBetPlaced?.();
          }
        });
      }
    });

    // Watch Claimed events
    const unwatchClaimed = watchContractEvent(config, {
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      eventName: 'Claimed',
      onLogs: logs => {
        logs.forEach(log => {
          if (log.args?.user?.toLowerCase() === userAddress?.toLowerCase()) {
            const symbol = log.args?.symbol ?? '';
            const payout = log.args?.payout?.toString?.() ?? '';
            showToast(`🎉 Claimed ${symbol}: ${(Number(payout) / 1e18).toFixed(4)} ETH`);
            callbacks.onClaimed?.();
          }
        });
      }
    });

    // Watch SlotCreated events
    const unwatchSlotCreated = watchContractEvent(config, {
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      eventName: 'SlotCreated',
      onLogs: logs => {
        logs.forEach(log => {
          const symbol = log.args?.symbol ?? '';
          if (symbol === 'BTC') {
            showToast(`🆕 New slot created!`);
            callbacks.onSlotCreated?.();
          }
        });
      }
    });

    // Watch SlotSettled events
    const unwatchSlotSettled = watchContractEvent(config, {
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      eventName: 'SlotSettled',
      onLogs: logs => {
        logs.forEach(log => {
          const symbol = log.args?.symbol ?? '';
          if (symbol === 'BTC') {
            showToast(`✅ Slots settled! Check claims.`);
            callbacks.onSlotSettled?.();
          }
        });
      }
    });

    return () => {
      unwatchBetPlaced?.();
      unwatchClaimed?.();
      unwatchSlotCreated?.();
      unwatchSlotSettled?.();
    };
  }, [config, userAddress, showToast, callbacks]);
};