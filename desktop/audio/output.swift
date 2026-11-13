import Foundation
import AVFoundation
import CoreAudio
import AudioToolbox
func emit(_ v:[String:Any]) { if let d=try? JSONSerialization.data(withJSONObject:v),let s=String(data:d,encoding:.utf8){print(s);fflush(stdout)} }
func address(_ selector:AudioObjectPropertySelector,_ scope:AudioObjectPropertyScope=kAudioObjectPropertyScopeGlobal)->AudioObjectPropertyAddress {AudioObjectPropertyAddress(mSelector:selector,mScope:scope,mElement:kAudioObjectPropertyElementMain)}
func string(_ id:AudioObjectID,_ selector:AudioObjectPropertySelector)->String {var a=address(selector);var value:Unmanaged<CFString>?;var n=UInt32(MemoryLayout<Unmanaged<CFString>?>.size);let s=AudioObjectGetPropertyData(id,&a,0,nil,&n,&value);return s==noErr ? (value?.takeRetainedValue() as String? ?? "") : ""}
func channelCount(_ id:AudioObjectID)->UInt32 {var a=address(kAudioDevicePropertyStreamConfiguration,kAudioDevicePropertyScopeOutput);var size:UInt32=0;guard AudioObjectGetPropertyDataSize(id,&a,0,nil,&size)==noErr,size>0 else{return 0};let p=UnsafeMutableRawPointer.allocate(byteCount:Int(size),alignment:16);defer{p.deallocate()};guard AudioObjectGetPropertyData(id,&a,0,nil,&size,p)==noErr else{return 0};return UnsafeMutableAudioBufferListPointer(p.assumingMemoryBound(to:AudioBufferList.self)).reduce(0){$0+$1.mNumberChannels}}
func devices()->[[String:Any]] {var a=address(kAudioHardwarePropertyDevices);var n:UInt32=0;AudioObjectGetPropertyDataSize(AudioObjectID(kAudioObjectSystemObject),&a,0,nil,&n);var ids=[AudioObjectID](repeating:0,count:Int(n)/MemoryLayout<AudioObjectID>.size);AudioObjectGetPropertyData(AudioObjectID(kAudioObjectSystemObject),&a,0,nil,&n,&ids);return ids.compactMap{ id in let count=channelCount(id);if count==0{return nil};return ["id":id,"uid":string(id,kAudioDevicePropertyDeviceUID),"name":string(id,kAudioObjectPropertyName),"channels":count]}}
do {
 let args=CommandLine.arguments
 let list=devices()
 if args.count==2 && args[1]=="--list" {emit(["devices":list]);exit(0)}
 guard args.count==5,let device=list.first(where:{$0["uid"] as? String==args[1]}),let id=device["id"] as? UInt32,let channels=device["channels"] as? UInt32,let master=UInt32(args[2]),let cue=UInt32(args[3]),let rate=Double(args[4]),rate>=32000,rate<=96000,master+1<channels,cue+1<channels,abs(Int(master)-Int(cue))>=2 else{throw NSError(domain:"Choose a connected output with separate master and headphone channel pairs",code:1)}
 let engine=AVAudioEngine()
 var deviceID=id
 guard let unit=engine.outputNode.audioUnit,AudioUnitSetProperty(unit,kAudioOutputUnitProperty_CurrentDevice,kAudioUnitScope_Global,0,&deviceID,UInt32(MemoryLayout<AudioDeviceID>.size))==noErr else{throw NSError(domain:"Could not select audio output",code:2)}
 guard let format=AVAudioFormat(commonFormat:.pcmFormatFloat32,sampleRate:rate,channels:channels,interleaved:false) else{throw NSError(domain:"Invalid output format",code:3)}
 let source=AVAudioSourceNode(format:format){ _,_,frames,buffers in womp_render(buffers,frames,master,cue);return noErr }
 engine.attach(source)
 engine.connect(source,to:engine.outputNode,format:format)
 try engine.start()
 emit(["ready":true,"name":device["name"]!,"channels":channels,"sampleRate":rate])
 DispatchQueue.global(qos:.userInteractive).async {
  var pending=Data()
  while true {
   let bytes=FileHandle.standardInput.availableData
   if bytes.isEmpty{exit(0)}
   pending.append(bytes)
   let frames=pending.count/16
   if frames>0 {pending.withUnsafeBytes{ raw in womp_write(raw.baseAddress!.assumingMemoryBound(to:Float.self),UInt32(frames)) };pending.removeFirst(frames*16)}
  }
 }
 let timer=Timer.scheduledTimer(withTimeInterval:1,repeats:true){_ in
  if channelCount(id)<channels{emit(["error":"Audio output disconnected"]);exit(1)}
  emit(["queuedFrames":womp_queued(),"underruns":womp_underflows(),"overruns":womp_overflows()])
 }
 RunLoop.main.add(timer,forMode:.common)
 RunLoop.main.run()
 withExtendedLifetime(engine){}
} catch {emit(["error":error.localizedDescription]);exit(1)}
