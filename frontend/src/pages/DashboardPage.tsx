import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { HeaderNav } from '../components/HeaderNav';
import { SidebarNav } from '../components/SidebarNav';
import { OverviewView } from './OverviewView';
import { SonarIntelligenceView } from './SonarIntelligenceView';
import { OceanExplorerView } from './OceanExplorerView';
import { ReviewQueueView } from './ReviewQueueView';
import { SeabedDigitalTwinView } from './SeabedDigitalTwinView';
import { TheaterView } from './TheaterView';
import { MissionSimulatorView } from './MissionSimulatorView';
import { ResearchLabView } from './ResearchLabView';
import { DatasetCenterView } from './DatasetCenterView';
import { ModelRegistryView } from './ModelRegistryView';
import { ReportsView } from './ReportsView';
import { ShowcaseView } from './ShowcaseView';
import { MarineAssistantDrawer } from '../components/MarineAssistantDrawer';
import { CommandPaletteModal } from '../components/CommandPaletteModal';
import { SonarChallengeModal } from '../components/SonarChallengeModal';

interface DashboardPageProps {
  onLogout: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onLogout }) => {
  const {
    activeTab,
    isAssistantOpen,
    setAssistantOpen,
    isCommandPaletteOpen,
    setCommandPaletteOpen,
    isChallengeOpen,
    setChallengeOpen,
  } = useAppStore();

  const renderActiveView = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewView />;
      case 'sonar-intelligence':
        return <SonarIntelligenceView />;
      case 'ocean-explorer':
        return <OceanExplorerView />;
      case 'review-queue':
        return <ReviewQueueView />;
      case 'seabed-3d':
        return <SeabedDigitalTwinView />;
      case 'theater':
        return <TheaterView />;
      case 'mission-simulator':
        return <MissionSimulatorView />;
      case 'research-lab':
        return <ResearchLabView />;
      case 'dataset-center':
        return <DatasetCenterView />;
      case 'model-registry':
        return <ModelRegistryView />;
      case 'reports':
        return <ReportsView />;
      case 'showcase':
        return <ShowcaseView />;
      default:
        return <OverviewView />;
    }
  };

  return (
    <div className="min-h-screen bg-[#020b14] text-slate-100 flex flex-col font-sans select-none antialiased">
      {/* Top Bar Navigation */}
      <HeaderNav onLogout={onLogout} />

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <SidebarNav />

        {/* Content Viewport */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-[#020b14]">
          <div className="max-w-7xl mx-auto space-y-6">
            {renderActiveView()}
          </div>
        </main>
      </div>

      {/* Global Modals & Drawers */}
      <MarineAssistantDrawer isOpen={isAssistantOpen} onClose={() => setAssistantOpen(false)} />
      <CommandPaletteModal isOpen={isCommandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />
      <SonarChallengeModal isOpen={isChallengeOpen} onClose={() => setChallengeOpen(false)} />
    </div>
  );
};
