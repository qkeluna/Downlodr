import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { usePluginStore } from '../../../Store/pluginStore';

interface PageNavigationProps {
  className?: string;
}

const PageNavigation: React.FC<PageNavigationProps> = ({ className = '' }) => {
  const location = useLocation();
  const { updateIsOpenPluginSidebar } = usePluginStore();

  const handleClosePanel = () => {
    updateIsOpenPluginSidebar(false);
  };

  return (
    <div className={`flex items-center ${className} gap-2`}>
      <NavLink
        to="/status/all"
        className={({ isActive }) =>
          `px-1 md:px-3 py-1 rounded flex gap-1 font-semibold ${
            isActive || !location.pathname.startsWith('/plugins')
              ? 'bg-[#F5F5F5] text-[#F45513] dark:bg-darkModeCompliment'
              : 'hover:bg-gray-100 dark:hover:bg-darkModeCompliment dark:text-gray-200'
          }`
        }
        end={false}
      >
        <span>Downloads</span>
      </NavLink>
      <NavLink
        to="/plugins"
        className={({ isActive }) =>
          `px-3 py-1 rounded flex gap-1 font-semibold ${
            isActive
              ? 'bg-[#F5F5F5] text-[#F45513] dark:bg-darkModeCompliment'
              : 'hover:bg-gray-100 dark:hover:bg-darkModeCompliment dark:text-gray-200'
          }`
        }
        onClick={handleClosePanel}
      >
        <span>Plugins</span>
      </NavLink>
    </div>
  );
};

export default PageNavigation;
