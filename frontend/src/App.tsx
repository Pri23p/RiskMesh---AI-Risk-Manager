import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { OverviewPage } from './pages/OverviewPage';
import { RiskQueuePage } from './pages/RiskQueuePage';
import { AbuseNetworkPage } from './pages/AbuseNetworkPage';
import { AlertsPage } from './pages/AlertsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { ModelHealthPage } from './pages/ModelHealthPage';
import { AIAnalystPage } from './pages/AIAnalystPage';
import { DemoPresentationPage } from './pages/DemoPresentationPage';
import { OrderDetailModal } from './pages/OrderDetailModal';
import { apiClient } from './api/client';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedClusterId, setSelectedClusterId] = useState<string | undefined>(undefined);
  const [activeAlertsCount, setActiveAlertsCount] = useState<number>(2);
  const [highRiskCount, setHighRiskCount] = useState<number>(0);

  const fetchSummaryBadges = async () => {
    try {
      const [analyticsRes, alertsRes] = await Promise.all([
        apiClient.getAnalytics(),
        apiClient.getAlerts()
      ]);
      setHighRiskCount(analyticsRes.high_risk_orders);
      setActiveAlertsCount(alertsRes.active_alerts_count);
    } catch (err) {
      console.error('Failed to load summary badges:', err);
    }
  };

  useEffect(() => {
    fetchSummaryBadges();
  }, []);

  const handleOpenOrder = (orderId: string) => {
    setSelectedOrderId(orderId);
  };

  const handleOpenCluster = (clusterId: string) => {
    setSelectedClusterId(clusterId);
    setActiveTab('abuse-network');
  };

  return (
    <div className="min-h-screen bg-[#080C15] text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        onLaunchDemoMode={() => setActiveTab(activeTab === 'demo' ? 'overview' : 'demo')}
        isDemoMode={activeTab === 'demo'}
        activeTab={activeTab}
      />

      {/* Main Layout */}
      <div className="flex flex-1">
        {/* Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          activeAlertsCount={activeAlertsCount}
          highRiskCount={highRiskCount}
        />

        {/* Content View */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
          {activeTab === 'overview' && (
            <OverviewPage
              onSelectOrder={handleOpenOrder}
              onNavigate={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'queue' && (
            <RiskQueuePage onSelectOrder={handleOpenOrder} />
          )}

          {activeTab === 'abuse-network' && (
            <AbuseNetworkPage
              onSelectOrder={handleOpenOrder}
              selectedClusterId={selectedClusterId}
            />
          )}

          {activeTab === 'alerts' && (
            <AlertsPage onNavigateToQueue={() => setActiveTab('queue')} />
          )}

          {activeTab === 'analytics' && <AnalyticsPage />}

          {activeTab === 'model-health' && <ModelHealthPage />}

          {activeTab === 'analyst' && <AIAnalystPage />}

          {activeTab === 'demo' && (
            <DemoPresentationPage
              onNavigateToTab={(tab) => setActiveTab(tab)}
              onOpenOrder={handleOpenOrder}
              onOpenCluster={handleOpenCluster}
            />
          )}
        </main>
      </div>

      {/* Order Detail Investigation Dossier Modal */}
      {selectedOrderId && (
        <OrderDetailModal
          orderId={selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
          onDecisionSuccess={fetchSummaryBadges}
          onNavigateToCluster={(clusterId) => {
            setSelectedOrderId(null);
            handleOpenCluster(clusterId);
          }}
        />
      )}
    </div>
  );
};

export default App;
