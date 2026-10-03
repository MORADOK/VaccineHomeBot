const { autoUpdater } = require('electron-updater');
const { app, shell } = require('electron');
const log = require('electron-log');
const updateManager = require('./update-manager');

log.transports.file.level = 'info';
autoUpdater.logger = log;

class AutoUpdater {
  constructor() {
    this.mainWindow = null;
    this.retryCount = 0;
    this.maxRetries = 3;
    this.retryDelay = 5000;
    this.downloadInProgress = false;
    const prefs = updateManager.getAllPreferences();
    autoUpdater.autoDownload = prefs.autoDownload;
    autoUpdater.autoInstallOnAppQuit = prefs.autoInstallOnAppQuit;
    autoUpdater.requestHeaders = { 'Cache-Control': 'no-cache' };
    this.setupEventHandlers();
  }
  setMainWindow(window) { this.mainWindow = window; }
  setupEventHandlers() {
    autoUpdater.on('update-available', info => {
      log.info('Update available:', info.version);
      updateManager.onUpdateAvailable(info);
      this.send('update-available', {version:info.version,releaseDate:info.releaseDate,releaseNotes:info.releaseNotes||'No release notes available',files:info.files});
      if (updateManager.getPreference('autoDownload') && !this.downloadInProgress) void this.downloadUpdate();
    });
    autoUpdater.on('update-not-available', info => {
      updateManager.onUpdateNotAvailable(info);
      this.send('update-not-available',{version:info.version,message:'You are running the latest version'});
    });
    autoUpdater.on('download-progress', p => {
      updateManager.onDownloadProgress(p);
      this.send('download-progress',{percent:p.percent,bytesPerSecond:p.bytesPerSecond,transferred:p.transferred,total:p.total});
    });
    autoUpdater.on('update-downloaded', info => {
      this.downloadInProgress=false;
      updateManager.onUpdateDownloaded(info);
      this.send('update-downloaded',{version:info.version,releaseDate:info.releaseDate,releaseNotes:info.releaseNotes||'No release notes available'});
      log.info('Update ready; it will install automatically when the app exits.');
    });
    autoUpdater.on('error', error => { this.downloadInProgress=false; this.onError(error); });
  }
  send(channel,payload){if(this.mainWindow&&!this.mainWindow.isDestroyed())this.mainWindow.webContents.send(channel,payload);}
  isNetworkError(error){return ['ENOTFOUND','ETIMEDOUT','ECONNREFUSED','ECONNRESET','ENETUNREACH','EHOSTUNREACH','net::ERR_','network timeout','socket hang up'].some(x=>String(error).toLowerCase().includes(x.toLowerCase()));}
  async checkForUpdates(){
    try { log.info('Checking for updates. Current:',app.getVersion()); updateManager.addLogEntry('check','Checking for updates...',true); const r=await autoUpdater.checkForUpdates(); this.retryCount=0; return r; }
    catch(error){ if(this.isNetworkError(error)&&this.retryCount<this.maxRetries){this.retryCount++;await new Promise(r=>setTimeout(r,this.retryDelay));return this.checkForUpdates();} this.onError(error); return null; }
  }
  async downloadUpdate(){
    if(this.downloadInProgress)return;
    this.downloadInProgress=true;
    try { const s=updateManager.getState(); if(s.updateInfo)updateManager.onDownloadStarted(s.updateInfo.version); await autoUpdater.downloadUpdate(); this.retryCount=0; }
    catch(error){this.downloadInProgress=false;if(this.isNetworkError(error)&&this.retryCount<this.maxRetries){this.retryCount++;await new Promise(r=>setTimeout(r,this.retryDelay));return this.downloadUpdate();}this.onError(error);}
  }
  quitAndInstall(){setTimeout(()=>autoUpdater.quitAndInstall(false,true),500);}
  onError(error){const details=this.getErrorDetails(error);updateManager.onError(error,details);this.send('update-error',{...details,technicalDetails:error.message||String(error)});log.error('Auto updater:',error);}
  getErrorDetails(error){if(this.isNetworkError(error))return{type:'network',message:'Unable to connect to update server. Please check your internet connection.',canRetry:true,manualDownloadUrl:this.getManualDownloadUrl()};return{type:'unknown',message:`Update failed: ${error.message||error}`,canRetry:false,manualDownloadUrl:this.getManualDownloadUrl()};}
  getManualDownloadUrl(){return 'https://github.com/MORADOK/VaccineHomeBot/releases/latest';}
  openManualDownload(){shell.openExternal(this.getManualDownloadUrl());}
  getUpdateManager(){return updateManager;}
}
module.exports=new AutoUpdater();
