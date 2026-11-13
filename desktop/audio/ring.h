#include <stdint.h>
#include <AudioToolbox/AudioToolbox.h>
void womp_write(const float *samples, uint32_t frames);
void womp_render(AudioBufferList *buffers, uint32_t frames, uint32_t master, uint32_t cue);
uint32_t womp_queued(void);
uint32_t womp_underflows(void);
uint32_t womp_overflows(void);
