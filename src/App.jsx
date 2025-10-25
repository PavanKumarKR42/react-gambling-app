import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { TabBar } from './components/TabBar';
import { WalletTab } from './components/WalletTab';
import { BetTab } from './components/BetTab';
import { ClaimTab } from './components/ClaimTab';
import { BetModal } from './components/BetModal';
import { Toast } from './components/Toast';
import { useWallet } from './hooks/useWallet';
import { useContract } from './hooks/useContract';
import { useEventWatchers } from './hooks/useEventWatchers';
import './styles/App.css';

function App() {
  const [activeTab, setActiveTab] = useState('wallet');
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [betModalOpen, setBetModalOpen] = useState(false);
  const [betModalData, setBetModalData] = useState({ symbol: '', slotStartTime: 0 });
  const [forceClaimReload, setForceClaimReload] = useState(0);
  const toastTimeout = useRef(null);

  const showToastMessage = useCallback((message, duration = 3500) => {
    setToastMessage(message);
    setShowToast(true);
    
    if (toastTimeout.current) {
      clearTimeout(toastTimeout.current);
    }
    
    toastTimeout.current = setTimeout(() => {
      setShowToast(false);
    }, duration);
  }, []);

  const { config, userAddress, walletBalance, updateBalance } = useWallet(showToastMessage);
  
  const {
    contractBalance,
    updateContractBalance,
    deposit,
    withdraw,
    placeBet,
    claim,
    getSlot,
    getBet,
    getLastSlotTime
  } = useContract(config, userAddress, showToastMessage);

  const handleBalanceUpdate = useCallback(() => {
    updateBalance();
    updateContractBalance();
  }, [updateBalance, updateContractBalance]);

  const handleBetClick = (symbol, slotStartTime) => {
    setBetModalData({ symbol, slotStartTime });
    setBetModalOpen(true);
  };

  const handleBetConfirm = async (slotStartTime, symbol, betAbove, amount) => {
    try {
      await placeBet(slotStartTime, symbol, betAbove, amount);
      setTimeout(handleBalanceUpdate, 3000);
    } catch (e) {
      throw e;
    }
  };

  const handleClaimClick = async (slotStartTime, symbol) => {
    try {
      await claim(slotStartTime, symbol);
      setTimeout(() => {
        handleBalanceUpdate();
        setForceClaimReload(prev => prev + 1);
      }, 3000);
    } catch (e) {
      showToastMessage('❌ Claim failed: ' + (e.message || 'Unknown error'));
    }
  };

  const eventCallbacks = {
    onBetPlaced: () => {
      if (activeTab === 'bet') {
        // BetTab will refresh automatically via its own logic
      }
      handleBalanceUpdate();
    },
    onClaimed: () => {
      if (activeTab === 'bet') {
        // BetTab will refresh automatically
      }
      if (activeTab === 'claim') {
        setForceClaimReload(prev => prev + 1);
      }
      handleBalanceUpdate();
    },
    onSlotCreated: () => {
      if (activeTab === 'bet') {
        // BetTab will refresh automatically
      }
    },
    onSlotSettled: () => {
      if (activeTab === 'bet') {
        // BetTab will refresh automatically
      }
      if (activeTab === 'claim') {
        setForceClaimReload(prev => prev + 1);
      }
    }
  };

  useEventWatchers(config, userAddress, showToastMessage, eventCallbacks);

  // Periodic balance updates
  useEffect(() => {
    const interval = setInterval(() => {
      handleBalanceUpdate();
    }, 5000);

    return () => clearInterval(interval);
  }, [handleBalanceUpdate]);

  return (
    <div className="App">
      <Header 
        userAddress={userAddress}
        walletBalance={walletBalance}
        contractBalance={contractBalance}
      />
      
      <TabBar 
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {activeTab === 'wallet' && (
        <WalletTab
          deposit={deposit}
          withdraw={withdraw}
          showToast={showToastMessage}
          onBalanceUpdate={handleBalanceUpdate}
        />
      )}

      {activeTab === 'bet' && (
        <BetTab
          config={config}
          userAddress={userAddress}
          getSlot={getSlot}
          getBet={getBet}
          getLastSlotTime={getLastSlotTime}
          onBetClick={handleBetClick}
          onClaimClick={handleClaimClick}
        />
      )}

      {activeTab === 'claim' && (
        <ClaimTab
          config={config}
          userAddress={userAddress}
          getSlot={getSlot}
          getBet={getBet}
          getLastSlotTime={getLastSlotTime}
          onClaimClick={handleClaimClick}
          forceReload={forceClaimReload}
        />
      )}

      <BetModal
        isOpen={betModalOpen}
        onClose={() => setBetModalOpen(false)}
        symbol={betModalData.symbol}
        slotStartTime={betModalData.slotStartTime}
        onConfirm={handleBetConfirm}
        showToast={showToastMessage}
      />

      <Toast 
        message={toastMessage}
        isVisible={showToast}
      />
    </div>
  );
}

export default App;