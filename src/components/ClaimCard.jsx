import React from 'react';
import { formatEth, formatPrice, formatTime } from '../utils/helpers';

export const ClaimCard = ({ claim, onClaimClick, compact = false }) => {
  const { timestamp, token, slot, bet, didWin, settled, payout } = claim;
  const [startTime, endTime, targetTime, poolAbove, poolBelow, startPrice, targetPrice, isSettled] = slot;
  
  let statusClass = 'status-settled';
  let statusText = 'SETTLED';
  
  if (bet.claimed) {
    statusClass = 'status-claimed';
    statusText = 'CLAIMED ✓';
  } else if (didWin) {
    statusClass = 'status-won';
    statusText = 'WON! 🎉';
  } else if (settled) {
    statusClass = 'status-lost';
    statusText = 'LOST';
  } else {
    statusClass = 'status-closed';
    statusText = 'PENDING';
  }

  const timeStr = formatTime(timestamp);

  if (compact) {
    // Compact view for history modal
    return (
      <div className={`slot-card ${didWin && !bet.claimed ? 'claim-card' : ''}`} style={{ padding: '14px' }}>
        <div className="slot-header" style={{ marginBottom: '10px', paddingBottom: '8px' }}>
          <div>
            <div className="token-name" style={{ fontSize: '18px' }}>{token}</div>
            <div style={{ fontSize: '11px', color: '#757575', fontWeight: '500', marginTop: '2px' }}>
              {timeStr}
            </div>
          </div>
          <div className={`status-badge ${statusClass}`} style={{ fontSize: '10px', padding: '4px 10px' }}>
            {statusText}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '8px' }}>
          <span style={{ color: '#757575' }}>Bet: {formatEth(bet.amount)} ETH {bet.betAbove ? '📈' : '📉'}</span>
          {settled && (
            <span style={{ color: didWin ? '#2E7D32' : '#C62828', fontWeight: '600' }}>
              {formatPrice(startPrice)} → {formatPrice(targetPrice)}
            </span>
          )}
        </div>

        {didWin && !bet.claimed && settled && (
          <button 
            className="btn btn-claim" 
            onClick={() => onClaimClick(timestamp, token)}
            style={{ padding: '10px', fontSize: '13px', marginTop: '8px' }}
          >
            Claim {formatEth(payout)} ETH
          </button>
        )}
      </div>
    );
  }

  // Full view for main display
  return (
    <div className={`slot-card ${didWin && !bet.claimed ? 'claim-card' : ''}`}>
      <div className="slot-header">
        <div className="token-name">{token}</div>
        <div className={`status-badge ${statusClass}`}>{statusText}</div>
      </div>

      <div style={{ fontSize: '12px', color: '#757575', marginBottom: '12px', fontWeight: '500' }}>
        {timeStr} • Slot #{timestamp}
      </div>

      <div className="slot-info">
        <div className="info-item">
          <div className="info-label">Start Price</div>
          <div className="info-value">{formatPrice(startPrice)}</div>
        </div>
        <div className="info-item">
          <div className="info-label">Final Price</div>
          <div className="info-value">{settled ? formatPrice(targetPrice) : 'Pending'}</div>
        </div>
      </div>

      <div className="user-bet-info">
        Your bet: {formatEth(bet.amount)} ETH {bet.betAbove ? '📈 Above' : '📉 Below'}
      </div>

      {didWin && !bet.claimed && settled && (
        <>
          <div className="payout-info">
            <span className="payout-label">Your Winnings:</span>
            <span className="payout-value">{formatEth(payout)} ETH</span>
          </div>
          <button className="btn btn-claim" onClick={() => onClaimClick(timestamp, token)}>
            🎉 Claim {formatEth(payout)} ETH
          </button>
        </>
      )}

      {bet.claimed && (
        <div style={{ textAlign: 'center', color: '#EF6C00', fontSize: '13px', padding: '10px', background: '#FFF3E0', borderRadius: '10px', border: '1px solid #FFB74D', fontWeight: '600' }}>
          ✅ Already claimed
        </div>
      )}

      {!didWin && settled && (
        <div style={{ textAlign: 'center', color: '#757575', fontSize: '13px', padding: '10px', background: '#F5F5F5', borderRadius: '10px', fontWeight: '500' }}>
          Price went {bet.betAbove ? 'down ↓' : 'up ↑'} • Better luck next time!
        </div>
      )}

      {!settled && (
        <div style={{ textAlign: 'center', color: '#757575', fontSize: '13px', padding: '10px', background: '#F5F5F5', borderRadius: '10px', fontWeight: '500' }}>
          ⏳ Waiting for settlement...
        </div>
      )}
    </div>
  );
};