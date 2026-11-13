#include "../desktop/audio/ring.h"
#include <assert.h>
#include <stdlib.h>
#include <stdio.h>
int main(void){
 struct {UInt32 count;AudioBuffer b[6];} list={6};float output[6][1024];
 for(int c=0;c<6;c++){list.b[c].mNumberChannels=1;list.b[c].mDataByteSize=sizeof(output[c]);list.b[c].mData=output[c];}
 float input[1024*4];for(int i=0;i<1024;i++){input[i*4]=.1f;input[i*4+1]=.2f;input[i*4+2]=.3f;input[i*4+3]=.4f;}
 womp_write(input,1024);assert(womp_queued()==1024);womp_render((AudioBufferList*)&list,1024,2,4);
 for(int i=0;i<1024;i++){assert(output[0][i]==0);assert(output[1][i]==0);for(int c=0;c<4;c++)assert(output[c+2][i]==input[i*4+c]);}
 assert(womp_queued()==0);womp_render((AudioBufferList*)&list,1024,0,2);for(int c=0;c<6;c++)for(int i=0;i<1024;i++)assert(output[c][i]==0);assert(womp_underflows()==1);
 for(int i=0;i<8;i++)womp_write(input,1024);womp_write(input,1024);assert(womp_queued()==8192);assert(womp_overflows()==1);
 for(int i=0;i<8;i++)womp_render((AudioBufferList*)&list,1024,0,2);assert(womp_queued()==0);
 puts("PASS: native PCM channel separation, remapping, unused-channel silence, underrun silence and bounded overflow.");
}
