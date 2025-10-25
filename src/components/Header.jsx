import React from 'react';
import { formatAddress } from '../utils/helpers';

export const Header = ({ userAddress, walletBalance, contractBalance }) => {
  return (
    <div className="header">
      <div className="wallet-info">
        <div className="wallet-row">
          <span>Address:</span>
          <span className="address">{formatAddress(userAddress) || 'Connecting...'}</span>
        </div>
        <div className="wallet-row">
          <span>Wallet Balance:</span>
          <span className="balance">{walletBalance}</span>
        </div>
        <div className="wallet-row">
          <span>Contract Balance:</span>
          <span className="balance">{contractBalance}</span>
        </div>
      </div>
    </div>
  );
};