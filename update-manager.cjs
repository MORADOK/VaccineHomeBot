const { app } = require('electron');
const log = require('electron-log');
const fs = require('fs');
const path = require('path');

class UpdateManager {
  constructor() {
    this.state = { updateAvailable:false, updateInfo:null, downloadProgress:null, updateDownloaded:false, error:null, lastCheckTime:null, pendingInstall:false };
    // Production default: check on startup and then once every 24 hours.
    // Download automatically and install when the app exits.
    this.preferences = { autoDownload:true, autoInstallOnAppQuit:true, checkOnStartup:true, checkInterval:24*60*60*1000 };
    this.logFilePath=path.join(app.getPath('userData'),'update-logs.json');
    this.preferencesPath=path.join(app.getPath('userData'),'update-preferences.json');
    this.loadPreferences(); this.initializeLogFile();
  }
  loadPreferences(){try{if(fs.existsSync(this.preferencesPath)){const saved=JSON.parse(fs.readFileSync(this.preferencesPath,'utf8'));this.preferences={...this.preferences,...saved};log.info('[UpdateManager] Loaded preferences:',this.preferences);}}catch(e){log.error('[UpdateManager] Failed to load preferences:',e);}}
  savePreferences(){try{fs.writeFileSync(this.preferencesPath,JSON.stringify(this.preferences,null,2),'utf8');return true;}catch(e){log.error('[UpdateManager] Failed to save preferences:',e);return false;}}
  setPreference(k,v){if(k in this.preferences){this.preferences[k]=v;this.savePreferences();return true;}return false;}
  getPreference(k){return this.preferences[k];} getAllPreferences(){return {...this.preferences};}
  initializeLogFile(){try{if(!fs.existsSync(this.logFilePath))fs.writeFileSync(this.logFilePath,'[]','utf8');}catch(e){log.error(e);}}
  addLogEntry(action,details,success=true,version=null){const entry={timestamp:new Date().toISOString(),action,version:version||app.getVersion(),details,success};try{let logs=fs.existsSync(this.logFilePath)?JSON.parse(fs.readFileSync(this.logFilePath,'utf8')):[];logs.push(entry);if(logs.length>100)logs=logs.slice(-100);fs.writeFileSync(this.logFilePath,JSON.stringify(logs,null,2),'utf8');}catch(e){log.error(e);}}
  getLogs(){try{return fs.existsSync(this.logFilePath)?JSON.parse(fs.readFileSync(this.logFilePath,'utf8')):[];}catch{return [];}}
  clearLogs(){try{fs.writeFileSync(this.logFilePath,'[]','utf8');return true;}catch{return false;}}
  setState(u){this.state={...this.state,...u};} getState(){return {...this.state};}
  onUpdateAvailable(info){this.setState({updateAvailable:true,updateInfo:{version:info.version,releaseDate:info.releaseDate,releaseNotes:info.releaseNotes||'No release notes available',files:info.files},lastCheckTime:new Date().toISOString()});this.addLogEntry('check',`Update available: ${info.version}`,true,info.version);}
  onUpdateNotAvailable(info){this.setState({updateAvailable:false,updateInfo:null,lastCheckTime:new Date().toISOString()});this.addLogEntry('check','No updates available',true,info.version);}
  onDownloadProgress(p){this.setState({downloadProgress:{percent:p.percent,bytesPerSecond:p.bytesPerSecond,transferred:p.transferred,total:p.total}});}
  onDownloadStarted(v){this.addLogEntry('download',`Started downloading version ${v}`,true,v);}
  onUpdateDownloaded(info){this.setState({updateDownloaded:true,downloadProgress:null,pendingInstall:true});this.addLogEntry('download',`Downloaded version ${info.version}`,true,info.version);}
  onUpdateInstalled(v){this.setState({updateDownloaded:false,pendingInstall:false});this.addLogEntry('install',`Installed version ${v}`,true,v);}
  onError(error,details=null){const msg=error.message||'Unknown error occurred';this.setState({error:msg,errorDetails:details||{type:'unknown',message:msg,canRetry:false,manualDownloadUrl:null}});this.addLogEntry('error',details?`${details.type}: ${details.message}`:msg,false);}
  clearError(){this.setState({error:null});}
  setInstallChoice(now){if(now){this.addLogEntry('install','User chose to install now',true);return 'install-now';}this.addLogEntry('install','User chose to install later',true);this.setState({pendingInstall:true});return 'install-later';}
  hasPendingInstall(){return this.state.pendingInstall;}
  reset(){this.state={updateAvailable:false,updateInfo:null,downloadProgress:null,updateDownloaded:false,error:null,lastCheckTime:null,pendingInstall:false};}
}
module.exports=new UpdateManager();
