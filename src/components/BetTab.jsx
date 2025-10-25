import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SlotCard } from './SlotCard';
import { TOKENS, SLOT_INTERVAL } from '../utils/constants';
import { getTimeRemaining, getSlotStatus, calculatePayout } from '../utils/helpers';

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
  const [recentSlots, setRecentSlots] = useState([]);
  const [timers, setTimers] = useState({});
  const [loading, setLoading] = useState(true);
  const cachedSlots = useRef(new Map());
  const timerInterval = useRef(null);

  const loadSlots = useCallback(async () => {
    if (!config) return;

    try {
      const lastSlotTime = await getLastSlotTime();

      if (lastSlotTime === 0) {
        setCurrentSlots([]);
        setRecentSlots([]);
        setLoading(false);
        return;
      }

      // Load current slot
      const currentSlotsData = await Promise.all(
        TOKENS.map(async (token) => {
          const slot = await getSlot(lastSlotTime, token);
          let userBet = null;
          let canClaim = false;
          let didWin = false;

          if (userAddress && slot && Number(slot[0]) !== 0) {
            const bet = await getBet(lastSlotTime, token, userAddress);
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
            slotStartTime: lastSlotTime,
            userBet,
            canClaim,
            didWin,
            isCurrent: true
          };
        })
      );

      setCurrentSlots(currentSlotsData.filter(s => s.slot && Number(s.slot[0]) !== 0));

      // Load recent slots (last 5)
      const recentSlotTimes = [];
      for (let i = 1; i <= 5; i++) {
        const slotTime = lastSlotTime - (i * SLOT_INTERVAL);
        if (slotTime > 0) recentSlotTimes.push(slotTime);
      }

      const recentSlotsData = [];
      for (const slotTime of recentSlotTimes) {
        for (const token of TOKENS) {
          const slot = await getSlot(slotTime, token);
          
          if (slot && Number(slot[0]) !== 0) {
            let userBet = null;
            let canClaim = false;
            let didWin = false;

            if (userAddress) {
              const bet = await getBet(slotTime, token, userAddress);
              if (bet && Number(bet[0]) > 0) {
                userBet = { amount: bet[0], betAbove: bet[1], claimed: bet[2] };
                
                if (slot[7]) { // settled
                  const [, , , poolAbove, poolBelow, startPrice, targetPrice] = slot;
                  didWin = bet[1] ? (targetPrice > startPrice) : (targetPrice < startPrice);
                  canClaim = didWin && !bet[2];
                }
              }
            }

            recentSlotsData.push({
              slot,
              symbol: token,
              slotStartTime: slotTime,
              userBet,
              canClaim,
              didWin,
              isCurrent: false
            });
          }
        }
      }

      setRecentSlots(recentSlotsData);
      setLoading(false);
    } catch (e) {
      console.error('Load slots error:', e);
      setLoading(false);
    }
  }, [config, userAddress, getSlot, getBet, getLastSlotTime]);

  const updateTimers = useCallback(() => {
    const newTimers = {};
    const now = Math.floor(Date.now() / 1000);

    [...currentSlots, ...recentSlots].forEach(({ slot, slotStartTime, symbol }) => {
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
  }, [currentSlots, recentSlots]);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

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

      {recentSlots.length > 0 && (
        <div className="slots-history">
          <div className="history-header">📜 Recent Slots</div>
          <div className="slots-container">
            {recentSlots.map(({ slot, symbol, slotStartTime, userBet, canClaim, didWin, isCurrent }) => (
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
        </div>
      )}
    </section>
  );
};