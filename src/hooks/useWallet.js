import { useState, useEffect } from 'react';
import { createConfig, connect, getAccount, getBalance } from 'https://esm.sh/@wagmi/core';
import { baseSepolia } from 'https://esm.sh/@wagmi/core/chains';
import { http } from 'https://esm.sh/@wagmi/core';
import { farcasterMiniApp } from 'https://esm.sh/@farcaster/miniapp-wagmi-connector';
import { sdk } from 'https://esm.sh/@farcaster/miniapp-sdk';

export const useWallet = (showToast) => {
  const [config, setConfig] = useState(null);
  const [userAddress, setUserAddress] = useState(null);
  const [walletBalance, setWalletBalance] = useState('-- ETH');
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    const wagmiConfig = createConfig({
      chains: [baseSepolia],
      transports: { [baseSepolia.id]: http() }
    });
    setConfig(wagmiConfig);

    // Initialize Farcaster SDK
    sdk.actions.ready({ disableNativeGestures: true }).then(async () => {
      console.log("Farcaster MiniApp ready");

      const hasPromptedAddApp = sessionStorage.getItem('hasPromptedAddApp');
      if (!hasPromptedAddApp) {
        try {
          await sdk.actions.addMiniApp();
          sessionStorage.setItem('hasPromptedAddApp', 'true');
        } catch (error) {
          sessionStorage.setItem('hasPromptedAddApp', 'true');
        }
      }
    }).catch(err => {
      console.error("SDK ready error:", err);
      showToast("Failed to initialize. Try reloading.");
    });
  }, [showToast]);

  useEffect(() => {
    if (config) {
      autoConnectWallet();
    }
  }, [config]);

  const autoConnectWallet = async () => {
    if (!config || isConnecting) return;
    
    try {
      setIsConnecting(true);
      await connect(config, {
        connector: farcasterMiniApp(),
        chainId: baseSepolia.id
      });
      
      const account = getAccount(config);
      if (account?.address) {
        setUserAddress(account.address);
        showToast(`✅ Connected: ${account.address.slice(0, 6)}…${account.address.slice(-4)}`);
        await updateWalletBalance(account.address);
      } else {
        throw new Error("No address returned");
      }
    } catch (err) {
      console.error("Auto connect failed:", err);
      setUserAddress(null);
      showToast("⚠️ Connection failed. Open in Warpcast.", 5000);
    } finally {
      setIsConnecting(false);
    }
  };

  const updateWalletBalance = async (address) => {
    if (!config || !address) {
      setWalletBalance('-- ETH');
      return;
    }
    
    try {
      const balance = await getBalance(config, { address });
      setWalletBalance(`${parseFloat(balance.formatted).toFixed(4)} ETH`);
    } catch (e) {
      console.error('Balance update error:', e);
      setWalletBalance('-- ETH');
    }
  };

  const updateBalance = () => {
    if (userAddress) {
      updateWalletBalance(userAddress);
    }
  };

  return {
    config,
    userAddress,
    walletBalance,
    updateBalance
  };
};