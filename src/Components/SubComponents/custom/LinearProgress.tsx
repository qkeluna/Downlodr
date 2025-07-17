/**
 * A custom React component
 * A React component that displays an animated linear progress bar.
 * It visually represents progress with customizable colors and status indicators.
 *
 * @param AnimatedLinearProgressBarProps
 *   @param status - The current status of the progress (e.g., 'paused', 'to download').
 *   @param max - The maximum value for the progress.
 *   @param value - The current value of the progress.
 *   @param min - The minimum value for the progress.
 *   @param gaugePrimaryColor - The primary color of the progress gauge.
 *   @param gaugeSecondaryColor - The secondary color of the progress gauge.
 *   @param className - Optional additional CSS classes for styling.
 *
 * @returns JSX.Element - The rendered animated linear progress bar component.
 */

import { FaPlay } from 'react-icons/fa';
import { MdPause } from 'react-icons/md';
import { cn } from '../shadcn/lib/utils';

interface AnimatedLinearProgressBarProps {
  status: string; // Current status of the progress
  max: number; // Maximum value for the progress
  value: number; // Current value of the progress
  min: number; // Minimum value for the progress
  width: number; // Width of the progress bar
  minWidth: number; // Minimum width of the progress bar
  gaugePrimaryColor: string; // Primary color of the progress gauge
  gaugeSecondaryColor: string; // Secondary color of the progress gauge
  className?: string; // Optional additional CSS classes
}

export function AnimatedLinearProgressBar({
  status,
  max = 200,
  min = 0,
  width = 100,
  minWidth = 30,
  value = 0,
  gaugePrimaryColor,
  gaugeSecondaryColor,
  className,
}: AnimatedLinearProgressBarProps) {
  const currentPercent = Math.round(((value - min) / (max - min)) * 100);

  // Ensure we have valid colors
  const backgroundTrackColor = gaugeSecondaryColor || '#e5e7eb';
  const fillBarColor = gaugePrimaryColor || '#3b82f6';

  return (
    <div className={cn('flex items-center w-full', className)}>
      {/* Status Icon */}
      <div className="flex-shrink-0 mr-1">
        {status === 'paused' ? (
          <MdPause size={12} className="text-gray-500 dark:text-gray-500" />
        ) : status === 'to download' ? (
          <FaPlay size={10} className="text-gray-500 dark:text-gray-500" />
        ) : null}
      </div>

      {/* Progress Bar Container - Takes available width */}
      <div className="flex-1 min-w-0 mr-1">
        {/* Background Track - Fits within available space */}
        <div
          className="w-full h-3 rounded-full relative"
          style={{
            backgroundColor: backgroundTrackColor,
            border: '1px solid green',
            minWidth: `${width - 50}px`,
          }}
        >
          {/* Progress Fill Bar - Grows from 0% to 100% */}
          <div
            className="h-full rounded-full transition-all duration-1000 ease-out"
            style={{
              width: `${Math.max(0, Math.min(100, currentPercent))}%`,
              backgroundColor: fillBarColor,
              minWidth: currentPercent > 0 ? '3px' : '0px',
            }}
          />
        </div>
      </div>

      {/* Percentage Display - Compact */}
      <div className="flex-shrink-0 min-w-[0.7rem]">
        <span className="text-xs font-medium text-gray-700 dark:text-gray-300 text-right">
          {currentPercent}%
        </span>
      </div>
    </div>
  );
}
