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
  const [isWaitingForNewSlot, setIsWaitingForNewSlot] = useState(false);
  const timerInterval = useRef(null);
  const aggressiveCheckInterval = useRef(null);
  const loadingRef = useRef(false);
  const lastCheckTime = useRef(0);

  const loadSlots = useCallback(async (silent = false) => {
    if (!config || loadingRef.current) return;

    try {
      loadingRef.current = true;
      if (!silent) setLoading(true);
      
      const fetchedLastSlotTime = await getLastSlotTime();

      if (fetchedLastSlotTime === 0) {
        setCurrentSlots([]);
        setLastSlotTime(0);
        setIsWaitingForNewSlot(false);
        setLoading(false);
        loadingRef.current = false;
        return;
      }

      // Check if new slot was created
      if (fetchedLastSlotTime !== lastSlotTime) {
        if (lastSlotTime !== 0) {
          const delay = fetchedLastSlotTime - (lastSlotTime + SLOT_INTERVAL);
          console.log(`✅ New slot detected at ${new Date(fetchedLastSlotTime * 1000).toLocaleTimeString()} (delay: ${delay}s)`);
          setIsWaitingForNewSlot(false);
        }
        setLastSlotTime(fetchedLastSlotTime);
      }

      // Load current slot data
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
        // Past target time - new slot should be coming
        const expectedNewSlotTime = Number(startTime) + SLOT_INTERVAL;
        if (now >= expectedNewSlotTime) {
          setIsWaitingForNewSlot(true);
          const delay = now - expectedNewSlotTime;
          newTimers[key] = delay > 60 ? `🔄 New slot pending (${Math.floor(delay/60)}m delay)` : '🔄 New slot incoming...';
        } else {
          newTimers[key] = '⏳ Awaiting settlement...';
        }
      }
    });

    setTimers(newTimers);
  }, [currentSlots]);

  // Aggressive check when expecting new slot
  const aggressiveCheckForNewSlot = useCallback(async () => {
    if (!config || loadingRef.current) return;
    
    const now = Math.floor(Date.now() / 1000);
    
    // Prevent checking too frequently (min 1 second apart)
    if (now - lastCheckTime.current < 1) return;
    lastCheckTime.current = now;
    
    try {
      const fetchedLastSlotTime = await getLastSlotTime();
      
      // If new slot detected, reload immediately
      if (fetchedLastSlotTime > lastSlotTime) {
        console.log('🎯 New slot found! Reloading...');
        await loadSlots(true);
      } else if (isWaitingForNewSlot) {
        // Still waiting, check if we should alert
        const expectedTime = lastSlotTime + SLOT_INTERVAL;
        const delay = now - expectedTime;
        
        if (delay > 0 && delay % 30 === 0) { // Log every 30 seconds
          console.log(`⏰ Still waiting for new slot (${delay}s delay)`);
        }
      }
    } catch (e) {
      console.error('Aggressive check error:', e);
    }
  }, [config, getLastSlotTime, lastSlotTime, isWaitingForNewSlot, loadSlots]);

  // Initial load
  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  // Setup timer updates (every second)
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

  // Setup aggressive checking when waiting for new slot
  useEffect(() => {
    if (aggressiveCheckInterval.current) {
      clearInterval(aggressiveCheckInterval.current);
    }
    
    if (isWaitingForNewSlot) {
      // Check every 1 second when waiting for new slot
      console.log('🔍 Enabling aggressive slot checking (every 1s)');
      aggressiveCheckInterval.current = setInterval(aggressiveCheckForNewSlot, 1000);
    } else {
      // Normal mode: check every 5 seconds
      aggressiveCheckInterval.current = setInterval(aggressiveCheckForNewSlot, 5000);
    }

    return () => {
      if (aggressiveCheckInterval.current) {
        clearInterval(aggressiveCheckInterval.current);
      }
    };
  }, [isWaitingForNewSlot, aggressiveCheckForNewSlot]);

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
            <small style={{ color: '#666' }}>Chainlink upkeep is initializing</small>
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="section">
      {isWaitingForNewSlot && (
        <div style={{
          background: 'linear-gradient(90deg, #4a90e2 0%, #357abd 100%)',
          color: 'white',
          padding: '12px 20px',
          textAlign: 'center',
          borderRadius: '8px',
          marginBottom: '20px',
          fontSize: '14px',
          fontWeight: '500',
          boxShadow: '0 2px 8px rgba(74, 144, 226, 0.3)',
          animation: 'pulse 2s ease-in-out infinite'
        }}>
          🔄 Waiting for Chainlink upkeep to create new slot... (checking every 1s)
        </div>
      )}
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
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </section>
  );
};