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
  const [expectedNextSlot, setExpectedNextSlot] = useState(0);
  const timerInterval = useRef(null);
  const checkInterval = useRef(null);
  const loadingRef = useRef(false);

  const loadSlots = useCallback(async (silent = false) => {
    if (!config || loadingRef.current) return;

    try {
      loadingRef.current = true;
      if (!silent) setLoading(true);
      
      const fetchedLastSlotTime = await getLastSlotTime();

      if (fetchedLastSlotTime === 0) {
        setCurrentSlots([]);
        setLastSlotTime(0);
        setExpectedNextSlot(0);
        setLoading(false);
        loadingRef.current = false;
        return;
      }

      // Check if new slot was created
      if (fetchedLastSlotTime !== lastSlotTime && lastSlotTime !== 0) {
        console.log('New slot detected:', fetchedLastSlotTime);
      }

      setLastSlotTime(fetchedLastSlotTime);
      // Calculate when next slot should be created (3 minutes from now)
      setExpectedNextSlot(fetchedLastSlotTime + SLOT_INTERVAL);

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
      loadingRef.current = false;
    } catch (e) {
      console.error('Load slots error:', e);
      setLoading(false);
      loadingRef.current = false;
    }
  }, [config, userAddress, getSlot, getBet, getLastSlotTime, lastSlotTime]);

  const updateTimers = useCallback(() => {
    const newTimers = {};
    const now = Math.floor(Date.now() / 1000);

    currentSlots.forEach(({ slot, slotStartTime, symbol }) => {
      if (!slot || Number(slot[0]) === 0) return;

      const key = `${slotStartTime}-${symbol}`;
      const [startTime, endTime, targetTime, , , , , settled] = slot;
      
      const slotAge = now - Number(startTime);
      const bettingDuration = Number(endTime) - Number(startTime);
      const totalDuration = Number(targetTime) - Number(startTime);

      if (settled) {
        newTimers[key] = '✅ Settled';
      } else if (now < Number(endTime)) {
        // Currently in betting period
        const remaining = getTimeRemaining(endTime);
        const elapsed = Math.floor(slotAge / 60);
        const total = Math.floor(bettingDuration / 60);
        newTimers[key] = remaining ? `⏱️ Betting: ${elapsed}/${total} min (${remaining} left)` : '⏳ Closing...';
      } else if (now < Number(targetTime)) {
        // Between betting end and target time
        const remaining = getTimeRemaining(targetTime);
        const elapsed = Math.floor(slotAge / 60);
        const total = Math.floor(totalDuration / 60);
        newTimers[key] = remaining ? `🕐 Waiting: ${elapsed}/${total} min (${remaining} left)` : '⏳ Settling...';
      } else {
        // Past target time but not settled yet
        newTimers[key] = '⏳ Awaiting settlement...';
      }
    });

    setTimers(newTimers);
  }, [currentSlots]);

  // Check for new slots - more aggressive checking near expected slot creation time
  const checkForNewSlot = useCallback(async () => {
    if (!config || loadingRef.current) return;
    
    try {
      const now = Math.floor(Date.now() / 1000);
      const fetchedLastSlotTime = await getLastSlotTime();
      
      // If a new slot was created, reload silently
      if (fetchedLastSlotTime > lastSlotTime) {
        console.log('Auto-reloading for new slot:', fetchedLastSlotTime);
        await loadSlots(true); // Silent reload
      } else if (lastSlotTime > 0 && now >= expectedNextSlot) {
        // We're past the expected slot creation time but no new slot detected
        // This could mean upkeep hasn't triggered yet - keep checking
        console.log('Expected new slot but not found yet, will keep checking...');
        // Force a reload to check again
        await loadSlots(true);
      }
    } catch (e) {
      console.error('Check new slot error:', e);
    }
  }, [config, getLastSlotTime, lastSlotTime, expectedNextSlot, loadSlots]);

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

  // Setup automatic slot checking - more frequent near slot creation time
  useEffect(() => {
    if (checkInterval.current) {
      clearInterval(checkInterval.current);
    }
    
    const now = Math.floor(Date.now() / 1000);
    const timeUntilExpected = expectedNextSlot - now;
    
    // If we're within 30 seconds of expected slot creation, check more frequently (every 2 seconds)
    // Otherwise check every 5 seconds
    const checkFrequency = (timeUntilExpected > 0 && timeUntilExpected < 30) ? 2000 : 5000;
    
    checkInterval.current = setInterval(checkForNewSlot, checkFrequency);

    return () => {
      if (checkInterval.current) {
        clearInterval(checkInterval.current);
      }
    };
  }, [checkForNewSlot, expectedNextSlot]);

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