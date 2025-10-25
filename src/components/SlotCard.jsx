import React from 'react';
import { formatEth, formatPrice, formatTime, getSlotStatus, getTimeRemaining } from '../utils/helpers';

export const SlotCard = ({ 
  slot, 
  symbol, 
  slotStartTime, 
  userBet, 
  canClaim, 
  didWin, 
  isCurrent, 
  timer,
  onBetClick,
  onClaimClick 
}) => {
  if (!slot || Number(slot[0]) === 0) return null;

  const [startTime, endTime, targetTime, poolAbove, poolBelow, startPrice, targetPrice, settled] = slot;
  
  const now = Math.floor(Date.now() / 1000);
  const { status, statusClass } = getSlotStatus(slot, now);

  return (
    <div className={`slot-card ${canClaim ? 'claim-card' : ''}`}>
      <div className="slot-header">
        <div className="token-name">
          {symbol} {!isCurrent && <small style={{ fontSize: '11px', color: '#666' }}>{formatTime(slotStartTime)}</small>}
        </div>
        <div className={`status-badge ${statusClass}`}>{status.toUpperCase()}</div>
      </div>

      <div className="slot-info">
        <div className="info-item">
          <div className="info-label">Start Price</div>
          <div className="info-value">{formatPrice(startPrice)}</div>
        </div>
        <div className="info-item">
          <div className="info-label">Final Price {settled ? '✅' : '⏳'}</div>
          <div className="info-value">{settled ? formatPrice(targetPrice) : 'TBD'}</div>
        </div>
      </div>

      {!settled && status === 'open' && (
        <div className="bet-hint">
          💡 Bet if final price will be above or below {formatPrice(startPrice)}
        </div>
      )}

      {!settled && status === 'waiting' && (
        <div className="bet-hint">
          ⏳ Betting closed. Waiting for settlement...<br />
          <small style={{ color: '#666', fontSize: '10px' }}>Next slot will open after settlement</small>
        </div>
      )}

      {!settled && status === 'ready' && (
        <div className="bet-hint">
          ⏳ Ready to settle. Keeper will process soon...<br />
          <small style={{ color: '#666', fontSize: '10px' }}>New slot coming after settlement</small>
        </div>
      )}

      <div className="pools">
        <div className="pool">
          <div className="pool-label">📈 Above</div>
          <div className="pool-value">{formatEth(poolAbove)}</div>
        </div>
        <div className="pool">
          <div className="pool-label">📉 Below</div>
          <div className="pool-value">{formatEth(poolBelow)}</div>
        </div>
      </div>

      <div className="timer">{timer}</div>

      {userBet && (
        <div className="user-bet-info">
          Your bet: {formatEth(userBet.amount)} ETH {userBet.betAbove ? '📈 Above' : '📉 Below'}
        </div>
      )}

      <div className="bet-controls">
        {!settled && status === 'open' && !userBet && (
          <button className="btn" onClick={() => onBetClick(symbol, slotStartTime)}>
            Place Bet
          </button>
        )}
        
        {userBet && !settled && status === 'open' && (
          <div style={{ textAlign: 'center', color: '#ffd166', fontSize: '12px', padding: '8px', background: '#0f0f0f', borderRadius: '6px' }}>
            ✅ Bet placed! Waiting for settlement...
          </div>
        )}

        {canClaim && (
          <div style={{ textAlign: 'center', margin: '8px 0', padding: '12px', background: 'linear-gradient(135deg, #2d5016 0%, #1a3010 100%)', borderRadius: '10px', border: '2px solid #7ee027' }}>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#7ee027', marginBottom: '8px' }}>🎉 YOU WON! 🎉</div>
            <button className="btn btn-claim" onClick={() => onClaimClick(slotStartTime, symbol)}>
              Claim Your Reward
            </button>
          </div>
        )}
        
        {settled && userBet && !didWin && !userBet.claimed && (
          <div style={{ textAlign: 'center', margin: '8px 0', padding: '12px', background: 'linear-gradient(135deg, #4a1e1e 0%, #2a1010 100%)', borderRadius: '10px', border: '2px solid #ff6b6b' }}>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#ff6b6b', marginBottom: '4px' }}>💔 YOU LOST</div>
            <div style={{ fontSize: '12px', color: '#aaa' }}>Better luck next time!</div>
          </div>
        )}
        
        {settled && userBet && userBet.claimed && (
          <div style={{ textAlign: 'center', color: '#ffd166', fontSize: '12px', padding: '8px', background: '#0f0f0f', borderRadius: '6px' }}>
            ✅ Reward already claimed
          </div>
        )}
      </div>
    </div>
  );
};