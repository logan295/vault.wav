/* eslint-disable @typescript-eslint/no-require-imports -- Electron uses a CommonJS main-process entry point. */
const { app, BrowserWindow, Menu, dialog, shell, ipcMain, session } = require('electron');
const { spawn } = require('node:child_process');
const { join } = require('node:path');
const { existsSync, mkdirSync, copyFileSync, cpSync, appendFileSync } = require('node:fs');
const http = require('node:http');
const children = [];
let mainWindow;
let root;
let serverRoot;
let stopAudio = () => {};
const origin = 'http://127.0.0.1:3147';
function request(url) { return new Promise(resolve => { const req = http.get(url, res => { let data = ''; res.on('data', chunk => data += chunk); res.on('end', () => resolve(res.statusCode === 200 && data.includes('"app":".womp"'))); }); req.setTimeout(1000, () => { req.destroy(); resolve(false); }); req.on('error', () => resolve(false)); }); }
function fork(file, args = [], env = {}) {
  const log = join(app.getPath('logs'), 'runtime.log'); mkdirSync(app.getPath('logs'), {recursive:true});
  const child = spawn(process.execPath, [file, ...args], { cwd:serverRoot, env:{...process.env, ELECTRON_RUN_AS_NODE:'1', PATH:`/opt/homebrew/bin:/usr/local/bin:${process.env.PATH || ''}`, ...env}, stdio:['ignore','pipe','pipe'] });
  for (const stream of [child.stdout,child.stderr]) stream.on('data', data => appendFileSync(log,data));
  child.on('error', error => appendFileSync(log, String(error))); children.push(child); return child;
}
async function ensureServer() {
  if (await request(origin + '/api/local/desktop-health')) return;
  const dataRoot = join(app.getPath('userData'),'library'); mkdirSync(dataRoot,{recursive:true});
  const original = join(root,app.isPackaged?'seed':'var');
  for (const name of ['local-library.json','local-playlists.json']) if (!existsSync(join(dataRoot,name)) && existsSync(join(original,name))) copyFileSync(join(original,name),join(dataRoot,name));
  if (!existsSync(join(dataRoot,'playlist-covers')) && existsSync(join(original,'playlist-covers'))) cpSync(join(original,'playlist-covers'),join(dataRoot,'playlist-covers'),{recursive:true});
  const env = { NODE_ENV:'production', PORT:'3147', HOSTNAME:'127.0.0.1', VAULT_WAV_INDEX_PATH:join(dataRoot,'local-library.json'), VAULT_WAV_PLAYLIST_PATH:join(dataRoot,'local-playlists.json') };
  if (app.isPackaged) fork(join(serverRoot,'server.js'),[],env);
  else fork(join(root,'node_modules/next/dist/bin/next'),['start','--hostname','127.0.0.1','--port','3147'],env);
  fork(join(root,'scripts/live-sync-bridge.mjs'));
  for (let i=0;i<100;i++) { if (await request(origin+'/api/local/desktop-health')) return; await new Promise(resolve => setTimeout(resolve,200)); }
  throw new Error('Could not start .womp. Port 3147 may be occupied. See runtime.log in the app logs folder.');
}
function windowOptions() { return {width:1380,height:900,minWidth:760,minHeight:600,title:'.womp',backgroundColor:'#000000',webPreferences:{preload:join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:false}}; }
async function convertAudio() {
  const selection = await dialog.showOpenDialog(mainWindow,{title:'Convert local audio to FLAC',properties:['openFile','multiSelections'],filters:[{name:'Audio files',extensions:['wav','aiff','aif','flac','mp3','m4a','aac']}]});
  if(selection.canceled) return;
  const folder = await dialog.showOpenDialog(mainWindow,{title:'Choose FLAC output folder',properties:['openDirectory','createDirectory']}); if(folder.canceled) return;
  const { basename, extname } = require('node:path');
  try {
    for(const file of selection.filePaths) {
      const output = join(folder.filePaths[0],basename(file,extname(file))+'.flac');
      if(existsSync(output)) throw new Error(`An output named ${basename(output)} already exists. Choose a different folder.`);
      await new Promise((resolve,reject) => { const proc=spawn('/opt/homebrew/bin/ffmpeg',['-v','error','-n','-i',file,'-map','0:a:0','-c:a','flac','-compression_level','8',output]); let error=''; proc.stderr.on('data',chunk=>error+=chunk); proc.on('error',reject); proc.on('exit',code=>code===0?resolve():reject(new Error(error||'Conversion failed.'))); });
    }
    await dialog.showMessageBox(mainWindow,{type:'info',message:'FLAC files saved',detail:'Conversion preserves the decoded source audio. It cannot restore detail missing from a lossy source.'}); shell.openPath(folder.filePaths[0]);
  } catch(error) { dialog.showErrorBox('Audio conversion',error.message); }
}
if(!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance',()=>{if(mainWindow){mainWindow.restore();mainWindow.focus();}});
  app.whenReady().then(async()=>{
    root=app.isPackaged?app.getAppPath():join(__dirname,".."); serverRoot=app.isPackaged?join(root,'runtime'):root;
    stopAudio = require('./audio-bridge.cjs')(ipcMain,root,origin);
    const allowMidi = (contents, permission, requestingOrigin) => {
      const url = requestingOrigin || contents?.getURL() || '';
      return permission === 'midi' && (url === origin || url.startsWith(origin + '/'));
    };
    session.defaultSession.setPermissionCheckHandler(allowMidi);
    session.defaultSession.setPermissionRequestHandler((contents,permission,callback)=>callback(allowMidi(contents,permission)));
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      {label:'.womp',submenu:[{role:'about'},{type:'separator'},{role:'hide'},{role:'hideOthers'},{role:'unhide'},{type:'separator'},{role:'quit'}]},
      {label:'File',submenu:[{label:'Convert local audio to FLAC…',click:convertAudio},{label:'Open app data folder',click:()=>shell.openPath(app.getPath('userData'))},{type:'separator'},{role:'close'}]},
      {role:'editMenu'},{label:'Mode',submenu:[{label:'Library',accelerator:'CmdOrCtrl+1',click:()=>mainWindow?.loadURL(origin)},{label:'Perform',accelerator:'CmdOrCtrl+2',click:()=>mainWindow?.loadURL(origin+'/perform')}]},{label:'View',submenu:[{role:'reload'},{role:'togglefullscreen'},{role:'resetZoom'},{role:'zoomIn'},{role:'zoomOut'}]},{role:'windowMenu'},
      {label:'Help',submenu:[{label:'Audio capture and quality',click:()=>dialog.showMessageBox({message:'Audio tools',detail:'Use File → Convert local audio to FLAC for recordings and files you own or are authorized to convert. .womp does not download Spotify tracks or bypass protected playback. A native audio driver and system-audio capture are not included in this build.'})},{label:'Open logs',click:()=>shell.openPath(app.getPath('logs'))}]}
    ]));
    try {
      await ensureServer(); mainWindow=new BrowserWindow(windowOptions());
      mainWindow.webContents.setWindowOpenHandler(({url})=>{if(url.startsWith(origin+'/stage-display?')) return {action:'allow',overrideBrowserWindowOptions:windowOptions()};if(/^https?:/.test(url)) void shell.openExternal(url);return {action:'deny'};});
      mainWindow.webContents.on('will-navigate',(event,url)=>{if(!url.startsWith(origin+'/perform'))stopAudio();if(new URL(url).origin!==origin){event.preventDefault();if(/^https?:/.test(url))void shell.openExternal(url);}});
      await mainWindow.loadURL(origin);
      app.on('activate',()=>{if(mainWindow&&!mainWindow.isDestroyed())mainWindow.show();});
    }catch(error){dialog.showErrorBox('.womp could not open',error.message);app.quit();}
  });
  app.on('window-all-closed',()=>app.quit());
  app.on('before-quit',()=>{stopAudio();for(const child of children) child.kill('SIGTERM');});
}
