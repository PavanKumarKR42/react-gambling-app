import React from 'react';
import { formatEth, formatPrice, formatTime } from '../utils/helpers';

export const ClaimCard = ({ claim, onClaimClick }) => {
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

  return (
    <div className={`slot-card ${didWin && !bet.claimed ? 'claim-card' : ''}`}>
      <div className="slot-header">
        <div className="token-name">{token}</div>
        <div className={`status-badge ${statusClass}`}>{statusText}</div>
      </div>

      <div style={{ fontSize: '11px', color: '#666', marginBottom: '8px' }}>
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
        <div style={{ textAlign: 'center', color: '#ffd166', fontSize: '12px', padding: '8px', background: '#0f0f0f', borderRadius: '6px' }}>
          ✅ Already claimed
        </div>
      )}

      {!didWin && settled && (
        <div style={{ textAlign: 'center', color: '#888', fontSize: '12px', padding: '8px' }}>
          Price went {bet.betAbove ? 'down' : 'up'} • Better luck next time!
        </div>
      )}

      {!settled && (
        <div style={{ textAlign: 'center', color: '#888', fontSize: '12px', padding: '8px' }}>
          ⏳ Waiting for settlement...
        </div>
      )}
    </div>
  );
};