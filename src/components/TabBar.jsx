import React from 'react';

export const TabBar = ({ activeTab, onTabChange }) => {
  return (
    <div className="tabbar">
      <button 
        className={activeTab === 'wallet' ? 'active' : ''} 
        onClick={() => onTabChange('wallet')}
      >
        Wallet
      </button>
      <button 
        className={activeTab === 'bet' ? 'active' : ''} 
        onClick={() => onTabChange('bet')}
      >
        Bet
      </button>
      <button 
        className={activeTab === 'claim' ? 'active' : ''} 
        onClick={() => onTabChange('claim')}
      >
        Claim
      </button>
    </div>
  );
};