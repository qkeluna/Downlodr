# Downlodr - System Architecture Documentation

## Overview

Downlodr is a cross-platform desktop video downloading application built with Electron, React, and TypeScript. The application provides a comprehensive solution for downloading videos from over 1,800 platforms using yt-dlp as the core download engine, with a modern React-based user interface.

## System Architecture

### 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Downlodr Application                     │
├─────────────────────────────────────────────────────────────┤
│  Frontend (Renderer Process)    │  Backend (Main Process)   │
│  ├─ React UI Components         │  ├─ Electron Main         │
│  ├─ Zustand State Management    │  ├─ IPC Handlers          │
│  ├─ React Router Navigation     │  ├─ File System Ops       │
│  └─ TailwindCSS Styling         │  └─ yt-dlp Integration    │
├─────────────────────────────────┼─────────────────────────────┤
│         Preload Process         │     External Dependencies  │
│  ├─ IPC Bridge                  │  ├─ yt-dlp (Download Engine)│
│  └─ Security Context            │  ├─ FFmpeg (Media Processing)│
└─────────────────────────────────┴─────────────────────────────┘
```

### 2. Process Architecture

#### Main Process (Node.js)
- **Location**: `src/main.ts`
- **Responsibilities**:
  - Application lifecycle management
  - Window creation and management
  - System tray integration
  - IPC communication handlers
  - File system operations
  - yt-dlp process management
  - Download orchestration

#### Renderer Process (React)
- **Location**: `src/App.tsx`, `src/Layout/MainLayout.tsx`
- **Responsibilities**:
  - User interface rendering
  - User interaction handling
  - State management via Zustand
  - Download progress visualization
  - Settings management

#### Preload Process
- **Location**: `src/preload.ts`
- **Responsibilities**:
  - Secure IPC bridge between main and renderer
  - API exposure to renderer process
  - Context isolation enforcement

## Component Architecture

### 1. Frontend Components Structure

```
src/Components/
├── Main/
│   ├── Modal/                 # Dialog components
│   └── Shared/               # Shared UI components
│       ├── DropdownBar       # Main navigation dropdown
│       ├── Navigation        # Sidebar navigation
│       ├── TaskBar          # Action toolbar
│       └── TitleBar         # Custom window title bar
├── SubComponents/
│   ├── custom/              # Custom components
│   │   └── ResizableColumns/ # Table column management
│   └── shadcn/              # UI component library
│       ├── components/ui/    # Radix UI components
│       ├── hooks/           # UI hooks
│       └── lib/             # UI utilities
└── ThemeProvider.tsx        # Theme management
```

### 2. Page Architecture

```
src/Pages/
├── StatusSpecificDownload.tsx  # Main download management page
├── History.tsx                # Download history view
└── SubPages/
    ├── CategoryPage.tsx       # Category-filtered downloads
    ├── TagsPage.tsx          # Tag-filtered downloads
    └── NotFound.tsx          # 404 error page
```

### 3. State Management Architecture

```
src/Store/
├── downloadStore.tsx      # Download state management
├── mainStore.tsx         # Application settings
└── playlistStore.tsx     # Playlist-specific state
```

#### Download Store Structure
- **ForDownload**: Queued downloads awaiting processing
- **Downloading**: Active downloads with progress tracking
- **FinishedDownloads**: Successfully completed downloads
- **HistoryDownloads**: Historical download records
- **Tags & Categories**: Organizational metadata

### 4. Data Functions

```
src/DataFunctions/
├── GetDownloadMetaData.ts    # Video format processing
├── captionsHelper.ts         # Subtitle management
├── updateChecker.ts          # Application updates
├── EmbedVideo.tsx           # Video preview component
└── FilterName.ts            # File name sanitization
```

## Technology Stack

### Core Technologies
- **Electron**: v33.3.1 - Cross-platform desktop framework
- **React**: v19.0.0 - Frontend UI library
- **TypeScript**: v4.5.4 - Type-safe JavaScript
- **Vite**: v5.0.12 - Build tool and development server

### State Management
- **Zustand**: v5.0.3 - Lightweight state management
- **Zustand Persistence**: Local storage persistence

### UI Framework
- **TailwindCSS**: v3.4.17 - Utility-first CSS framework
- **Radix UI**: Component primitives for accessibility
- **Lucide React**: Icon library
- **React Icons**: Additional icon library

### Development Tools
- **Electron Forge**: v7.6.0 - Build and packaging
- **ESLint**: Code linting and formatting
- **Prettier**: Code formatting

### External Dependencies
- **yt-dlp-helper**: Video download engine wrapper
- **FFMPEG**: Media processing (bundled)

## Communication Patterns

### 1. IPC (Inter-Process Communication)

#### Main → Renderer
```typescript
// Update notifications
win.webContents.send('update-available', updateInfo);
win.webContents.send('download-finished', downloadData);
win.webContents.send(`ytdlp:download:status:${id}`, chunk);
```

#### Renderer → Main
```typescript
// Download operations
window.downlodrFunctions.startDownload(args);
window.downlodrFunctions.stopDownload(id);
window.downlodrFunctions.getVideoInfo(url);

// File operations
window.downlodrFunctions.selectDirectory();
window.downlodrFunctions.openFolder(path);
```

### 2. State Flow

```
User Action → Component Event → Store Update → UI Re-render
     ↓
IPC Call → Main Process → yt-dlp → Progress Update → Store Update
```

## Security Architecture

### Context Isolation
- **Enabled**: Prevents renderer access to Node.js APIs
- **Preload Script**: Controlled API exposure
- **Web Security**: Enabled for production builds

### Fuses Configuration
- **RunAsNode**: Disabled
- **EnableCookieEncryption**: Enabled
- **EnableNodeOptionsEnvironmentVariable**: Disabled
- **EnableNodeCliInspectArguments**: Disabled
- **EnableEmbeddedAsarIntegrityValidation**: Enabled
- **OnlyLoadAppFromAsar**: Enabled (production)

## Build and Packaging

### Development
```bash
yarn start              # Start development server
```

### Production Build
```bash
yarn make              # Build and package for distribution
```

### Platform Support
- **Windows**: NSIS installer (.exe)
- **macOS**: PKG installer (.pkg)
- **Linux**: AppImage, DEB, RPM packages
- **Cross-platform**: ZIP archives

### Asset Management
- **Icons**: Multi-resolution application icons
- **System Tray**: Platform-specific tray icons
- **Resources**: Bundled with application

## File System Organization

### Application Structure
```
Downlodr/
├── src/                    # Source code
│   ├── Assets/            # Static assets
│   ├── Components/        # React components
│   ├── DataFunctions/     # Business logic
│   ├── Layout/           # Layout components
│   ├── Pages/            # Page components
│   ├── Store/            # State management
│   └── docs/             # Documentation
├── .vite/                 # Build output
├── out/                   # Distribution packages
└── node_modules/          # Dependencies
```

### Runtime Data
- **Downloads**: User-specified directories
- **Thumbnails**: Temporary cache directory
- **Captions**: Alongside video files
- **Application Data**: Platform-specific app data

## Performance Considerations

### Memory Management
- **Process Isolation**: Separate main and renderer processes
- **Stream Processing**: Large file downloads via streams
- **Garbage Collection**: Automatic cleanup of completed downloads

### Optimization Strategies
- **Lazy Loading**: Components loaded on demand
- **Virtual Scrolling**: Large download lists
- **Debounced Updates**: Progress updates throttled
- **Caching**: Video metadata and thumbnails

## Error Handling

### Application Level
- **Error Boundaries**: React component error isolation
- **Try-Catch**: Async operation error handling
- **IPC Error Propagation**: Main process errors to renderer

### Download Level
- **Retry Logic**: Failed download retry mechanisms
- **Graceful Degradation**: Fallback format selection
- **User Notification**: Toast messages for errors

## Security Considerations

### Input Validation
- **URL Sanitization**: Validate video URLs
- **Path Validation**: Secure file path handling
- **File Name Sanitization**: Prevent path traversal

### Process Security
- **Sandboxing**: Renderer process isolation
- **Privilege Separation**: Minimal main process privileges
- **Update Security**: Signed update verification

## Monitoring and Logging

### Development
- **Console Logging**: Debug information
- **DevTools**: Electron development tools
- **Hot Reload**: Vite development server

### Production
- **Error Logging**: Application error tracking
- **Performance Metrics**: Download statistics
- **Update Monitoring**: Version check mechanisms

## Deployment Architecture

### Distribution Channels
- **Direct Download**: Official website
- **Auto-Updates**: Built-in update mechanism
- **Package Managers**: Platform-specific stores

### Update Strategy
- **Automatic Checks**: Periodic update checking
- **Background Downloads**: Non-intrusive updates
- **User Confirmation**: Optional automatic installation
