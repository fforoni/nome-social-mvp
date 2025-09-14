import Head from 'next/head';
import { useState } from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { CheckCircle, Clock, AlertCircle, ExternalLink, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import { useVerificationStatus, useInitiatePayment, usePaymentStatus } from '../hooks/useVerification';

export default function Home() {
  const { isConnected, address } = useAccount();
  const { loading, isVerified, tokenId, error, refetch } = useVerificationStatus();
  const { initiatePayment, loading: initiatingPayment } = useInitiatePayment();
  const { paymentStatus, startPolling } = usePaymentStatus();
  
  const [paymentData, setPaymentData] = useState(null);
  const [isPolling, setIsPolling] = useState(false);

  const handleInitiatePayment = async () => {
    try {
      const data = await initiatePayment();
      setPaymentData(data);
      
      // Start polling for payment status
      setIsPolling(true);
      const stopPolling = startPolling(3000); // Poll every 3 seconds
      
      // Stop polling after 10 minutes
      setTimeout(() => {
        stopPolling();
        setIsPolling(false);
      }, 600000);
      
    } catch (error) {
      console.error('Failed to initiate payment:', error);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const copyPixKey = () => {
    if (paymentData?.paymentData?.pixKey) {
      copyToClipboard(paymentData.paymentData.pixKey);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <Head>
        <title>Brazilian Identity SBT - Verify Your Identity</title>
        <meta name="description" content="Verify your Brazilian identity and mint a Soulbound Token using PIX payment" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center">
              <span className="text-2xl font-bold text-white">🇧🇷</span>
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Brazilian Identity SBT
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Verify your Brazilian identity with a simple R$ 0.01 PIX payment and mint a 
            Soulbound Token (SBT) to your wallet on Base L2
          </p>
        </div>

        {/* Connection Status */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="flex justify-center mb-6">
            <ConnectButton />
          </div>
        </div>

        {!isConnected ? (
          <div className="max-w-2xl mx-auto">
            <div className="card text-center">
              <h2 className="text-2xl font-semibold mb-4">Connect Your Wallet</h2>
              <p className="text-gray-600 mb-6">
                To get started with Brazilian identity verification, please connect your 
                Ethereum wallet. We support all major wallets including MetaMask, 
                WalletConnect, and more.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">How it works:</h3>
                <ol className="text-left text-blue-800 space-y-1">
                  <li>1. Connect your Ethereum wallet</li>
                  <li>2. Send a R$ 0.01 PIX payment</li>
                  <li>3. Your CPF is validated automatically</li>
                  <li>4. Receive your identity SBT on Base L2</li>
                </ol>
              </div>
            </div>
          </div>
        ) : loading ? (
          <div className="max-w-2xl mx-auto">
            <div className="card text-center">
              <div className="loading-spinner mx-auto mb-4"></div>
              <p>Checking verification status...</p>
            </div>
          </div>
        ) : isVerified ? (
          <div className="max-w-2xl mx-auto">
            <div className="card text-center">
              <CheckCircle className="w-16 h-16 text-success-500 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-success-600 mb-4">
                Identity Verified! 🎉
              </h2>
              <p className="text-gray-600 mb-6">
                Your Brazilian identity has been successfully verified and your 
                Soulbound Token has been minted to your wallet.
              </p>
              
              <div className="bg-success-50 border border-success-200 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-success-700 font-medium">Token ID:</span>
                  <span className="text-success-900 font-mono">{tokenId}</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-success-700 font-medium">Network:</span>
                  <span className="text-success-900">Base</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-success-700 font-medium">Wallet:</span>
                  <span className="text-success-900 font-mono text-sm">
                    {address?.slice(0, 6)}...{address?.slice(-4)}
                  </span>
                </div>
              </div>
              
              <button
                onClick={() => window.open('https://basescan.org/address/' + address, '_blank')}
                className="btn-secondary mr-4"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                View on Basescan
              </button>
              <button
                onClick={refetch}
                className="btn-primary"
              >
                Refresh Status
              </button>
            </div>
          </div>
        ) : error ? (
          <div className="max-w-2xl mx-auto">
            <div className="card text-center">
              <AlertCircle className="w-16 h-16 text-error-500 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-error-600 mb-4">Error</h2>
              <p className="text-gray-600 mb-6">{error}</p>
              <button onClick={refetch} className="btn-primary">
                Try Again
              </button>
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            {!paymentData ? (
              <div className="card text-center">
                <h2 className="text-2xl font-semibold mb-4">Verify Your Identity</h2>
                <p className="text-gray-600 mb-6">
                  Start the verification process by initiating a R$ 0.01 PIX payment.
                  Your CPF will be validated automatically when the payment is received.
                </p>
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-yellow-900 mb-2">⚠️ Important:</h3>
                  <ul className="text-left text-yellow-800 space-y-1">
                    <li>• Send exactly R$ 0.01 (one cent)</li>
                    <li>• Use your own CPF for the PIX payment</li>
                    <li>• Each CPF can only verify once</li>
                    <li>• The SBT is non-transferable</li>
                  </ul>
                </div>
                
                <button
                  onClick={handleInitiatePayment}
                  disabled={initiatingPayment}
                  className="btn-primary text-lg px-8 py-3"
                >
                  {initiatingPayment ? (
                    <>
                      <div className="loading-spinner w-5 h-5 mr-2"></div>
                      Initiating...
                    </>
                  ) : (
                    'Start Verification'
                  )}
                </button>
              </div>
            ) : (
              <div className="card">
                <div className="text-center mb-6">
                  <Clock className="w-16 h-16 text-primary-500 mx-auto mb-4" />
                  <h2 className="text-2xl font-semibold mb-2">Send PIX Payment</h2>
                  <p className="text-gray-600">
                    {isPolling ? 'Waiting for payment confirmation...' : 'Send the PIX payment to complete verification'}
                  </p>
                </div>
                
                <div className="bg-primary-50 border border-primary-200 rounded-lg p-6 mb-6">
                  <div className="grid gap-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-primary-700">Amount:</span>
                      <span className="text-primary-900 font-bold text-lg">R$ 0.01</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-primary-700">PIX Key:</span>
                      <div className="flex items-center">
                        <span className="text-primary-900 font-mono text-sm mr-2">
                          {paymentData.paymentData.pixKey}
                        </span>
                        <button
                          onClick={copyPixKey}
                          className="p-1 hover:bg-primary-100 rounded"
                          title="Copy PIX key"
                        >
                          <Copy className="w-4 h-4 text-primary-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold mb-3">Instructions:</h3>
                  <ol className="space-y-2 text-sm">
                    {paymentData.instructions.steps.map((step, index) => (
                      <li key={index} className="flex items-start">
                        <span className="font-bold text-primary-600 mr-2">{index + 1}.</span>
                        <span>{step.replace(/^\d+\.\s*/, '')}</span>
                      </li>
                    ))}
                  </ol>
                </div>
                
                {paymentStatus.status === 'pending' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center">
                      <div className="loading-spinner w-5 h-5 mr-3"></div>
                      <span className="text-blue-800">{paymentStatus.message}</span>
                    </div>
                  </div>
                )}
                
                <div className="flex justify-center space-x-4">
                  <button
                    onClick={() => {
                      setPaymentData(null);
                      setIsPolling(false);
                    }}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={refetch}
                    className="btn-primary"
                  >
                    Check Status
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <footer className="text-center mt-16 py-8 border-t border-gray-200">
          <p className="text-gray-600">
            Built on <strong>Base L2</strong> • Secured by <strong>Brazilian PIX</strong>
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Your privacy is protected - only hashed CPF data is stored on-chain
          </p>
        </footer>
      </main>
    </div>
  );
}