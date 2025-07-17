/**
 *  A custom React component
 * Component for the table headers, holds table name and resizable border which will resize length of header column
 *
 * @param ResizableHeaderProps
 *   @param children - content of each header column (usually header name as a string)
 *   @param width - a number that specifies the width of the header column in pixels. It is used to set the inline style of the <th> element to control its width.
 *   @param onResizeStart - a function that takes a React.MouseEvent as an argument. It is called when the user starts resizing the header column. This function typically contains the logic to handle the resizing action.
 *   @param index - optional index of the column
 *   @param onDragStart - optional function to start dragging the column
 *   @param onDragOver - optional function to handle drag over another column
 *   @param onDrop - optional function to handle drop to reorder columns
 *   @param isDragging - optional boolean indicating if the column is being dragged
 *   @param isDragOver - optional boolean indicating if the column is being dragged over
 *   @param columnId - optional ID of the column
 *   @param className - optional class name to add to the component
 *   @param isLastColumn - optional boolean indicating if this is the last column
 *   @param onDragEnd - optional function to handle drag end
 *
 * @returns JSX.Element - The rendered component displaying a TitleBar
 *
 */
import React, { useState } from 'react';

interface ResizableHeaderProps {
  children: React.ReactNode;
  width: number;
  onResizeStart: (e: React.MouseEvent) => void;
  index?: number;
  onDragStart?: (columnId: string, index: number) => void;
  onDragOver?: (index: number) => void;
  onDrop?: () => void;
  isDragging?: boolean;
  isDragOver?: boolean;
  columnId?: string;
  className?: string;
  isLastColumn?: boolean;
  onDragEnd?: () => void;
}

const ResizableHeader: React.FC<ResizableHeaderProps> = ({
  children,
  width,
  onResizeStart,
  index,
  onDragStart,
  onDragOver,
  onDrop,
  isDragging,
  isDragOver,
  columnId,
  className = '',
  isLastColumn = false,
  onDragEnd,
}) => {
  const [isResizeHovered, setIsResizeHovered] = useState(false);

  return (
    <th
      className={`relative pl-2 dark:text-gray-200 select-none${
        isDragging ? 'opacity-50 bg-blue-100 dark:bg-blue-900' : ''
      } ${isDragOver ? 'border-l-2 border-blue-500' : ''} ${className}`}
      style={{ width: `${width}px`, minWidth: `${width}px` }}
      onDragOver={(e) => {
        if (index !== undefined && onDragOver) {
          e.preventDefault();
          onDragOver(index);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop && onDrop();
      }}
      onDragLeave={(e) => {
        // Reset drag over state when drag leaves this header
        e.preventDefault();
      }}
      data-column-id={columnId}
    >
      {/* Main header content - draggable */}
      <div
        className="flex items-center w-full cursor-grab active:cursor-grabbing p-1 whitespace-nowrap overflow-hidden"
        draggable={onDragStart ? true : false}
        onDragStart={() =>
          index !== undefined &&
          columnId !== undefined &&
          onDragStart &&
          onDragStart(columnId, index)
        }
        onDragEnd={() => {
          // Ensure drag state is reset when drag ends
          onDragEnd && onDragEnd();
        }}
        onMouseLeave={() => {
          // Additional cleanup when mouse leaves draggable area
          if (isDragging) {
            onDragEnd && onDragEnd();
          }
        }}
      >
        {children}
      </div>

      {/* Resize handle - not draggable, only show if not the last column */}
      {!isLastColumn && (
        <div
          className={`absolute right-0 top-0 h-full w-4 hover:bg-blue-500/20 group -mr-3 ${
            isResizeHovered ? 'cursor-col-resize' : 'cursor-default'
          }`}
          onMouseDown={(e) => {
            // Prevent drag start when trying to resize
            e.stopPropagation();
            onResizeStart(e);
          }}
          onMouseEnter={() => setIsResizeHovered(true)}
          onMouseLeave={() => {
            setIsResizeHovered(false);
            // Force cursor reset when leaving resize handle
            document.body.style.cursor = '';
          }}
          draggable={false}
        >
          <div className="absolute right-[9px] mt-1 h-4/5 w-[2px] bg-resizeColumn dark:bg-darkModeBorderColor group-hover:bg-[#c2c2c2] justify-center" />
        </div>
      )}
    </th>
  );
};

export default ResizableHeader;
