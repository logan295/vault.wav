#include "ring.h"
#include <stdatomic.h>
#include <string.h>
#define CAP 8192
static float ring[CAP][4];
static _Atomic uint32_t readPos=0,writePos=0,under=0,over=0;
void womp_write(const float *s,uint32_t n){
 uint32_t w=atomic_load_explicit(&writePos,memory_order_relaxed),r=atomic_load_explicit(&readPos,memory_order_acquire);
 if(n>CAP-(w-r)){atomic_fetch_add(&over,1);return;}
 for(uint32_t i=0;i<n;i++)memcpy(ring[(w+i)%CAP],s+i*4,4*sizeof(float));
 atomic_store_explicit(&writePos,w+n,memory_order_release);
}
void womp_render(AudioBufferList *b,uint32_t n,uint32_t master,uint32_t cue){
 uint32_t r=atomic_load_explicit(&readPos,memory_order_relaxed),w=atomic_load_explicit(&writePos,memory_order_acquire),count=w-r;
 if(count<n)atomic_fetch_add(&under,1);
 if(count>n)count=n;
 for(uint32_t k=0;k<b->mNumberBuffers;k++){
  AudioBuffer *v=&b->mBuffers[k];float *out=v->mData;
  if(!out)continue;
  memset(out,0,v->mDataByteSize);
  for(uint32_t i=0;i<count;i++)for(uint32_t c=0;c<v->mNumberChannels;c++){
   uint32_t physical=b->mNumberBuffers==1?c:k;
   int input=physical==master?0:physical==master+1?1:physical==cue?2:physical==cue+1?3:-1;
   if(input>=0)out[i*v->mNumberChannels+c]=ring[(r+i)%CAP][input];
  }
 }
 atomic_store_explicit(&readPos,r+count,memory_order_release);
}
uint32_t womp_queued(void){return atomic_load(&writePos)-atomic_load(&readPos);}
uint32_t womp_underflows(void){return atomic_load(&under);}
uint32_t womp_overflows(void){return atomic_load(&over);}
