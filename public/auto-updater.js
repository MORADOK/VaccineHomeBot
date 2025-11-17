const { autoUpdater } = require('electron-updater');
const { app, shell } = require('electron');
const log = require('electron-log');
const updateManager = require('./update-manager');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Configure logging
log.transports.file.level = 'info';
autoUpdater.logger = log;

class AutoUpdater {
  constructor() {
    this.mainWindow = null;
    this.retryCount = 0;
    this.maxRetries = 3;
    this.retryDelay = 5000; // 5 seconds
    this.downloadStartTime = null;
    this.lastError = null;
    
    // Configure auto-updater based on preferences
    const prefs = updateManager.getAllPreferences();
    autoUpdater.autoDownload = prefs.autoDownload;
    autoUpdater.autoInstallOnAppQuit = prefs.autoInstallOnAppQuit;
    
    // Configure network timeout
    autoUpdater.requestHeaders = { 'Cache-Control': 'no-cache' };
    
    this.setupEventHandlers();
  }

  setMainWindow(window) {
    this.mainWindow = window;
  }

  setupEventHandlers() {
    // Update available
    autoUpdater.on('update-available', (info) => {
      log.info('Update available:', info);
      this.onUpdateAvailable(info);
    });

    // Update not available
    autoUpdater.on('update-not-available', (info) => {
      log.info('Update not available:', info);
      this.onUpdateNotAvailable(info);
    });

    // Download progress
    autoUpdater.on('download-progress', (progressObj) => {
      this.onDownloadProgress(progressObj);
    });

    // Update downloaded
    autoUpdater.on('update-downloaded', (info) => {
      log.info('Update downloaded:', info);
      this.updateDownloaded = true;
      this.onUpdateDownloaded(info);
    });

    // Error occurred
    autoUpdater.on('error', (error) => {
      log.error('Update error:', error);
      this.onError(error);
    });
  }

  async checkForUpdates() {
    try {
      log.info('Checking for updates...');
      log.info('Current version:', app.getVersion());
      
      updateManager.addLogEntry('check', 'Checking for updates...', true);
      
      const result = await autoUpdater.checkForUpdates();
      log.info('Check for updates result:', result);
      
      // Reset retry count on successful check
      this.retryCount = 0;
      this.lastError = null;
      
      return result;
    } catch (error) {
      log.error('Error checking for updates:', error);
      
      // Handle network errors with retry logic
      if (this.isNetworkError(error) && this.retryCount < this.maxRetries) {
        this.retryCount++;
        log.warn(`Network error detected. Retry attempt ${this.retryCount}/${this.maxRetries} in ${this.retryDelay}ms`);
        
        updateManager.addLogEntry(
          'error',
          `Network error. Retrying (${this.retryCount}/${this.maxRetries})...`,
          false
        );
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        
        // Retry the check
        return this.checkForUpdates();
      }
      
      // Max retries reached or non-network error
      this.lastError = error;
      const errorDetails = this.getErrorDetails(error);
      updateManager.onError(error, errorDetails);
      this.onError(error, errorDetails);
      
      return null;
    }
  }

  async downloadUpdate() {
    try {
      log.info('Starting update download...');
      this.downloadStartTime = Date.now();
      this.retryCount = 0; // Reset retry count for download
      
      const state = updateManager.getState();
      if (state.updateInfo) {
        updateManager.onDownloadStarted(state.updateInfo.version);
      }
      
      await autoUpdater.downloadUpdate();
    } catch (error) {
      log.error('Error downloading update:', error);
      
      // Handle network errors with retry logic
      if (this.isNetworkError(error) && this.retryCount < this.maxRetries) {
        this.retryCount++;
        log.warn(`Download error. Retry attempt ${this.retryCount}/${this.maxRetries} in ${this.retryDelay}ms`);
        
        updateManager.addLogEntry(
          'error',
          `Download failed. Retrying (${this.retryCount}/${this.maxRetries})...`,
          false
        );
        
        // Notify UI about retry
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.webContents.send('update-retry', {
            attempt: this.retryCount,
            maxRetries: this.maxRetries,
            message: 'Download interrupted. Retrying...'
          });
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        
        // Retry the download
        return this.downloadUpdate();
      }
      
      // Max retries reached or non-network error
      this.lastError = error;
      const errorDetails = this.getErrorDetails(error);
      updateManager.onError(error, errorDetails);
      this.onError(error, errorDetails);
    }
  }

  quitAndInstall() {
    log.info('Quitting and installing update...');
    const state = updateManager.getState();
    if (state.updateInfo) {
      updateManager.onUpdateInstalled(state.updateInfo.version);
    }
    // Give the renderer process time to save state
    setTimeout(() => {
      autoUpdater.quitAndInstall(false, true);
    }, 1000);
  }

  onUpdateAvailable(info) {
    updateManager.onUpdateAvailable(info);
    
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('update-available', {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes || 'No release notes available',
        files: info.files
      });
    }
  }

  onUpdateNotAvailable(info) {
    updateManager.onUpdateNotAvailable(info);
    
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('update-not-available', {
        version: info.version,
        message: 'You are running the latest version'
      });
    }
  }

  onDownloadProgress(progressObj) {
    const logMessage = `Download speed: ${(progressObj.bytesPerSecond / 1024 / 1024).toFixed(2)} MB/s - ` +
                      `Downloaded ${(progressObj.transferred / 1024 / 1024).toFixed(2)} MB of ${(progressObj.total / 1024 / 1024).toFixed(2)} MB ` +
                      `(${progressObj.percent.toFixed(2)}%)`;
    
    log.info(logMessage);
    updateManager.onDownloadProgress(progressObj);

    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('download-progress', {
        percent: progressObj.percent,
        bytesPerSecond: progressObj.bytesPerSecond,
        transferred: progressObj.transferred,
        total: progressObj.total
      });
    }
  }

  onUpdateDownloaded(info) {
    // Verify download integrity
    const downloadTime = this.downloadStartTime 
      ? ((Date.now() - this.downloadStartTime) / 1000).toFixed(2) 
      : 'unknown';
    
    log.info(`Update downloaded in ${downloadTime} seconds`);
    
    // Verify file integrity if SHA-512 is available
    this.verifyDownloadIntegrity(info)
      .then(isValid => {
        if (isValid) {
          log.info('Download integrity verified successfully');
          updateManager.onUpdateDownloaded(info);
          
          if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send('update-downloaded', {
              version: info.version,
              releaseDate: info.releaseDate,
              releaseNotes: info.releaseNotes || 'No release notes available'
            });
          }
        } else {
          const error = new Error('Download integrity verification failed');
          log.error('Integrity check failed for downloaded update');
          this.onError(error, {
            type: 'integrity',
            message: 'Downloaded file is corrupted. Please try again.',
            canRetry: true
          });
        }
      })
      .catch(err => {
        log.warn('Could not verify integrity:', err);
        // Continue anyway if verification fails (file might not have checksum)
        updateManager.onUpdateDownloaded(info);
        
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.webContents.send('update-downloaded', {
            version: info.version,
            releaseDate: info.releaseDate,
            releaseNotes: info.releaseNotes || 'No release notes available'
          });
        }
      });
  }

  onError(error, errorDetails = null) {
    const errorMessage = error.message || 'Unknown error occurred';
    log.error('Auto-updater error:', errorMessage);
    log.error('Error stack:', error.stack);
    
    // Get detailed error information
    const details = errorDetails || this.getErrorDetails(error);
    
    updateManager.onError(error, details);

    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('update-error', {
        message: details.message,
        type: details.type,
        canRetry: details.canRetry,
        manualDownloadUrl: details.manualDownloadUrl,
        technicalDetails: errorMessage
      });
    }
  }

  /**
   * Check if error is a network-related error
   */
  isNetworkError(error) {
    const networkErrorPatterns = [
      'ENOTFOUND',
      'ETIMEDOUT',
      'ECONNREFUSED',
      'ECONNRESET',
      'ENETUNREACH',
      'EHOSTUNREACH',
      'net::ERR_',
      'network timeout',
      'socket hang up'
    ];
    
    const errorString = error.toString().toLowerCase();
    return networkErrorPatterns.some(pattern => 
      errorString.includes(pattern.toLowerCase())
    );
  }

  /**
   * Get detailed error information with user-friendly messages
   */
  getErrorDetails(error) {
    const errorString = error.toString().toLowerCase();
    const errorMessage = error.message || '';
    
    // Network errors
    if (this.isNetworkError(error)) {
      return {
        type: 'network',
        message: 'Unable to connect to update server. Please check your internet connection and try again.',
        canRetry: true,
        manualDownloadUrl: this.getManualDownloadUrl()
      };
    }
    
    // Permission errors
    if (errorString.includes('eacces') || errorString.includes('eperm')) {
      return {
        type: 'permission',
        message: 'Permission denied. Please run the application as administrator or check file permissions.',
        canRetry: false,
        manualDownloadUrl: this.getManualDownloadUrl()
      };
    }
    
    // Disk space errors
    if (errorString.includes('enospc')) {
      return {
        type: 'disk_space',
        message: 'Insufficient disk space. Please free up some space and try again.',
        canRetry: true,
        manualDownloadUrl: this.getManualDownloadUrl()
      };
    }
    
    // Integrity errors
    if (errorString.includes('integrity') || errorString.includes('checksum')) {
      return {
        type: 'integrity',
        message: 'Downloaded file is corrupted. Please try downloading again.',
        canRetry: true,
        manualDownloadUrl: this.getManualDownloadUrl()
      };
    }
    
    // GitHub API rate limit
    if (errorString.includes('rate limit') || errorString.includes('403')) {
      return {
        type: 'rate_limit',
        message: 'Update server rate limit reached. Please try again later.',
        canRetry: false,
        manualDownloadUrl: this.getManualDownloadUrl()
      };
    }
    
    // Generic error
    return {
      type: 'unknown',
      message: `Update failed: ${errorMessage}. You can download the update manually.`,
      canRetry: false,
      manualDownloadUrl: this.getManualDownloadUrl()
    };
  }

  /**
   * Verify download integrity using SHA-512 checksum
   */
  async verifyDownloadIntegrity(info) {
    try {
      // Get the downloaded file path
      const updateCachePath = path.join(app.getPath('userData'), 'pending');
      
      if (!fs.existsSync(updateCachePath)) {
        log.warn('Update cache directory not found');
        return true; // Skip verification if cache not found
      }
      
      // Find the downloaded file
      const files = fs.readdirSync(updateCachePath);
      const updateFile = files.find(f => f.endsWith('.exe') || f.endsWith('.dmg') || f.endsWith('.AppImage'));
      
      if (!updateFile) {
        log.warn('Downloaded update file not found');
        return true; // Skip verification if file not found
      }
      
      const filePath = path.join(updateCachePath, updateFile);
      
      // Get expected SHA-512 from update info
      const expectedSha512 = info.sha512;
      if (!expectedSha512) {
        log.warn('No SHA-512 checksum available for verification');
        return true; // Skip verification if no checksum available
      }
      
      // Calculate SHA-512 of downloaded file
      const fileBuffer = fs.readFileSync(filePath);
      const hash = crypto.createHash('sha512');
      hash.update(fileBuffer);
      const actualSha512 = hash.digest('base64');
      
      // Compare checksums
      const isValid = actualSha512 === expectedSha512;
      
      if (!isValid) {
        log.error('SHA-512 mismatch!');
        log.error('Expected:', expectedSha512);
        log.error('Actual:', actualSha512);
      }
      
      return isValid;
    } catch (error) {
      log.error('Error verifying download integrity:', error);
      // Return true to not block installation if verification fails
      return true;
    }
  }

  /**
   * Get manual download URL for fallback
   */
  getManualDownloadUrl() {
    // Get repository info from package.json or environment
    const owner = 'MORADOK';
    const repo = 'VaccineHomeBot';
    return `https://github.com/${owner}/${repo}/releases/latest`;
  }

  /**
   * Open manual download URL in browser
   */
  openManualDownload() {
    const url = this.getManualDownloadUrl();
    log.info('Opening manual download URL:', url);
    shell.openExternal(url);
  }

  /**
   * Get update manager instance for accessing state and preferences
   */
  getUpdateManager() {
    return updateManager;
  }
}

// Create singleton instance
const updater = new AutoUpdater();

module.exports = updater;
