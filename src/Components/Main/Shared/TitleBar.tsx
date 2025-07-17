/**
 * A custom React fixed component
 * A Fixed element in the header portion of Downlodr, displays the title/logo of Downlodr with the window controls (maximize, minimize, and close)
 *
 * @param className - for UI of TitleBar
 * @returns JSX.Element - The rendered component displaying a TitleBar
 *
 */
import React from 'react';
import { IoMdClose, IoMdRemove } from 'react-icons/io';
import { PiBrowsers } from 'react-icons/pi';
import { RxBox } from 'react-icons/rx';
import downlodrLogoLight from '../../../Assets/Logo/Downlodr-Logo.svg';
import downlodrLogoDark from '../../../Assets/Logo/Downlodr-LogoDark.svg';
import { ModeToggle } from '../../../Components/SubComponents/custom/ModeToggle';
import { useTheme } from '../../../Components/ThemeProvider';
import { useMainStore } from '../../../Store/mainStore';
import ExitModal from '../Modal/ExitModal';
interface TitleBarProps {
  className?: string;
}

const TitleBar: React.FC<TitleBarProps> = ({ className }) => {
  const { theme } = useTheme();
  const [isMaximized, setIsMaximized] = React.useState<boolean>(false);
  const [platform, setPlatform] = React.useState<string>('');

  // Get platform information on component mount
  React.useEffect(() => {
    const getPlatformInfo = async () => {
      try {
        const platformInfo = await window.downlodrFunctions.getPlatform();
        setPlatform(platformInfo);
      } catch (error) {
        console.error('Error getting platform:', error);
        setPlatform('unknown');
      }
    };
    getPlatformInfo();
  }, []);

  // Get settings from store
  const { settings, isExitModalOpen, setIsExitModalOpen } = useMainStore();
  const runInBackgroundEnabled = settings.runInBackground;
  const showExitModal = settings.exitModal ?? true;

  // Function to toggle maximize/restore
  const handleMaximizeRestore = () => {
    window.downlodrFunctions.maximizeApp();
    setIsMaximized(!isMaximized);
  };

  // Handle close button click
  const handleCloseClick = () => {
    console.log('Settings object:', settings);
    console.log('runInBackgroundEnabled:', runInBackgroundEnabled);
    console.log('showExitModal:', showExitModal);
    console.log('settings.exitModal:', settings.exitModal);
    // If run in background is enabled and user hasn't disabled the exit modal, show the modal
    if (runInBackgroundEnabled && showExitModal) {
      setIsExitModalOpen(true);
    } else if (runInBackgroundEnabled) {
      // Run in background enabled but modal disabled - just hide window
      window.downlodrFunctions.closeApp();
    } else {
      // Run in background disabled - actually quit the app
      window.appControl.quitApp();
    }
  };

  // Adjust downlodr logo used depending on the light/dark mode
  const getLogoSrc = () => {
    if (theme === 'system') {
      // Check system preference
      return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? downlodrLogoDark
        : downlodrLogoLight;
    }
    // Direct theme selection
    return theme === 'dark' ? downlodrLogoDark : downlodrLogoLight;
  };

  // Check if we're on macOS
  const isMacOS = platform === 'darwin';

  return (
    <>
      <div className={className}>
        {isMacOS ? (
          // macOS layout: native positioning
          <div className="relative h-full w-full">
            {/* Window Controls - Top Left Corner */}
            <div className="absolute top-0 left-0 flex items-center h-full pl-3 space-x-2 no-drag">
              {/* Close Button */}
              <button
                className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center group"
                onClick={handleCloseClick}
              >
                <IoMdClose
                  size={8}
                  className="text-red-900 opacity-0 group-hover:opacity-100 transition-opacity"
                />
              </button>

              {/* Minimize Button */}
              <button
                className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-600 flex items-center justify-center group"
                onClick={() => window.downlodrFunctions.minimizeApp()}
              >
                <IoMdRemove
                  size={8}
                  className="text-yellow-900 opacity-0 group-hover:opacity-100 transition-opacity"
                />
              </button>

              {/* Maximize Button */}
              <button
                className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center group"
                onClick={handleMaximizeRestore}
              >
                {isMaximized ? (
                  <PiBrowsers
                    size={6}
                    className="text-green-900 opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                ) : (
                  <RxBox
                    size={6}
                    className="text-green-900 opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                )}
              </button>
            </div>

            {/* Center area - draggable */}
            <div
              className="absolute inset-0 drag-area"
              style={{ left: '80px', right: '80px' }}
            ></div>

            {/* Logo and Theme Toggle - Top Right Corner */}
            <div className="absolute top-0 right-0 flex items-center h-full pr-4 space-x-3 no-drag">
              <ModeToggle />
              <img src={getLogoSrc()} alt="Downlodr" className="h-5" />
            </div>
          </div>
        ) : (
          // Windows/Linux layout: original layout
          <div className="flex justify-between items-center h-full px-4 py-2">
            {/* Logo */}
            <div className="text-sm flex-1 drag-area">
              <img src={getLogoSrc()} alt="Downlodr" className="h-5" />
            </div>

            {/* Window Controls */}
            <div className="flex space-x-4 no-drag">
              <ModeToggle />

              {/* Minimize Button */}
              <button
                className="rounded-md hover:bg-gray-100 dark:hover:bg-darkModeCompliment hover:opacity-100 p-1 m-2"
                onClick={() => window.downlodrFunctions.minimizeApp()}
              >
                <IoMdRemove size={16} />
              </button>

              {/* Maximize Button */}
              <button
                className="rounded-md hover:bg-gray-100 dark:hover:bg-darkModeCompliment hover:opacity-100 p-1 m-2"
                onClick={handleMaximizeRestore}
              >
                {isMaximized ? <PiBrowsers size={16} /> : <RxBox size={14} />}
              </button>

              {/* Close Button */}
              <button
                className="rounded-md hover:bg-gray-100 dark:hover:bg-darkModeCompliment hover:opacity-100 p-1 m-2"
                onClick={handleCloseClick}
              >
                <IoMdClose size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      <ExitModal
        isOpen={isExitModalOpen}
        onClose={() => {
          setIsExitModalOpen(false);
        }}
        onConfirm={() => {
          setIsExitModalOpen(false);
          // Hide the window since we're running in background
          window.downlodrFunctions.closeApp();
        }}
      />
    </>
  );
};

export default TitleBar;
