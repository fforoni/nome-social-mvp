import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import api from '../utils/api';
import toast from 'react-hot-toast';

export function useVerificationStatus() {
  const { address } = useAccount();
  const [status, setStatus] = useState({
    loading: true,
    isVerified: false,
    tokenId: null,
    error: null,
  });

  useEffect(() => {
    if (!address) {
      setStatus({
        loading: false,
        isVerified: false,
        tokenId: null,
        error: null,
      });
      return;
    }

    const checkStatus = async () => {
      try {
        const response = await api.get(`/verify/status/${address}`);
        setStatus({
          loading: false,
          isVerified: response.data.isVerified,
          tokenId: response.data.tokenId,
          error: null,
        });
      } catch (error) {
        setStatus({
          loading: false,
          isVerified: false,
          tokenId: null,
          error: error.message,
        });
      }
    };

    checkStatus();
  }, [address]);

  const refetch = () => {
    if (address) {
      setStatus(prev => ({ ...prev, loading: true }));
      // Re-trigger the effect
      setTimeout(() => {
        setStatus(prev => ({ ...prev, loading: false }));
      }, 100);
    }
  };

  return { ...status, refetch };
}

export function usePaymentStatus() {
  const { address } = useAccount();
  const [paymentStatus, setPaymentStatus] = useState({
    status: 'idle', // idle, pending, completed, error
    message: '',
    tokenId: null,
  });

  const checkPaymentStatus = async () => {
    if (!address) return;

    try {
      const response = await api.get(`/verify/payment-status/${address}`);
      setPaymentStatus({
        status: response.data.status,
        message: response.data.message,
        tokenId: response.data.tokenId || null,
      });
      
      if (response.data.status === 'completed') {
        toast.success(response.data.message);
      }
      
      return response.data;
    } catch (error) {
      setPaymentStatus({
        status: 'error',
        message: error.message,
        tokenId: null,
      });
      toast.error(error.message);
      throw error;
    }
  };

  const startPolling = (intervalMs = 5000) => {
    const interval = setInterval(async () => {
      try {
        const result = await checkPaymentStatus();
        if (result.status === 'completed' || result.status === 'error') {
          clearInterval(interval);
        }
      } catch (error) {
        clearInterval(interval);
      }
    }, intervalMs);

    return () => clearInterval(interval);
  };

  return {
    paymentStatus,
    checkPaymentStatus,
    startPolling,
  };
}

export function useInitiatePayment() {
  const { address } = useAccount();
  const [loading, setLoading] = useState(false);

  const initiatePayment = async () => {
    if (!address) {
      toast.error('Please connect your wallet first');
      return null;
    }

    setLoading(true);
    try {
      const response = await api.post('/verify/initiate-payment', {
        walletAddress: address,
      });
      
      toast.success('PIX payment initiated successfully!');
      return response.data;
    } catch (error) {
      toast.error(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return { initiatePayment, loading };
}