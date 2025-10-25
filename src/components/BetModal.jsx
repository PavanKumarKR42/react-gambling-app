import React, { useState, useEffect } from 'react';

export const BetModal = ({ isOpen, onClose, symbol, slotStartTime, onConfirm, showToast }) => {
  const [betAbove, setBetAbove] = useState(true);
  const [amount, setAmount] = useState('');

  useEffect(() => {
    if (isOpen) {
      setBetAbove(true);
      setAmount('');
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      showToast('❌ Enter valid bet amount');
      return;
    }

    try {
      await onConfirm(slotStartTime, symbol, betAbove, amount);
      onClose();
    } catch (e) {
      showToast('❌ Bet failed: ' + (e.message || 'Unknown error'));
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target.className.includes('modal')) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal show" onClick={handleBackdropClick}>
      <div className="modal-content">
        <div className="modal-header">Place Bet - {symbol}</div>
        
        <div className="bet-option">
          <button 
            className={betAbove ? 'selected' : ''}
            onClick={() => setBetAbove(true)}
          >
            📈 Above
          </button>
          <button 
            className={!betAbove ? 'selected' : ''}
            onClick={() => setBetAbove(false)}
          >
            📉 Below
          </button>
        </div>

        <div className="input-group">
          <label>Bet Amount (ETH)</label>
          <input 
            type="number" 
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.001" 
            step="0.0001" 
            min="0.0001"
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn" onClick={handleConfirm}>
            Place Bet
          </button>
        </div>
      </div>
    </div>
  );
};