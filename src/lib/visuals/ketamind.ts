export const KETAMIND_FAMILIES = {
 kick: {label:'Kick / impact', color:'#c1ff3c'},
 snare: {label:'Snare / half-time', color:'#ff8097'},
 triplet: {label:'Triplet / swing', color:'#c5a6ff'},
 subdivision: {label:'Eighths / sixteenths', color:'#64ddff'},
 phrase: {label:'Bar / phrase', color:'#ffd078'},
};
const families: (keyof typeof KETAMIND_FAMILIES)[] = ['kick','snare','triplet','kick','kick','phrase','subdivision','snare','kick','subdivision','snare','phrase','kick','triplet','phrase','kick','snare','triplet','snare','snare','subdivision','subdivision','kick','phrase','snare'];
export const KETAMIND_VISUALS = [
  {id:'gloop-cathedral',label:'Gloop Cathedral',pairing:'Quarter-note kicks inflate the liquid columns; drops open the chamber.',color:'#baff28'},
  {id:'jawbreaker-oracle',label:'Jawbreaker Oracle',pairing:'Half-time snares snap the teeth shut; kicks dilate the mouth.',color:'#ff518c'},
  {id:'triplet-tentacles',label:'Triplet Tentacles',pairing:'Three tentacle contractions per beat; bar downbeats reverse the curl.',color:'#b088ff'},
  {id:'subfloor-worm',label:'Subfloor Worm',pairing:'Kicks send a compression wave through the worm; eighth notes ripple its skin.',color:'#39ffd2'},
  {id:'rubber-duck-reactor',label:'Rubber Duck Reactor',pairing:'Kicks squash the duck; offbeats spring it back; drops overload the halo.',color:'#ffdb30'},
  {id:'fractal-fungus',label:'Fractal Fungus',pairing:'Mushroom caps bloom every two beats; sixteenths scatter spores.',color:'#ff8a3d'},
  {id:'chrome-centipede',label:'Chrome Centipede',pairing:'Eighth notes advance the legs; snares kick the chrome spine sideways.',color:'#8ccfff'},
  {id:'goblin-laundry',label:'Goblin Laundry',pairing:'Four-beat fabric folds with snare-triggered checkerboard inversion.',color:'#ff74fa'},
  {id:'bass-guillotine',label:'Bass Guillotine',pairing:'Kick/snare call-and-response opens and closes interlocking blades.',color:'#ff492f'},
  {id:'acid-ant-farm',label:'Acid Ant Farm',pairing:'Sixteenth-note ants travel the hex tunnels; kick pulses fill their chambers.',color:'#91ff4b'},
  {id:'pixel-poltergeist',label:'Pixel Poltergeist',pairing:'Snare hits scramble the pixel face; eighth-note eyes scan side to side.',color:'#f0f0d5'},
  {id:'time-slime',label:'Time Slime',pairing:'Bar-length clock rotations melt on every kick; snares displace the numerals.',color:'#56ddd8'},
  {id:'eyeball-carousel',label:'Eyeball Carousel',pairing:'Quarter-note pupil contractions with an eight-beat orbit and snare blinks.',color:'#f4b3ff'},
  {id:'jellyfish-switchyard',label:'Jellyfish Switchyard',pairing:'Offbeat jellyfish propulsion; triplet tentacle sparks; drop expansion.',color:'#469dff'},
  {id:'ketamind-singularity',label:'Ketamind Singularity',pairing:'Sixteen-beat accretion spiral; kicks bend spacetime; drops fracture the ring.',color:'#ffae56'},
  {id:'taffy-cyclotron',label:'Taffy Cyclotron',pairing:'Quarter notes stretch the candy torus; triplets braid its strands.',color:'#ff6bc8'},
  {id:'manta-melt',label:'Manta Melt',pairing:'Offbeat wing thrusts and half-time tail snaps; drops expand the fins.',color:'#48ffcd'},
  {id:'frogspawn-machine',label:'Frogspawn Machine',pairing:'Triplet cell contractions; quarter-note nuclei swell inside the spawn.',color:'#b4ff49'},
  {id:'prism-gremlin',label:'Prism Gremlin',pairing:'Snare hits flip the origami shards; eighth notes rotate their facets.',color:'#ff784b'},
  {id:'neon-bone-orchard',label:'Neon Bone Orchard',pairing:'Half-time bone branches grow; quarter notes pulse the joints.',color:'#d6caff'},
  {id:'accordion-abyss',label:'Accordion Abyss',pairing:'Eighth-note folds compress the zigzag corridor; drops widen its throat.',color:'#40c7ff'},
  {id:'slink-contraption',label:'Slink Contraption',pairing:'Sixteenth-note traveling waves coil the spring; kicks squash its height.',color:'#ffd738'},
  {id:'molten-marbles',label:'Molten Marbles',pairing:'Quarter-note collisions fling liquid spheres; snare hits split their highlights.',color:'#ff5784'},
  {id:'wobble-pudding',label:'Wobble Pudding',pairing:'Four-beat jelly-cube rotation with kick squash and snare surface ripples.',color:'#5c9eff'},
  {id:'elastic-imp',label:'Elastic Imp',pairing:'Half-time snare grins, quarter-note cheek inflation and triplet horn twitches.',color:'#f5a8ff'},
].map((v,index)=>({...v,index,family:families[index],familyLabel:KETAMIND_FAMILIES[families[index]].label,color:KETAMIND_FAMILIES[families[index]].color,...(index>=15?{logoFree:true}:{}),group:index<15?'Ketamind · Wonky 15':'Ketamind · Unbranded 10',src:`ketamind:${v.id}`,poster:`/${index<15?'ketamind':'ketamind-2'}/renders/${v.id}.png`}));

export function ketamindAutoSrc(beat:number) { return KETAMIND_VISUALS[Math.floor((Number.isFinite(beat)?Math.max(0,beat):0) / 32) % KETAMIND_VISUALS.length].src; }

export function ketamindIndex(src:string) { return KETAMIND_VISUALS.findIndex(v=>v.src===src); }
const phase=(x:number)=>x-Math.floor(x);
/** All triggers derive from the transport beat, so pauses and seeks are deterministic. */
export function ketamindRhythm(beat:number,attack=0,dropBeat:number|null=null) {
  const b=Number.isFinite(beat)?Math.max(0,beat):0;
  return {beat:b,kick:Math.exp(-phase(b)*10),snare:Math.exp(-phase((b-2)/4)*32),
    triplet:Math.exp(-phase(b*3)*8),hat:Math.exp(-phase(b*4)*12),
    drop:dropBeat===null?0:Math.exp(-Math.max(0,dropBeat)*2),attack:Math.max(0,Math.min(1,attack))};
}
