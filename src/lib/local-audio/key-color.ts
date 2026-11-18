// Camelot pitch classes. Enharmonic spellings map to the same color and code.
const major = [11,6,1,8,3,10,5,0,7,2,9,4];
const minor = [8,3,10,5,0,7,2,9,4,11,6,1];
const pitches: Record<string,number> = { C:0,'B#':0,'C#':1,Db:1,D:2,'D#':3,Eb:3,E:4,Fb:4,'E#':5,F:5,'F#':6,Gb:6,G:7,'G#':8,Ab:8,A:9,'A#':10,Bb:10,B:11,Cb:11 };
export function musicalKeyColor(key?: string | null) {
 const value = key?.trim().replace(/♯/g,'#').replace(/♭/g,'b') || '';
 const camelot = /^(1[0-2]|[1-9])([ab])$/i.exec(value);
 const named = /^([A-Ga-g])([#b]?)(?:\s*)(m|min|minor|maj|major)?$/i.exec(value);
 let number = camelot ? Number(camelot[1]) : 0, mode = camelot?.[2].toUpperCase() || '';
 if (!number && named) { const pitch = pitches[named[1].toUpperCase()+named[2].toLowerCase()]; mode = named[3] !== 'M' && /^(m|min|minor)$/.test((named[3] || '').toLowerCase()) ? 'A' : 'B'; number = (mode==='A'?minor:major).indexOf(pitch)+1; }
 return number ? { code: `${number}${mode}`, color: `hsl(${(number-1)*30} 85% 76%)` } : { code: value || '—', color: '#c5c9ce' };
}
