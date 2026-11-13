import { registerHooks } from 'node:module';
import { mkdtemp,mkdir,writeFile,rm,realpath,symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
registerHooks({resolve(specifier,context,next){if(specifier==='server-only')return {url:'data:text/javascript,export {}',shortCircuit:true};return next(specifier,context);}});
const {artworkKey,readUsbArtwork,readCachedTrackArtwork}=await import('../src/lib/local-audio/artwork-cache.ts');
const root=await realpath(await mkdtemp(join(tmpdir(),'womp-artwork-')));
try {
 assert.deepEqual(await readUsbArtwork(root),{});
 const folder=join(root,'.womp/artwork');await mkdir(folder,{recursive:true});
 const relativePath='Music/track.wav';const key=artworkKey(relativePath);assert.match(key,/^[a-f0-9]{24}$/);
 const entry={relativePath,url:'https://soundcloud.com/artist/track',title:'Track',uploader:'Artist',verifiedAt:'2026-11-13T00:00:00Z'};
 const manifest={version:1,entries:{[key]:entry}};const path=join(folder,'manifest.json');
 await writeFile(path,JSON.stringify(manifest));await writeFile(join(folder,key+'.jpg'),Buffer.from([255,216,255,217]));
 assert.equal((await readUsbArtwork(root))[key].url,entry.url);assert.equal((await readCachedTrackArtwork(root,relativePath)).length,4);
 assert.equal(await readCachedTrackArtwork(root,'different.wav'),null);
 await rm(join(folder,key+'.jpg'));await writeFile(join(root,'outside.jpg'),'not an image');await symlink(join(root,'outside.jpg'),join(folder,key+'.jpg'));assert.equal(await readCachedTrackArtwork(root,relativePath),null);
 manifest.entries[key].url='https://example.com/wrong';await writeFile(path,JSON.stringify(manifest));assert.deepEqual(await readUsbArtwork(root),{});
 console.log('PASS: portable artwork lookup, relative-path matching, source validation, missing files and symlink protection.');
}finally{await rm(root,{recursive:true,force:true});}
