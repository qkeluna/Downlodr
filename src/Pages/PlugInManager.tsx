/* eslint-disable @typescript-eslint/no-explicit-any */
// src/Components/Pages/PluginManager.tsx
import ConfirmModal from '@/Components/Main/Modal/ConfirmModal';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/Components/SubComponents/shadcn/components/ui/tabs';
import browsePluginsLang from '@/Lang/browsePluginsLang';
import { PluginInfo } from '@/plugins/types';
import { usePluginStore } from '@/Store/pluginStore';
import { useTaskbarDownloadStore } from '@/Store/taskbarDownloadStore';
import { renderIcon } from '@/Utils/iconHelpers';
import { getFirstParagraph } from '@/Utils/stringHelpers';
import { useEffect, useRef, useState } from 'react';
import { FaCheck, FaPlus } from 'react-icons/fa6';
import { FiSearch } from 'react-icons/fi';
import { LuDownload, LuFiles, LuUsers } from 'react-icons/lu';
import { NavLink } from 'react-router-dom';
import NoPlugin from '../Assets/Images/extension_light_nobg 1.svg';
import { Button } from '../Components/SubComponents/shadcn/components/ui/button';
import { toast } from '../Components/SubComponents/shadcn/hooks/use-toast';

interface PluginCardProps {
  plugin: PluginInfo;
  pluginType: 'installed' | 'browse';
  onClickButton?: () => void;
  enabledPlugins?: Record<string, boolean>;
  onClickToggle?: () => void;
}

const PluginCard = ({
  plugin,
  pluginType,
  onClickButton,
  enabledPlugins,
  onClickToggle,
}: PluginCardProps) => {
  const { plugins } = usePluginStore();

  const isPluginInstalled = plugins.some((p) => p.name === plugin.name);

  return (
    <div className="w-sm bg-[#FFFFFF] dark:bg-darkMode rounded-sm p-4 shadow-sm ring-1 ring-gray-200 dark:ring-darkModeCompliment border-l-4 border-l-[#FFFFFF] dark:border-l-4 dark:border-l-darkMode hover:border-l-4 hover:border-l-[#F45513] hover:dark:border-l-[#F45513] h-50 flex flex-col">
      {/* Header section */}
      <div className="flex items-center mb-3">
        <span className="inline-flex items-center justify-center mr-2 flex-shrink-0">
          {renderIcon(plugin.icon, 'md', plugin.name)}
        </span>
        <div className="flex flex-col">
          <h3 className="text-lg text-[14px] font-semibold truncate">
            {plugin.name}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate flex items-center">
            <span className="mr-1">
              <LuUsers />
            </span>
            {plugin.author}
          </p>
        </div>
      </div>

      {/* Description section - takes remaining space */}
      <div className="flex-1 flex flex-col justify-start min-h-0 mt-2">
        <p className="text-sm line-clamp-4 overflow-hidden h-12 leading-4">
          {getFirstParagraph(plugin.description, plugin.name)}
        </p>
        <div className="hidden items-center justify-between mt-4">
          <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate flex items-center">
            <span className="mr-1">
              <LuDownload />
            </span>
            12.1k
          </p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate flex items-center">
            Version 1.0.0
          </p>
        </div>
      </div>

      {/* Divider */}
      <hr className="solid my-4 w-full border-t border-divider dark:border-darkModeCompliment" />

      {/* Button section - always at bottom */}
      <div className="flex-shrink-0">
        {pluginType === 'installed' && (
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div className="flex gap-2 flex-wrap">
              <NavLink to="/plugins/details" state={{ plugin }}>
                <Button
                  variant="outline"
                  className="dark:border-darkModeCompliment border-2 px-2 py-0 dark:hover:bg-darkModeDropdown dark:bg-darkModeDropdown hover:text-primary dark:hover:text-primary"
                >
                  Details
                </Button>
              </NavLink>
              <Button
                variant="outline"
                className="border-2 px-2 py-0 dark:hover:bg-darkModeDropdown dark:bg-darkModeDropdown dark:border-darkModeCompliment hover:text-primary dark:hover:text-primary"
                onClick={onClickButton}
              >
                Remove
              </Button>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={enabledPlugins[plugin.id] || false}
                  onChange={onClickToggle}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 dark:peer-focus:ring-orange-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-orange-500"></div>
              </label>
            </div>
          </div>
        )}

        {pluginType === 'browse' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
            <Button
              variant="outline"
              className="w-full border-2 px-2 py-0 dark:hover:bg-darkModeDropdown dark:bg-darkModeDropdown dark:border-darkModeCompliment hover:text-primary dark:hover:text-primary"
              icon={<LuFiles />}
            >
              More Details
            </Button>

            {isPluginInstalled ? (
              <Button
                variant="outline"
                className="w-full px-2 py-0 bg-black text-white hover:bg-black/70 dark:hover:bg-darkModeDropdown dark:bg-darkModeDropdown dark:border-darkModeCompliment pointer-events-none opacity-20"
                icon={<FaCheck />}
              >
                Active
              </Button>
            ) : (
              <Button
                variant="outline"
                className="w-full px-2 py-0 bg-black text-white hover:bg-black/70 dark:hover:bg-darkModeDropdown dark:bg-darkModeDropdown dark:border-darkModeCompliment hover:text-white dark:hover:text-primary"
                icon={<LuDownload />}
              >
                Install
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const PluginManager = () => {
  const { plugins, loadPlugins } = usePluginStore();
  const { isSelectingDirectory, setIsSelectingDirectory } =
    useTaskbarDownloadStore();

  // Plugins
  const [loading, setLoading] = useState(true);
  const [enabledPlugins, setEnabledPlugins] = useState<Record<string, boolean>>(
    {},
  );

  // Confirmation modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pluginToRemove, setPluginToRemove] = useState<string | null>(null);

  // Search
  const [searchTerm, setSearchTerm] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [searchResults, setSearchResults] = useState<PluginInfo[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);

  // Filter search results when search term changes
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setSearchResults([]);
      return;
    }

    const results = plugins.filter(
      (plugin) =>
        plugin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        plugin.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        plugin.author.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    setSearchResults(results);
  }, [searchTerm, plugins]);

  useEffect(() => {
    handleLoadPlugins();
  }, []);

  // Load enabled plugins state
  useEffect(() => {
    const loadEnabledState = async () => {
      try {
        const enabledState = await window.plugins.getEnabledPlugins();
        setEnabledPlugins(enabledState || {});
      } catch (error) {
        console.error('Failed to load plugin enabled states:', error);
      }
    };

    loadEnabledState();
  }, []);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLoadPlugins = async () => {
    try {
      setLoading(true);
      await loadPlugins();
    } catch (error) {
      console.error('Failed to load plugins:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInstall = async () => {
    if (isSelectingDirectory) return;

    try {
      setIsSelectingDirectory(true);
      const pluginPath = await window.ytdlp.selectDownloadDirectory();
      if (pluginPath) {
        const result = await window.plugins.install(pluginPath);

        if (result === true) {
          // First reload the plugins in the main process
          await window.plugins.reload();
          // Then update the UI list
          await handleLoadPlugins();
          toast({
            title: 'Success',
            description: 'Plugin was installed successfully',
            variant: 'success',
            duration: 3000,
          });
        } else if (
          typeof result === 'string' &&
          result === 'already-installed'
        ) {
          toast({
            title: 'Plugin Already Installed',
            description: 'This plugin is already installed',
            variant: 'default',
            duration: 3000,
          });
        } else {
          toast({
            title: 'Invalid Plugin Directory',
            description:
              'The selected directory does not contain a valid plugin structure',
            variant: 'destructive',
            duration: 3000,
          });
        }
      }
    } catch (error) {
      console.error('Failed to install plugin:', error);
      if (
        !error.message?.includes('Cannot read properties') &&
        !error.message?.includes('dialog:openDirectory')
      ) {
        toast({
          title: 'Installation Failed',
          description:
            error.message ||
            'An unexpected error occurred while installing the plugin',
          variant: 'destructive',
          duration: 3000,
        });
      }
    } finally {
      setIsSelectingDirectory(false);
    }
  };

  const handleUninstall = async (pluginId: string) => {
    setPluginToRemove(pluginId);
    setShowConfirmModal(true);
  };

  const confirmUninstall = async () => {
    if (!pluginToRemove) return;

    const plugin = plugins.find((p) => p.id === pluginToRemove);
    const pluginName = plugin ? plugin.name : 'this plugin';

    try {
      const success = await window.plugins.uninstall(pluginToRemove);
      if (success) {
        // First reload the plugins in the main process
        await window.plugins.reload();
        // Then update the UI list
        await handleLoadPlugins();
        toast({
          title: 'Plugin Removed',
          description: `${pluginName} has been successfully removed`,
          variant: 'success',
          duration: 3000,
        });
      } else {
        toast({
          title: 'Failed to Remove Plugin',
          description: `Could not remove ${pluginName}. Please try again.`,
          variant: 'destructive',
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('Failed to uninstall plugin:', error);
      toast({
        title: 'Error',
        description: `An error occurred while removing ${pluginName}`,
        variant: 'destructive',
        duration: 3000,
      });
    } finally {
      setShowConfirmModal(false);
      setPluginToRemove(null);
    }
  };

  const cancelUninstall = () => {
    setShowConfirmModal(false);
    setPluginToRemove(null);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleLoadUnzipped = async () => {
    try {
      const pluginDirPath = await window.ytdlp.selectDownloadDirectory();
      if (pluginDirPath) {
        const success = await window.plugins.loadUnzipped(pluginDirPath);
        if (success) {
          // First reload the plugins in the main process
          await window.plugins.reload();
          // Then update the UI list
          await handleLoadPlugins();
        }
      }
    } catch (error) {
      console.error('Failed to load unzipped plugin:', error);
    }
  };

  // enable and disable toggle functionality
  const handleToggle = async (pluginId: string) => {
    try {
      const newState = !enabledPlugins[pluginId];

      // Update UI state immediately for responsive UX
      setEnabledPlugins((prev) => ({
        ...prev,
        [pluginId]: newState,
      }));

      // Save the state persistently
      const success = await window.plugins.setPluginEnabled(pluginId, newState);

      if (success) {
        console.log(`Plugin ${pluginId} ${newState ? 'enabled' : 'disabled'}`);
      } else {
        // Revert UI state if the operation failed
        setEnabledPlugins((prev) => ({
          ...prev,
          [pluginId]: !newState,
        }));
        console.error(`Failed to update plugin state for ${pluginId}`);
      }
    } catch (error) {
      console.error(`Error toggling plugin ${pluginId}:`, error);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#FBFBFB] dark:bg-darkModeDropdown">
      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={cancelUninstall}
        onConfirm={confirmUninstall}
        message={`Are you sure you want to remove "${
          pluginToRemove
            ? plugins.find((p) => p.id === pluginToRemove)?.name ||
              'this plugin'
            : 'this plugin'
        }"? This action cannot be undone.`}
      />
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex justify-between items-center w-full">
            <Tabs defaultValue="installed" className="w-full">
              <TabsList className="flex justify-between items-center w-full">
                {/* <div className="bg-[#F4F4F4] dark:bg-darkModeCompliment rounded-md -ml-1 p-1"> */}
                <div className="-ml-2">
                  <TabsTrigger
                    value="installed"
                    className="text-xl cursor-default data-[state=inactive]:bg-transparent data-[state=active]:border-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none data-[state=active]:shadow-none"
                  >
                    Plugins
                  </TabsTrigger>

                  {/* TODO: Add back in when we have a way to install plugins */}
                  {/* <TabsTrigger
                    value="installed"
                    className="text-sm font-medium data-[state=active]:bg-white data-[state=active]:border data-[state=active]:border-divider dark:data-[state=active]:bg-darkMode dark:data-[state=active]:border-darkModeBorderColor dark:data-[state=active]:text-white"
                  >
                    Installed Plugins
                  </TabsTrigger>
                  <TabsTrigger
                    value="browse"
                    className="text-sm font-medium data-[state=active]:bg-white data-[state=active]:border data-[state=active]:border-divider dark:data-[state=active]:bg-darkMode dark:data-[state=active]:border-darkModeBorderColor dark:data-[state=active]:text-white"
                  >
                    Browse Plugins
                  </TabsTrigger> */}
                </div>

                {/* Search Bar with increased width */}
                <div ref={searchRef} className="relative">
                  <div className="flex items-center bg-[#FFFFFF] dark:bg-darkModeDropdown rounded-md border dark:border-2 border-[#D1D5DB] dark:border-darkModeCompliment px-2">
                    <FiSearch className="text-gray-500 dark:text-gray-400 h-4 w-4 mr-1" />
                    <input
                      type="text"
                      placeholder="Search"
                      className="py-1 px-2 bg-transparent focus:outline-none text-sm w-full"
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setShowResults(e.target.value.trim() !== '');
                      }}
                      onFocus={() => {
                        if (searchTerm.trim() !== '') {
                          setShowResults(true);
                        }
                      }}
                    />
                  </div>

                  {/* Search Results Dropdown */}
                  {showResults && searchResults.length > 0 && (
                    <div className="absolute top-full left-0 mt-1 w-full max-h-60 overflow-y-auto bg-white dark:bg-darkModeCompliment rounded-md shadow-lg z-10">
                      {searchResults.map((plugin) => (
                        <NavLink
                          key={plugin.id}
                          to="/plugins/details"
                          state={{ plugin }}
                          className="block px-3 py-2 hover:bg-gray-100 dark:hover:bg-darkModeHover cursor-pointer text-sm"
                          onClick={() => setShowResults(false)}
                        >
                          <div className="flex items-center">
                            <span className="inline-flex items-center justify-center w-5 h-5 mr-2 flex-shrink-0">
                              {renderIcon(plugin.icon)}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div
                                className="font-medium truncate"
                                title={plugin.name}
                              >
                                {plugin.name}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {getFirstParagraph(plugin.description)}
                              </div>
                            </div>
                          </div>
                        </NavLink>
                      ))}
                    </div>
                  )}

                  {/* No Results Message */}
                  {showResults &&
                    searchTerm.trim() !== '' &&
                    searchResults.length === 0 && (
                      <div className="absolute top-full left-0 mt-1 w-60 bg-white dark:bg-darkModeCompliment rounded-md shadow-lg z-10">
                        <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                          No plugins found
                        </div>
                      </div>
                    )}
                </div>
              </TabsList>
              <TabsContent value="installed" className="my-6">
                {loading ? (
                  <div>Loading plugins...</div>
                ) : plugins.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center text-gray-500 p-8 min-h-[60vh]">
                    <img
                      src={NoPlugin}
                      alt="No plugins available"
                      className="mx-auto"
                    />
                    <span className="mx-auto mt-8 dark:text-gray-200">
                      You haven't installed any plugins
                    </span>
                    <Button
                      variant="default"
                      onClick={handleInstall}
                      className="bg-[#F45513] dark:bg-[#F45513] dark:text-white dark:hover:text-black dark:hover:bg-white text-sm font-normal px-4 py-1 h-8 mt-4"
                      icon={<FaPlus />}
                    >
                      Add Plugin
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
                    {plugins.map((plugin) => (
                      <PluginCard
                        key={plugin.id}
                        plugin={plugin}
                        pluginType="installed"
                        onClickButton={() => handleUninstall(plugin.id)}
                        enabledPlugins={enabledPlugins}
                        onClickToggle={() => handleToggle(plugin.id)}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
              <TabsContent value="browse" className="my-6 w-full hidden">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
                  {browsePluginsLang.map((plugin) => (
                    <PluginCard
                      key={plugin.id}
                      plugin={plugin as unknown as PluginInfo}
                      pluginType="browse"
                    />
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PluginManager;
