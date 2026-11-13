import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
mkdirSync('work/native-audio',{recursive:true});
execFileSync('clang',['-O2','-std=c11','-c','desktop/audio/ring.c','-o','work/native-audio/ring.o'],{stdio:'inherit'});
execFileSync('swiftc',['-O','desktop/audio/output.swift','work/native-audio/ring.o','-import-objc-header','desktop/audio/ring.h','-o','desktop/audio/womp-audio','-framework','AVFoundation','-framework','CoreAudio','-framework','AudioToolbox'],{stdio:'inherit'});
