import { musicalKeyColor } from '@/lib/local-audio/key-color';
export function MusicalKeyBadge({value}:{value?:string|null}) {
 const key=musicalKeyColor(value);
 return <span title={value ? `${value} · ${key.code} · Camelot key color` : 'Key not analyzed'} style={{color:key.color,borderColor:key.color}} className="inline-flex max-w-full items-center rounded border px-1.5 py-0.5 text-xs font-bold tabular-nums">{key.code}</span>;
}
