import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ClaimCard } from './ClaimCard';
import { TOKENS, SLOT_INTERVAL } from '../utils/constants';
import { calculatePayout } from '../utils/helpers';

export const ClaimTab = ({ 
  config, 
  userAddress, 
  getSlot, 
  getBet, 
  getLastSlotTime,
  onClaimClick,
  forceReload 
}) => {
  const [claims, setClaims] = useState([]);
  const [stats, setStats] = useState({
    totalBets: 0,
    wonBets: 0,
    lostBets: 0,
    claimableCount: 0,
    totalWinnings: 0,
    totalClaimed: 0
  });
  const [loading, setLoading] = useState(true);
  const isLoadingRef = useRef(false);
  const lastLoadTime = useRef(0);

  const loadClaims = useCallback(async (force = false) => {
    if (!config || !userAddress) {
      setClaims([]);
      setStats({
        totalBets: 0,
        wonBets: 0,
        lostBets: 0,
        claimableCount: 0,
        totalWinnings: 0,
        totalClaimed: 0
      });
      setLoading(false);
      return;
    }

    // Prevent concurrent loads
    if (isLoadingRef.current && !force) return;

    // Don't reload if loaded within last 10 seconds (unless forced)
    const now = Date.now();
    if (!force && now - lastLoadTime.current < 10000) return;

    try {
      isLoadingRef.current = true;
      if (force) setLoading(true);

      const lastSlotTime = await getLastSlotTime();
      const currentTimestamp = lastSlotTime;
      const claimsData = [];
      
      let totalWinnings = 0;
      let totalClaimed = 0;
      let claimableCount = 0;
      let wonCount = 0;
      let lostCount = 0;

      // Look back 100 slots (5 hours) - load in parallel
      const slotPromises = [];
      for (let i = 0; i < 100; i++) {
        const timestamp = currentTimestamp - (i * SLOT_INTERVAL);
        if (timestamp <= 0) break;
        
        for (const token of TOKENS) {
          slotPromises.push(checkSlotForBet(timestamp, token));
        }
      }

      const results = await Promise.allSettled(slotPromises);
      
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          claimsData.push(result.value);
          
          if (result.value.settled) {
            if (result.value.didWin) {
              wonCount++;
              const payout = result.value.payout;
              if (!result.value.bet.claimed) {
                totalWinnings += payout / 1e18;
                claimableCount++;
              } else {
                totalClaimed += payout / 1e18;
              }
            } else {
              lostCount++;
            }
          }
        }
      }

      // Sort by timestamp (newest first)
      claimsData.sort((a, b) => b.timestamp - a.timestamp);

      setClaims(claimsData);
      setStats({
        totalBets: claimsData.length,
        wonBets: wonCount,
        lostBets: lostCount,
        claimableCount,
        totalWinnings,
        totalClaimed
      });

      lastLoadTime.current = now;
      setLoading(false);
    } catch (e) {
      console.error('Load claims error:', e);
      setLoading(false);
    } finally {
      isLoadingRef.current = false;
    }
  }, [config, userAddress, getSlot, getBet, getLastSlotTime]);

  const checkSlotForBet = async (timestamp, token) => {
    try {
      const [slot, bet] = await Promise.all([
        getSlot(timestamp, token),
        getBet(timestamp, token, userAddress)
      ]);

      if (!slot || Number(slot[0]) === 0 || !bet || Number(bet[0]) === 0) {
        return null;
      }

      const [startTime, endTime, targetTime, poolAbove, poolBelow, startPrice, targetPrice, settled] = slot;
      const [betAmount, betAbove, claimed] = bet;

      let didWin = false;
      let payout = 0;

      if (settled) {
        didWin = betAbove ? (targetPrice > startPrice) : (targetPrice < startPrice);
        
        if (didWin) {
          payout = calculatePayout(betAmount, betAbove, poolAbove, poolBelow, targetPrice, startPrice);
        }
      }

      return {
        timestamp,
        token,
        slot,
        bet: { amount: betAmount, betAbove, claimed },
        didWin,
        settled,
        payout
      };
    } catch (e) {
      return null;
    }
  };

  useEffect(() => {
    loadClaims(forceReload);
  }, [loadClaims, forceReload]);

  if (loading) {
    return (
      <section className="section">
        <div className="claim-stats">
          <div className="claim-stat">
            <div className="claim-stat-label">Total Bets</div>
            <div className="claim-stat-value neutral">0</div>
          </div>
          <div className="claim-stat">
            <div className="claim-stat-label">Won</div>
            <div className="claim-stat-value">0</div>
          </div>
          <div className="claim-stat">
            <div className="claim-stat-label">Lost</div>
            <div className="claim-stat-value lost">0</div>
          </div>
          <div className="claim-stat">
            <div className="claim-stat-label">To Claim</div>
            <div className="claim-stat-value">0</div>
          </div>
        </div>
        <div className="slots-container">
          <p style={{ textAlign: 'center', color: '#888' }}>Loading claims...</p>
        </div>
      </section>
    );
  }

  if (!userAddress) {
    return (
      <section className="section">
        <div className="empty-state">
          <div className="empty-state-icon">🔌</div>
          <p>Please connect wallet first</p>
        </div>
      </section>
    );
  }

  return (
    <section className="section">
      <div className="claim-stats">
        <div className="claim-stat">
          <div className="claim-stat-label">Total Bets</div>
          <div className="claim-stat-value neutral">{stats.totalBets}</div>
        </div>
        <div className="claim-stat">
          <div className="claim-stat-label">Won</div>
          <div className="claim-stat-value">{stats.wonBets}</div>
        </div>
        <div className="claim-stat">
          <div className="claim-stat-label">Lost</div>
          <div className="claim-stat-value lost">{stats.lostBets}</div>
        </div>
        <div className="claim-stat">
          <div className="claim-stat-label">To Claim</div>
          <div className="claim-stat-value">{stats.claimableCount}</div>
        </div>
      </div>
      
      <div className="claim-stats" style={{ marginBottom: '8px' }}>
        <div className="claim-stat">
          <div className="claim-stat-label">Total Winnings</div>
          <div className="claim-stat-value">{stats.totalWinnings.toFixed(4)} ETH</div>
        </div>
        <div className="claim-stat">
          <div className="claim-stat-label">Already Claimed</div>
          <div className="claim-stat-value neutral">{stats.totalClaimed.toFixed(4)} ETH</div>
        </div>
      </div>

      <div className="slots-container">
        {claims.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <p>No bets found</p>
            <small style={{ color: '#666' }}>Place some bets first!</small>
          </div>
        ) : (
          claims.map((claim) => (
            <ClaimCard
              key={`${claim.timestamp}-${claim.token}`}
              claim={claim}
              onClaimClick={onClaimClick}
            />
          ))
        )}
      </div>
    </section>
  );
};