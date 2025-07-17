import SelectingDirectory from '@/Components/SubComponents/custom/Overlays/SelectingDirectory';
import { Component, ErrorInfo, ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import DropdownBar from '../Components/Main/Shared/DropdownBar';
import Navigation from '../Components/Main/Shared/Navigation';
import TaskBar from '../Components/Main/Shared/TaskBar';
import TitleBar from '../Components/Main/Shared/TitleBar';
import { useMainStore } from '../Store/mainStore';

// Error Boundary component
class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Error Detection
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 text-center">
          <h1 className="text-xl text-red-600">Something went wrong</h1>
          <p className="text-gray-600">{this.state.error?.message}</p>
          <button
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
// End of Error Detection

const MainLayout = () => {
  const { isNavCollapsed, setIsNavCollapsed } = useMainStore();

  const toggleNavCollapse = () => {
    setIsNavCollapsed(!isNavCollapsed);
  };

  return (
    <ErrorBoundary>
      <div className="h-screen flex flex-col bg-white dark:bg-darkMode text-gray-900 dark:text-gray-100">
        <TitleBar className="h-10 p-2 bg-titleBar dark:bg-darkMode border-b-2 border-gray-200 dark:border-darkModeCompliment" />
        <DropdownBar className="h-11 pl-4 bg-nav-main dark:bg-darkMode border-b-2 border-gray-200 dark:border-darkModeCompliment" />
        <TaskBar className="w-full px-6 py-2 pl-[8px]  bg-nav-main dark:bg-darkMode border-b-2 border-gray-200 dark:border-darkModeCompliment" />
        <div className="flex flex-1 overflow-hidden h-[calc(100vh-120px)]">
          <Navigation
            className={`${
              isNavCollapsed ? 'w-[60px]' : 'w-[190px]'
            } overflow-y-auto h-full transition-all duration-300 border-solid border-r-2 border-gray-200 dark:border-darkModeCompliment `}
            collapsed={isNavCollapsed}
            toggleCollapse={toggleNavCollapse}
          />
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
        <SelectingDirectory />
      </div>
    </ErrorBoundary>
  );
};

export default MainLayout;
