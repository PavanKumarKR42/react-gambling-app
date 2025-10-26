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
  const checkInterval = useRef(null);
  const loadingRef = useRef(false);
  const retryCount = useRef(0);

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
      if (fetchedLastSlotTime !== lastSlotTime && lastSlotTime !== 0) {
        console.log('✅ New slot detected:', new Date(fetchedLastSlotTime * 1000).toLocaleTimeString());
        setIsWaitingForNewSlot(false);
        retryCount.current = 0;
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
        const timeSinceTarget = now - Number(targetTime);
        
        // Check if we should expect a new slot
        const expectedNewSlotTime = Number(startTime) + SLOT_INTERVAL;
        if (now >= expectedNewSlotTime) {
          // We're past when the new slot should have been created
          setIsWaitingForNewSlot(true);
          newTimers[key] = '🔄 New slot incoming...';
        } else {
          newTimers[key] = '⏳ Awaiting settlement...';
        }
      }
    });

    setTimers(newTimers);
  }, [currentSlots]);

  // Check for new slots with exponential backoff
  const checkForNewSlot = useCallback(async () => {
    if (!config || loadingRef.current) return;
    
    try {
      const now = Math.floor(Date.now() / 1000);
      const fetchedLastSlotTime = await getLastSlotTime();
      
      // If a new slot was created, reload
      if (fetchedLastSlotTime > lastSlotTime) {
        console.log('🔄 Auto-reloading for new slot');
        await loadSlots(true);
        return;
      }
      
      // Check if we're past the expected new slot time
      if (lastSlotTime > 0) {
        const expectedNewSlotTime = lastSlotTime + SLOT_INTERVAL;
        const timeSinceExpected = now - expectedNewSlotTime;
        
        // If we're past expected time and slot hasn't been created
        if (timeSinceExpected > 0 && timeSinceExpected < 300) { // Within 5 minutes of expected
          console.log(`⏰ Expecting new slot (${timeSinceExpected}s past expected time)`);
          setIsWaitingForNewSlot(true);
          retryCount.current++;
          
          // Retry loading more aggressively
          if (retryCount.current % 3 === 0) { // Every 3rd check
            console.log('🔍 Force checking for new slot...');
            await loadSlots(true);
          }
        } else if (timeSinceExpected >= 300) {
          // More than 5 minutes past - might be an issue
          console.warn('⚠️ Slot creation significantly delayed');
          setIsWaitingForNewSlot(true);
        }
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

  // Setup automatic slot checking with adaptive frequency
  useEffect(() => {
    if (checkInterval.current) {
      clearInterval(checkInterval.current);
    }
    
    // Check more frequently if waiting for new slot
    const checkFrequency = isWaitingForNewSlot ? 2000 : 5000;
    
    checkInterval.current = setInterval(checkForNewSlot, checkFrequency);

    return () => {
      if (checkInterval.current) {
        clearInterval(checkInterval.current);
      }
    };
  }, [checkForNewSlot, isWaitingForNewSlot]);

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
          🔄 Waiting for Chainlink upkeep to create new slot...
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