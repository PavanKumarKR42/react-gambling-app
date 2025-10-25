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
  const [lastClaim, setLastClaim] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(true);
  const isLoadingRef = useRef(false);
  const lastLoadTime = useRef(0);

  const loadClaims = useCallback(async (force = false) => {
    if (!config || !userAddress) {
      setClaims([]);
      setLastClaim(null);
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
        }
      }

      // Sort by timestamp (newest first)
      claimsData.sort((a, b) => b.timestamp - a.timestamp);

      setClaims(claimsData);
      setLastClaim(claimsData.length > 0 ? claimsData[0] : null);

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
        <div className="slots-container">
          <p style={{ textAlign: 'center', color: '#9E9E9E', padding: '40px 20px' }}>
            Loading your bets...
          </p>
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
      {/* History Button */}
      {claims.length > 1 && (
        <div style={{ padding: '16px 0' }}>
          <button 
            className="btn btn-secondary" 
            onClick={() => setShowHistory(true)}
            style={{ width: '100%' }}
          >
            📜 View Betting History ({claims.length} bets)
          </button>
        </div>
      )}

      {/* Last Bet / Current Status */}
      {!lastClaim ? (
        <div className="empty-state">
          <div className="empty-state-icon">📭</div>
          <p>No bets placed yet</p>
          <small style={{ color: '#9E9E9E' }}>Go to the Bet tab to place your first bet!</small>
        </div>
      ) : (
        <div>
          <div style={{ 
            fontSize: '15px', 
            fontWeight: '700', 
            color: '#757575', 
            marginBottom: '16px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Last Bet
          </div>
          <ClaimCard
            claim={lastClaim}
            onClaimClick={onClaimClick}
          />
        </div>
      )}

      {/* History Modal */}
      {showHistory && (
        <div 
          className="modal show" 
          onClick={(e) => {
            if (e.target.className.includes('modal')) {
              setShowHistory(false);
            }
          }}
        >
          <div className="modal-content" style={{ maxWidth: '360px', maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div className="modal-header" style={{ margin: 0 }}>
                Betting History
              </div>
              <button 
                onClick={() => setShowHistory(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#757575',
                  padding: '0',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#F5F5F5';
                  e.target.style.color = '#212121';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'none';
                  e.target.style.color = '#757575';
                }}
              >
                ×
              </button>
            </div>

            {/* Stats Summary */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '8px',
              marginBottom: '16px',
              padding: '12px',
              background: 'linear-gradient(135deg, #F8F9FA 0%, #E3F2FD 100%)',
              borderRadius: '12px',
              border: '1px solid #E0E0E0'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: '#757575', fontWeight: '600', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total</div>
                <div style={{ fontSize: '18px', fontWeight: '800', color: '#EF6C00' }}>{claims.length}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: '#757575', fontWeight: '600', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Won</div>
                <div style={{ fontSize: '18px', fontWeight: '800', color: '#2E7D32' }}>
                  {claims.filter(c => c.settled && c.didWin).length}
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: '#757575', fontWeight: '600', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Lost</div>
                <div style={{ fontSize: '18px', fontWeight: '800', color: '#C62828' }}>
                  {claims.filter(c => c.settled && !c.didWin).length}
                </div>
              </div>
            </div>

            {/* Scrollable History List */}
            <div style={{ 
              overflowY: 'auto', 
              flex: 1,
              marginRight: '-24px',
              paddingRight: '24px'
            }}>
              <div className="slots-container" style={{ marginTop: 0 }}>
                {claims.map((claim) => (
                  <ClaimCard
                    key={`${claim.timestamp}-${claim.token}`}
                    claim={claim}
                    onClaimClick={onClaimClick}
                    compact={true}
                  />
                ))}
              </div>
            </div>

            {/* Close Button */}
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #E0E0E0' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowHistory(false)}
                style={{ width: '100%' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};