import React from 'react';
import { Tab } from '../../types';
import TabButton from '../common/TabButton';
import AnalyzeIcon from '../icons/AnalyzeIcon';
import GenerateIcon from '../icons/GenerateIcon';
import ModelCreatorIcon from '../icons/ModelCreatorIcon';
import AIStudioIcon from '../icons/AIStudioIcon';
import GalleryIcon from '../icons/GalleryIcon';
import HistoryIcon from '../icons/HistoryIcon';

interface NavigationProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
}

const Navigation: React.FC<NavigationProps> = ({ activeTab, setActiveTab }) => {
  return (
    <nav className="flex justify-center items-center gap-2 sm:gap-4 mb-8 flex-wrap">
      <TabButton isActive={activeTab === Tab.Analyze} onClick={() => setActiveTab(Tab.Analyze)}>
        <AnalyzeIcon /> Analyze & Prompt
      </TabButton>
      <TabButton isActive={activeTab === Tab.Generate} onClick={() => setActiveTab(Tab.Generate)}>
        <GenerateIcon /> Generate & Edit
      </TabButton>
      <TabButton isActive={activeTab === Tab.ModelCreator} onClick={() => setActiveTab(Tab.ModelCreator)}>
        <ModelCreatorIcon /> Model Creator
      </TabButton>
      <TabButton isActive={activeTab === Tab.AIStudio} onClick={() => setActiveTab(Tab.AIStudio)}>
        <AIStudioIcon /> AI Studio
      </TabButton>
      <TabButton isActive={activeTab === Tab.Gallery} onClick={() => setActiveTab(Tab.Gallery)}>
        <GalleryIcon /> My Gallery
      </TabButton>
      <TabButton isActive={activeTab === Tab.History} onClick={() => setActiveTab(Tab.History)}>
        <HistoryIcon /> History
      </TabButton>
    </nav>
  );
};

export default Navigation;
