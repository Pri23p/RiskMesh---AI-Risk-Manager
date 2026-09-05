import { useState, useEffect } from 'react';

import { Layout } from './components/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { TransactionDetailPage } from './pages/TransactionDetailPage';
import { NetworkPage } from './pages/NetworkPage';
import { RiskCasesPage } from './pages/RiskCasesPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { ModelPerformancePage } from './pages/ModelPerformancePage';
import { AnalyzeTransactionPage } from './pages/AnalyzeTransactionPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';

export interface MerchantUser {
  businessName: string;
  email: string;
  role: string;
  merchantId: string;
}

const DEFAULT_DEMO_MERCHANT: MerchantUser = {
  businessName: 'Nexus Retail Enterprises Ltd',
  email: 'merchant.admin@nexus-retail.in',
  role: 'Head of Fraud Risk & Loss Prevention',
  merchantId: 'MID_NEXUS_9981',
};

export default function App() {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return window.location.pathname || '/dashboard';
  });

  // Merchant authentication state persisted in localStorage
  const [merchant, setMerchant] = useState<MerchantUser | null>(() => {
    const saved = localStorage.getItem('riskmesh_merchant_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return DEFAULT_DEMO_MERCHANT;
      }
    }
    return DEFAULT_DEMO_MERCHANT; // Default authenticated demo merchant session
  });

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/dashboard');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogin = (user: MerchantUser) => {
    setMerchant(user);
    localStorage.setItem('riskmesh_merchant_user', JSON.stringify(user));
    navigate('/dashboard');
  };

  const handleSignup = (user: MerchantUser) => {
    setMerchant(user);
    localStorage.setItem('riskmesh_merchant_user', JSON.stringify(user));
    navigate('/dashboard');
  };

  const handleLogout = () => {
    setMerchant(null);
    localStorage.removeItem('riskmesh_merchant_user');
    navigate('/login');
  };

  // Auth Routing: If navigating to /login or /signup, or if logged out
  if (currentPath === '/signup') {
    return (
      <SignupPage
        onSignup={handleSignup}
        onNavigateToLogin={() => navigate('/login')}
      />
    );
  }

  if (currentPath === '/login' || !merchant) {
    return (
      <LoginPage
        onLogin={handleLogin}
        onNavigateToSignup={() => navigate('/signup')}
      />
    );
  }

  // Authenticated Merchant Dashboard Routes
  const renderContent = () => {
    if (currentPath === '/' || currentPath === '/dashboard') {
      return <DashboardPage onNavigate={navigate} />;
    }

    if (currentPath === '/analyze') {
      return <AnalyzeTransactionPage onNavigate={navigate} />;
    }

    if (currentPath === '/transactions') {
      return <TransactionsPage onNavigate={navigate} />;
    }

    if (currentPath.startsWith('/transactions/')) {
      const transactionId = currentPath.replace('/transactions/', '');
      return <TransactionDetailPage transactionId={transactionId} onNavigate={navigate} />;
    }

    // Abuse-Ring Sentinel (Fraud Network Graph)
    if (currentPath === '/network') {
      return <NetworkPage onNavigate={navigate} />;
    }

    if (currentPath === '/risk-cases') {
      return <RiskCasesPage onNavigate={navigate} />;
    }

    if (currentPath === '/analytics') {
      return <AnalyticsPage />;
    }

    if (currentPath === '/model-performance') {
      return <ModelPerformancePage />;
    }

    // Default fallback
    return <DashboardPage onNavigate={navigate} />;
  };

  return (
    <Layout
      activePath={currentPath}
      onNavigate={navigate}
      merchant={merchant}
      onLogout={handleLogout}
    >
      {renderContent()}
    </Layout>
  );
}
