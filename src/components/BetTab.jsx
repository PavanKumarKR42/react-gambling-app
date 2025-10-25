import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SlotCard } from './SlotCard';
import { TOKENS, SLOT_INTERVAL } from '../utils/constants';
import { getTimeRemaining, getSlotStatus } from '../utils/helpers';

export const BetTab = ({ 
  config, 
  userAddress, 
  getSlot, 
  getBet, 
  getLastSlotTime, 
  onBetClick,
  onClaimClick 
}) => {
  const [currentSlots, setCurrentSlots] = useState([]);
  const [timers, setTimers] = useState({});
  const [loading, setLoading] = useState(true);
  const [lastSlotTime, setLastSlotTime] = useState(0);
  const timerInterval = useRef(null);
  const checkInterval = useRef(null);

  const loadSlots = useCallback(async (silent = false) => {
    if (!config) return;

    try {
      if (!silent) setLoading(true);
      
      const fetchedLastSlotTime = await getLastSlotTime();

      if (fetchedLastSlotTime === 0) {
        setCurrentSlots([]);
        setLastSlotTime(0);
        setLoading(false);
        return;
      }

      // Check if new slot was created
      if (fetchedLastSlotTime !== lastSlotTime && lastSlotTime !== 0) {
        // New slot detected - reload silently
        console.log('New slot detected:', fetchedLastSlotTime);
      }

      setLastSlotTime(fetchedLastSlotTime);

      // Load only current slot
      const currentSlotsData = await Promise.all(
        TOKENS.map(async (token) => {
          const slot = await getSlot(fetchedLastSlotTime, token);
          let userBet = null;
          let canClaim = false;
          let didWin = false;

          if (userAddress && slot && Number(slot[0]) !== 0) {
            const bet = await getBet(fetchedLastSlotTime, token, userAddress);
            if (bet && Number(bet[0]) > 0) {
              userBet = { amount: bet[0], betAbove: bet[1], claimed: bet[2] };
              
              if (slot[7]) { // settled
                const [, , , poolAbove, poolBelow, startPrice, targetPrice] = slot;
                didWin = bet[1] ? (targetPrice > startPrice) : (targetPrice < startPrice);
                canClaim = didWin && !bet[2];
              }
            }
          }

          return {
            slot,
            symbol: token,
            slotStartTime: fetchedLastSlotTime,
            userBet,
            canClaim,
            didWin,
            isCurrent: true
          };
        })
      );

      setCurrentSlots(currentSlotsData.filter(s => s.slot && Number(s.slot[0]) !== 0));
      setLoading(false);
    } catch (e) {
      console.error('Load slots error:', e);
      setLoading(false);
    }
  }, [config, userAddress, getSlot, getBet, getLastSlotTime, lastSlotTime]);

  const updateTimers = useCallback(() => {
    const newTimers = {};
    const now = Math.floor(Date.now() / 1000);

    currentSlots.forEach(({ slot, slotStartTime, symbol }) => {
      if (!slot || Number(slot[0]) === 0) return;

      const key = `${slotStartTime}-${symbol}`;
      const [startTime, endTime, targetTime, , , , , settled] = slot;

      if (settled) {
        newTimers[key] = '✅ Settled';
      } else if (now < Number(endTime)) {
        const remaining = getTimeRemaining(endTime);
        newTimers[key] = remaining ? `⏱️ Betting closes in ${remaining}` : '⏳ Closing...';
      } else if (now < Number(targetTime)) {
        const remaining = getTimeRemaining(targetTime);
        newTimers[key] = remaining ? `🕐 Settlement in ${remaining}` : '⏳ Settling...';
      } else {
        newTimers[key] = '⏳ Awaiting settlement...';
      }
    });

    setTimers(newTimers);
  }, [currentSlots]);

  // Check for new slots every 5 seconds
  const checkForNewSlot = useCallback(async () => {
    if (!config) return;
    
    try {
      const fetchedLastSlotTime = await getLastSlotTime();
      
      // If a new slot was created, reload silently
      if (fetchedLastSlotTime > lastSlotTime && lastSlotTime !== 0) {
        console.log('Auto-reloading for new slot');
        await loadSlots(true); // Silent reload
      }
    } catch (e) {
      console.error('Check new slot error:', e);
    }
  }, [config, getLastSlotTime, lastSlotTime, loadSlots]);

  // Initial load
  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  // Setup timer updates
  useEffect(() => {
    updateTimers();
    
    if (timerInterval.current) {
      clearInterval(timerInterval.current);
    }
    
    timerInterval.current = setInterval(updateTimers, 1000);

    return () => {
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
      }
    };
  }, [updateTimers]);

  // Setup automatic slot checking
  useEffect(() => {
    if (checkInterval.current) {
      clearInterval(checkInterval.current);
    }
    
    checkInterval.current = setInterval(checkForNewSlot, 5000);

    return () => {
      if (checkInterval.current) {
        clearInterval(checkInterval.current);
      }
    };
  }, [checkForNewSlot]);

  if (loading) {
    return (
      <section className="section">
        <div className="slots-container">
          <p style={{ textAlign: 'center', color: '#888' }}>Loading slots...</p>
        </div>
      </section>
    );
  }

  if (currentSlots.length === 0) {
    return (
      <section className="section">
        <div className="slots-container">
          <p style={{ textAlign: 'center', color: '#888', padding: '20px' }}>
            ⏳ Waiting for first slot...<br />
            <small style={{ color: '#666' }}>Contract is initializing</small>
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="section">
      <div className="slots-container">
        {currentSlots.map(({ slot, symbol, slotStartTime, userBet, canClaim, didWin, isCurrent }) => (
          <SlotCard
            key={`${slotStartTime}-${symbol}`}
            slot={slot}
            symbol={symbol}
            slotStartTime={slotStartTime}
            userBet={userBet}
            canClaim={canClaim}
            didWin={didWin}
            isCurrent={isCurrent}
            timer={timers[`${slotStartTime}-${symbol}`] || '--:--'}
            onBetClick={onBetClick}
            onClaimClick={onClaimClick}
          />
        ))}
      </div>
    </section>
  );
};