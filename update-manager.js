const { app } = require('electron');
const log = require('electron-log');
const fs = require('fs');
const path = require('path');

/**
 * UpdateManager - Manages update state, user preferences, and logging
 */
class UpdateManager {
  constructor() {
    this.state = {
      updateAvailable: false,
      updateInfo: null,
      downloadProgress: null,
      updateDownloaded: false,
      error: null,
      lastCheckTime: null,
      pendingInstall: false
    };

    this.preferences = {
      autoDownload: false,
      autoInstallOnAppQuit: true,
      checkOnStartup: true,
      checkInterval: 4 * 60 * 60 * 1000 // 4 hours
    };

    this.logFilePath = path.join(app.getPath('userData'), 'update-logs.json');
    this.preferencesPath = path.join(app.getPath('userData'), 'update-preferences.json');
    
    this.loadPreferences();
    this.initializeLogFile();
  }

  /**
   * Load user preferences from disk
   */
  loadPreferences() {
    try {
      if (fs.existsSync(this.preferencesPath)) {
        const data = fs.readFileSync(this.preferencesPath, 'utf8');
        const savedPrefs = JSON.parse(data);
        this.preferences = { ...this.preferences, ...savedPrefs };
        log.info('[UpdateManager] Loaded preferences:', this.preferences);
      }
    } catch (error) {
      log.error('[UpdateManager] Failed to load preferences:', error);
    }
  }

  /**
   * Save user preferences to disk
   */
  savePreferences() {
    try {
      fs.writeFileSync(
        this.preferencesPath,
        JSON.stringify(this.preferences, null, 2),
        'utf8'
      );
      log.info('[UpdateManager] Saved preferences');
    } catch (error) {
      log.error('[UpdateManager] Failed to save preferences:', error);
    }
  }

  /**
   * Update a preference value
   */
  setPreference(key, value) {
    if (key in this.preferences) {
      this.preferences[key] = value;
      this.savePreferences();
      log.info(`[UpdateManager] Updated preference ${key}:`, value);
      return true;
    }
    return false;
  }

  /**
   * Get a preference value
   */
  getPreference(key) {
    return this.preferences[key];
  }

  /**
   * Get all preferences
   */
  getAllPreferences() {
    return { ...this.preferences };
  }

  /**
   * Initialize log file
   */
  initializeLogFile() {
    try {
      if (!fs.existsSync(this.logFilePath)) {
        fs.writeFileSync(this.logFilePath, JSON.stringify([], null, 2), 'utf8');
        log.info('[UpdateManager] Initialized log file');
      }
    } catch (error) {
      log.error('[UpdateManager] Failed to initialize log file:', error);
    }
  }

  /**
   * Add a log entry
   */
  addLogEntry(action, details, success = true, version = null) {
    const entry = {
      timestamp: new Date().toISOString(),
      action,
      version: version || app.getVersion(),
      details,
      success
    };

    try {
      let logs = [];
      if (fs.existsSync(this.logFilePath)) {
        const data = fs.readFileSync(this.logFilePath, 'utf8');
        logs = JSON.parse(data);
      }

      logs.push(entry);

      // Keep only last 100 entries
      if (logs.length > 100) {
        logs = logs.slice(-100);
      }

      fs.writeFileSync(this.logFilePath, JSON.stringify(logs, null, 2), 'utf8');
      log.info('[UpdateManager] Added log entry:', entry);
    } catch (error) {
      log.error('[UpdateManager] Failed to add log entry:', error);
    }
  }

  /**
   * Get all log entries
   */
  getLogs() {
    try {
      if (fs.existsSync(this.logFilePath)) {
        const data = fs.readFileSync(this.logFilePath, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      log.error('[UpdateManager] Failed to read logs:', error);
    }
    return [];
  }

  /**
   * Clear all logs
   */
  clearLogs() {
    try {
      fs.writeFileSync(this.logFilePath, JSON.stringify([], null, 2), 'utf8');
      log.info('[UpdateManager] Cleared all logs');
      return true;
    } catch (error) {
      log.error('[UpdateManager] Failed to clear logs:', error);
      return false;
    }
  }

  /**
   * Update state
   */
  setState(updates) {
    this.state = { ...this.state, ...updates };
    log.info('[UpdateManager] State updated:', updates);
  }

  /**
   * Get current state
   */
  getState() {
    return { ...this.state };
  }

  /**
   * Handle update available
   */
  onUpdateAvailable(info) {
    this.setState({
      updateAvailable: true,
      updateInfo: {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes || 'No release notes available',
        files: info.files
      },
      lastCheckTime: new Date().toISOString()
    });

    this.addLogEntry(
      'check',
      `Update available: ${info.version}`,
      true,
      info.version
    );
  }

  /**
   * Handle update not available
   */
  onUpdateNotAvailable(info) {
    this.setState({
      updateAvailable: false,
      updateInfo: null,
      lastCheckTime: new Date().toISOString()
    });

    this.addLogEntry(
      'check',
      'No updates available',
      true,
      info.version
    );
  }

  /**
   * Handle download progress
   */
  onDownloadProgress(progressObj) {
    this.setState({
      downloadProgress: {
        percent: progressObj.percent,
        bytesPerSecond: progressObj.bytesPerSecond,
        transferred: progressObj.transferred,
        total: progressObj.total
      }
    });
  }

  /**
   * Handle download started
   */
  onDownloadStarted(version) {
    this.addLogEntry(
      'download',
      `Started downloading version ${version}`,
      true,
      version
    );
  }

  /**
   * Handle update downloaded
   */
  onUpdateDownloaded(info) {
    this.setState({
      updateDownloaded: true,
      downloadProgress: null,
      pendingInstall: true
    });

    this.addLogEntry(
      'download',
      `Downloaded version ${info.version}`,
      true,
      info.version
    );
  }

  /**
   * Handle update installed
   */
  onUpdateInstalled(version) {
    this.setState({
      updateDownloaded: false,
      pendingInstall: false
    });

    this.addLogEntry(
      'install',
      `Installed version ${version}`,
      true,
      version
    );
  }

  /**
   * Handle error
   */
  onError(error, errorDetails = null) {
    const errorMessage = error.message || 'Unknown error occurred';
    
    this.setState({
      error: errorMessage,
      errorDetails: errorDetails || {
        type: 'unknown',
        message: errorMessage,
        canRetry: false,
        manualDownloadUrl: null
      }
    });

    // Log with detailed information
    const logDetails = errorDetails 
      ? `${errorDetails.type}: ${errorDetails.message}` 
      : errorMessage;
    
    this.addLogEntry(
      'error',
      logDetails,
      false
    );
  }

  /**
   * Clear error state
   */
  clearError() {
    this.setState({ error: null });
  }

  /**
   * Set user choice for install timing
   */
  setInstallChoice(installNow) {
    if (installNow) {
      this.addLogEntry('install', 'User chose to install now', true);
      return 'install-now';
    } else {
      this.addLogEntry('install', 'User chose to install later', true);
      this.setState({ pendingInstall: true });
      return 'install-later';
    }
  }

  /**
   * Check if there's a pending install
   */
  hasPendingInstall() {
    return this.state.pendingInstall;
  }

  /**
   * Reset state (useful for testing)
   */
  reset() {
    this.state = {
      updateAvailable: false,
      updateInfo: null,
      downloadProgress: null,
      updateDownloaded: false,
      error: null,
      lastCheckTime: null,
      pendingInstall: false
    };
    log.info('[UpdateManager] State reset');
  }
}

// Create singleton instance
const updateManager = new UpdateManager();

module.exports = updateManager;
