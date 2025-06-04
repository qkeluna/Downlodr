# Downlodr Technical Documentation

## Development Environment

### Prerequisites

- **Node.js**: Version ^20.17.0
- **Yarn**: Version ^1.22.19
- **Operating System**: Windows, macOS, or Linux (primary development on Windows)

### Development Setup

1. Clone the repository
2. Run `yarn` to install dependencies
3. Run `yarn add github:Talisik/yt-dlp-helper` to install the yt-dlp package
4. Use `yarn start` to run the application in development mode

### Building & Packaging

- Use `yarn make` to create distributable packages
- Electron Forge handles packaging for different platforms
- Currently packaged primarily for Windows

## Technology Stack

### Core Technologies

- **Electron**: v33.3.1 - Cross-platform desktop application framework
- **Electron Forge**: v7.6.0 - Tool for building and publishing Electron applications
- **React**: v19.0.0 - UI component library
- **TypeScript**: v4.5.4 - Typed JavaScript
- **Vite**: v5.0.12 - Development server and build tool

### State Management

- **Zustand**: v5.0.3 - Lightweight state management library
  - Multiple stores for different concerns:
    - `mainStore`: UI and global application state
    - `downloadStore`: Download-related state and operations
    - `pluginStore`: Plugin management state
    - `playlistStore`: Playlist-related state

### UI Framework

- **TailwindCSS**: v3.4.17 - Utility-first CSS framework
- **Radix UI**: Component primitives for accessible UI elements
- **Lucide React**: Icon library
- **React Router DOM**: Navigation management

### Core Functionality

- **YTDLP Helper**: Custom wrapper around yt-dlp for video downloading
- **FFMPEG**: Media processing library used by yt-dlp
- **Axios**: HTTP client for web requests

## System Architecture

### Process Model

- **Main Process**: Node.js process that runs Electron
- **Renderer Process**: Chromium process that displays the UI
- **Preload Script**: Bridge between main and renderer processes

### IPC (Inter-Process Communication)

- Secure communication between main and renderer processes
- Context isolation to prevent direct access to Node.js APIs
- Exposed API through the preload script

### File System Integration

- Direct access to file system through the main process
- Secure handling of file operations
- Custom download destination management

### Plugin System

- Extensible architecture for adding new functionality
- Plugin manager for loading and managing plugins
- Registry of available plugins

## Code Organization

### Directory Structure

- `/src`: Main source code
  - `/main.ts`: Entry point for the Electron application
  - `/renderer.tsx`: Entry point for the React UI
  - `/preload.ts`: Preload script for IPC bridging
  - `/Components`: React components
  - `/Pages`: Main application pages/views
  - `/Store`: Zustand stores
  - `/Assets`: Static assets
  - `/DataFunctions`: Utility functions for data operations
  - `/Layout`: Layout components
  - `/plugins`: Plugin system

### Design Patterns

#### Electron IPC Pattern

- Main process exposes an API to the renderer process
- Preload script provides a secure bridge
- TypeScript interfaces ensure type safety

#### Store Pattern

- Zustand stores for state management
- Separate concerns with multiple stores
- Reactive updates with subscription model

#### Component Composition

- Reusable UI components
- Composition over inheritance
- Separation of concerns

## Key Technical Decisions

### 1. Electron with Vite

- **Rationale**: Fast development experience with hot module replacement
- **Trade-offs**: Adds complexity to the build process
- **Benefits**: Improved developer experience and build performance

### 2. Zustand for State Management

- **Rationale**: Lightweight alternative to Redux with simpler API
- **Trade-offs**: Less established than Redux, fewer middleware options
- **Benefits**: Reduced boilerplate, better performance, TypeScript integration

### 3. Custom YTDLP Integration

- **Rationale**: Need for deep integration with the downloading engine
- **Trade-offs**: Maintenance overhead for custom wrapper
- **Benefits**: Fine-grained control over download processes

### 4. Electron Forge for Packaging

- **Rationale**: Simplified packaging and distribution process
- **Trade-offs**: Less flexibility than manual configuration
- **Benefits**: Consistent build outputs across platforms

## Technical Constraints

### 1. Platform Limitations

- Some APIs are platform-specific, requiring conditional code
- macOS and Linux support require additional testing
- Native features may behave differently across platforms

### 2. Performance Considerations

- Download operations are CPU and network intensive
- UI must remain responsive during downloads
- Memory usage must be monitored, especially with many concurrent downloads

### 3. Security Concerns

- Downloaded content must be scanned/verified
- User permissions must be respected
- IPC calls must be validated

### 4. Distribution Challenges

- Application size (due to FFMPEG and other dependencies)
- Auto-update mechanisms
- Platform-specific packaging requirements

## Error Handling & Logging

### Error Strategy

- Graceful degradation when errors occur
- User-friendly error messages
- Detailed logging for debugging

### Logging Implementation

- Console logging in development
- Error reporting in production
- Crash reporting via Electron's crash reporter

## Testing Approach

### Manual Testing

- UI/UX testing on different platforms
- Download testing with various sources
- Edge case testing for error handling

### Automated Testing (Future)

- Unit tests for utility functions
- Integration tests for core functionality
- E2E tests for critical user flows

## Future Technical Roadmap

### Short-term Technical Goals

- Improved test coverage
- Enhanced plugin API
- Optimized download engine

### Long-term Technical Vision

- Cross-platform parity
- Advanced media processing features
- Cloud integration capabilities

## Architecture Overview

This Electron application uses a multi-process architecture with:

- **Main Process**: Node.js environment handling system APIs, yt-dlp integration, and IPC
- **Renderer Process**: Chromium-based UI using React, TypeScript, and Tailwind CSS
- **Preload Scripts**: Secure bridge between main and renderer processes

## yt-dlp_macos Integration ✅ WORKING

### Automated Binary Management

- **Script**: `scripts/fetch-yt-dlp.js` automatically downloads yt-dlp_macos binary (v2024.12.23)
- **Build Integration**: Pre-build scripts ensure binary is available before packaging
- **Cross-Platform Paths**: Smart path resolution for development vs production environments
- **Bundle Configuration**: Binary correctly included in `out/app/Contents/Resources/bin/`

### Runtime Configuration

- **Development Mode**: Binary loaded from `src/Assets/bin/yt-dlp_macos`
- **Production Mode**: Binary loaded from `process.resourcesPath/bin/yt-dlp_macos`
- **Permission Handling**: Executable permissions preserved during packaging
- **Error Handling**: Graceful fallback when binary is missing or not executable

### API Integration

```typescript
// Binary path configuration
let ytdlpBinaryPath: string;

// Video info retrieval
const { data, ok } = await YTDLP.invoke({
  ytdlpDownloadDestination: ytdlpBinaryPath,
  args: [url, "--no-warnings", "--dump-json"],
});

// Playlist info retrieval
const info = await YTDLP.getPlaylistInfo({
  url: videoUrl.url,
  ytdlpDownloadDestination: ytdlpBinaryPath,
});

// Video download
const controller = await YTDLP.download({
  ytdlpDownloadDestination: ytdlpBinaryPath,
  args: {
    /* download options */
  },
});
```

## Build System ✅ WORKING

### Successful Build Outputs

- **Package**: `npm run package` ✅ Creates working .app bundle
- **ZIP Distributable**: `npm run make` ✅ Creates `Downlodr-darwin-arm64-1.3.3.zip`
- **Binary Inclusion**: yt-dlp_macos correctly bundled and executable

### Code Signing Status

- **App Signing**: Uses "Apple Development: Magtangol Roque (XM7C9JRJ82)" ✅
- **PKG Installer**: Requires separate installer signing certificate ⚠️
- **ZIP Distribution**: Works without additional certificates ✅

### Build Pipeline

1. **Pre-build**: `scripts/fetch-yt-dlp.js` downloads/updates binary
2. **Packaging**: Electron Forge packages app with all resources
3. **Distribution**: Creates ZIP for easy distribution

## Development Workflow

### Setup

```bash
npm install
npm run prebuild  # Downloads yt-dlp_macos
npm start        # Development mode
```

### Building

```bash
npm run package  # Create .app bundle
npm run make     # Create distributables
```

### Binary Management

- Automatic download on first build
- Skip re-download if binary is less than 24 hours old
- Manual update: Delete `src/Assets/bin/yt-dlp_macos` and run `npm run prebuild`

## Key Technical Achievements

1. **✅ Automated yt-dlp Binary Management**: No manual binary handling required
2. **✅ Cross-Environment Compatibility**: Works in both development and production
3. **✅ Proper Resource Bundling**: Binary correctly included in app package
4. **✅ Working Package Creation**: Successfully creates distributable ZIP
5. **✅ Runtime Binary Access**: App can execute yt-dlp from correct location
6. **✅ Code Style Enforcement**: ESLint + Prettier configured and working

## Dependencies

### Core Framework

- Electron 33.3.1
- React 19.0.0
- TypeScript 4.5.4
- Vite 5.0.12

### yt-dlp Integration

- yt-dlp-helper (custom version)
- yt-dlp_macos v2024.12.23

### Build Tools

- @electron-forge/cli 7.6.0
- Tailwind CSS 3.4.17
- ESLint + Prettier for code quality
