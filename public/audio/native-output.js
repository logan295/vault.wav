class WompOutput extends AudioWorkletProcessor {
 constructor(){super();this.enabled=false;this.block=new Float32Array(2048);this.frame=0;this.port.onmessage=e=>{this.enabled=!!e.data.enabled;this.frame=0;};}
 process(inputs){if(!this.enabled)return true;const input=inputs[0];if(!input?.length)return true;for(let i=0;i<input[0].length;i++){
  for(let c=0;c<4;c++)this.block[this.frame*4+c]=input[c]?.[i]||0;
  if(++this.frame===512){this.port.postMessage(this.block.buffer,[this.block.buffer]);this.block=new Float32Array(2048);this.frame=0;}
 }return true;}
}
registerProcessor('womp-output',WompOutput);
