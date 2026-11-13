/* eslint-disable @typescript-eslint/no-require-imports */
const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('wompHardware',{
 listAudio:()=>ipcRenderer.invoke('womp:audio:list'),
 startAudio:config=>ipcRenderer.invoke('womp:audio:start',config),
 stopAudio:()=>ipcRenderer.invoke('womp:audio:stop'),
 audioStatus:()=>ipcRenderer.invoke('womp:audio:status'),
 writeAudio:buffer=>ipcRenderer.send('womp:audio:pcm',new Uint8Array(buffer))
});
