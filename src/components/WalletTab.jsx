import React, { useState } from 'react';
import { MIN_DEPOSIT } from '../utils/constants';

export const WalletTab = ({ deposit, withdraw, showToast, onBalanceUpdate }) => {
  const [showDepositInput, setShowDepositInput] = useState(false);
  const [showWithdrawInput, setShowWithdrawInput] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');

  const handleDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) < MIN_DEPOSIT) {
      showToast(`❌ Minimum deposit is ${MIN_DEPOSIT} ETH`);
      return;
    }
    
    try {
      await deposit(depositAmount);
      setDepositAmount('');
      setShowDepositInput(false);
      setTimeout(onBalanceUpdate, 3000);
    } catch (e) {
      showToast('❌ Deposit failed');
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      showToast('❌ Enter valid amount');
      return;
    }
    
    try {
      await withdraw(withdrawAmount);
      setWithdrawAmount('');
      setShowWithdrawInput(false);
      setTimeout(onBalanceUpdate, 3000);
    } catch (e) {
      showToast('❌ Withdraw failed');
    }
  };

  return (
    <section className="section">
      <div className="wallet-actions">
        <button 
          className="btn" 
          onClick={() => {
            setShowDepositInput(!showDepositInput);
            setShowWithdrawInput(false);
          }}
        >
          Deposit
        </button>
        <button 
          className="btn btn-secondary" 
          onClick={() => {
            setShowWithdrawInput(!showWithdrawInput);
            setShowDepositInput(false);
          }}
        >
          Withdraw
        </button>
      </div>

      {showDepositInput && (
        <div className="input-group">
          <label>Deposit Amount (min {MIN_DEPOSIT} ETH)</label>
          <input 
            type="number" 
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            placeholder="0.001" 
            step="0.0001" 
            min={MIN_DEPOSIT}
          />
          <button 
            className="btn" 
            style={{ marginTop: '8px' }}
            onClick={handleDeposit}
          >
            Confirm Deposit
          </button>
        </div>
      )}

      {showWithdrawInput && (
        <div className="input-group">
          <label>Withdraw Amount</label>
          <input 
            type="number" 
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
            placeholder="0.001" 
            step="0.0001" 
            min="0"
          />
          <button 
            className="btn btn-secondary" 
            style={{ marginTop: '8px' }}
            onClick={handleWithdraw}
          >
            Confirm Withdraw
          </button>
        </div>
      )}
    </section>
  );
};