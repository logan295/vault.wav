export const KETAMIND_VERTEX = `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
export const KETAMIND_FRAGMENT = `
precision highp float;
varying vec2 vUv;
uniform float uBeat,uMotion,uKick,uSnare,uTriplet,uHat,uDrop,uAttack,uIndex,uAspect,uDiamond,uFit,uPower;
const float PI=3.14159265359;
mat2 rot(float a){return mat2(cos(a),-sin(a),sin(a),cos(a));}
float line(float d,float w){return exp(-abs(d)*w);}
float disk(vec2 p,vec2 c,float r){return 1.-smoothstep(r-.008,r+.008,length(p-c));}
float box(vec2 p,vec2 s){vec2 q=abs(p)-s;return length(max(q,0.))+min(max(q.x,q.y),0.);}
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
vec3 pal(float x,vec3 a,vec3 b){return mix(a,b,.5+.5*sin(x));}
void main(){
 vec2 p=(vUv-.5)*2.;
 if(uDiamond>.5)p=vec2(p.x-p.y,p.x+p.y)*.5;
 // Preserve circular forms on every wall; fit retains the authored 16:9 picture.
 float aspect=max(.01,uAspect);
 if(uDiamond>.5)aspect=1.;
 vec2 raw=p;
 if(uFit<.5){p*=vec2(max(1.,aspect/(16./9.)),max(1.,(16./9.)/aspect));if(abs(p.x)>1.||abs(p.y)>1.){gl_FragColor=vec4(0.,0.,0.,1.);return;} p.x*=16./9.;}
 else p.x*=aspect;
 float b=uBeat,t=uMotion*.28,k=uKick,s=uSnare,h=uHat,tr=uTriplet,d=uDrop;
 vec3 c=vec3(.003,.006,.012); float r=length(p),a=atan(p.y,p.x);
 if(uIndex<.5){
  // Molten organ pipes, not a radial tunnel.
  p*=1.-d*.2;
  for(int i=0;i<7;i++){float f=float(i)-3.;float x=f*.44+.12*sin(p.y*4.+t+f);float width=.1+.06*k+.035*sin(p.y*7.-t*2.+f);float pipe=line(abs(p.x-x)-width,37.);c+=pipe*pal(p.y*4.+f+t,vec3(.16,1.,.02),vec3(.55,.04,1.));}
  c+=vec3(.6,1.,.05)*line(p.y+.65+.12*sin(p.x*4.+t),32.)*(.4+k);
 }else if(uIndex<1.5){
  vec2 q=p/vec2(1.15,.42+.14*k-.16*s);float mouth=length(q);c+=vec3(.65,.005,.14)*line(mouth-1.,22.);
  for(int i=0;i<13;i++){float x=(float(i)-6.)*.16;float tooth=max(0.,1.-abs(p.x-x)*13.);float jaw=.26+.05*sin(x*3.)-.15*s;float teeth=step(abs(p.x-x),.064)*step(jaw-tooth*.18,abs(p.y))*step(abs(p.y),jaw+.07);c+=teeth*vec3(.8,1.,.36);}
  c+=vec3(.9,.05,.35)*disk(p,vec2(.22*sin(t),0.),.12+.035*k);
 }else if(uIndex<2.5){
  vec2 q=p*rot(sin(floor(b/4.)*.7)*.4);for(int i=0;i<8;i++){float f=float(i);vec2 v=q*rot(f*PI/4.);float direction=mod(floor(b/4.),2.)*2.-1.;float snake=v.y-.19*sin(v.x*5.*direction-t*2.+f)-.1*tr*sin(v.x*12.);float mask=smoothstep(-.2,.2,v.x)*(1.-smoothstep(.4,1.7,v.x));c+=mask*line(snake,30.)*pal(f+p.x*3.,vec3(.7,.05,1.),vec3(.03,1.,.8));}c+=vec3(.9,.6,1.)*line(r-.14-.08*tr,42.);
 }else if(uIndex<3.5){
  float y=.4*sin(p.x*2.2-t*1.8)+.1*sin(p.x*8.+t)+.08*k*sin(p.x*8.-b*PI*2.);float skin=abs(p.y-y);float body=1.-smoothstep(.17+.03*k,.22+.03*k,skin);float rings=.35+.65*pow(.5+.5*cos(p.x*34.-b*PI*4.),8.);c+=body*rings*vec3(.03,.8,.56);c+=line(skin-.19-.03*k,60.)*vec3(.3,1.,.7);c+=disk(p,vec2(1.2,.4*sin(2.64-t*1.8)),.07)*vec3(1.,.2,.6);
 }else if(uIndex<4.5){
  vec2 q=p;q.y=(q.y+.13*k)/(1.-.18*k);float body=disk(q,vec2(-.12,-.2),.4),head=disk(q,vec2(.21,.25),.24);float duck=max(body,head);c+=duck*vec3(.95,.68,.015)*(1.-.28*q.y);c+=step(box(q-vec2(.46,.21),vec2(.18,.055)),0.)*vec3(1.,.17,.015);c*=1.-disk(q,vec2(.27,.3),.045);c+=line(r-.82-.09*k-.18*d,38.)*vec3(.5,.1,1.);c+=line(abs(q.y+.67)-.03*sin(q.x*18.+b*PI),65.)*vec3(.1,.7,1.);
 }else if(uIndex<5.5){
  for(int i=0;i<7;i++){float f=float(i);float x=(f-3.)*.49;float y=.28*sin(f*2.4);vec2 q=p-vec2(x,y);float bloom=.15+.055*(.5+.5*sin(b*PI));float cap=step(length(q/vec2(1.,.55)),bloom)*step(0.,q.y);float stalk=step(abs(q.x+.02*sin(q.y*15.+t)),.025)*step(-.4,q.y)*step(q.y,0.);c+=cap*pal(f,vec3(1.,.22,.01),vec3(.9,.04,.8))+stalk*vec3(.1,.7,.5);c+=disk(q,vec2(.07,.05),.025)*vec3(1.);}
  vec2 cell=floor((p+vec2(0.,t)) *18.);c+=step(.98,hash(cell))*h*vec3(.5,1.,.3)*(.4+.6*sin(t+cell.y));
 }else if(uIndex<6.5){
  for(int i=0;i<15;i++){float f=float(i);float x=(f-7.)*.19;float y=.28*sin(f*.48-t*2.)+.1*s*sin(f);vec2 q=p-vec2(x,y);float shell=length(q/vec2(.12,.19));c+=line(shell-1.,15.)*vec3(.5,.75,1.);c+=disk(q,vec2(-.035,.06),.04)*vec3(.9,1.,1.);float leg=abs(q.y)-(.22+.07*sin(f+b*PI*4.));c+=line(leg,80.)*step(abs(q.x),.16)*vec3(.15,.3,.8);}
 }else if(uIndex<7.5){
  vec2 q=p;q.x+=.24*sin(q.y*4.+t);q.y+=.25*sin(q.x*4.-t);q*=rot(.25*sin(b*PI/2.));float checker=mod(floor(q.x*7.)+floor(q.y*7.)+floor(b/2.),2.);float fabric=.35+.65*abs(sin(q.x*5.+q.y*3.));c+=mix(vec3(.04,.8,.5),vec3(.7,.04,.6),checker)*fabric*(1.-smoothstep(.6,1.,abs(q.y)));c=mix(c,c.bgr,s*.6);
 }else if(uIndex<8.5){
  float teeth=abs(fract(p.x*2.5)-.5)*.65;float gap=.15+.28*k-.15*s;float blade=step(gap+teeth,abs(p.y));float edge=line(abs(p.y)-gap-teeth,55.);c+=blade*vec3(.3,.025,.01)+edge*vec3(1.,.23,.025);c+=line(p.x,120.)*vec3(1.,.7,.2)*s;
 }else if(uIndex<9.5){
  vec2 q=p*5.;q.x+=mod(floor(q.y),2.)*.5;vec2 cell=floor(q);vec2 v=fract(q)-.5;float hex=max(abs(v.x)*.866+abs(v.y)*.5,abs(v.y));c+=line(hex-.4,38.)*vec3(.15,.7,.015);float ant=length(v-vec2(.23*cos(b*PI*8.+hash(cell)*6.),.23*sin(b*PI*8.+hash(cell)*6.)));c+=line(ant-.035,80.)*vec3(.8,1.,.2);c+=step(hex,.32)*hash(cell)*k*vec3(.05,.2,.005);
 }else if(uIndex<10.5){
  vec2 cell=floor(p*19.);vec2 q=cell/19.;q.x+=step(.5,s)*(.15*sin(cell.y*9.+floor(b)));float face=step(box(q,vec2(.53,.62)),0.);vec2 gaze=q-vec2(.035*sin(b*PI*4.),0.);float eye=step(box(abs(gaze)-vec2(.23,.18),vec2(.11,.12)),0.);float mouth=step(box(q-vec2(0.,-.28),vec2(.3,.04)),0.);float pixel=step(.82,hash(cell+floor(b*2.)))*s;c+=face*vec3(.18,.03,.33)+(eye+mouth)*vec3(.78,1.,.5)+pixel*vec3(1.,.05,.25);
 }else if(uIndex<11.5){
  vec2 q=p;q.y+=.12*sin(q.x*9.+t)+.16*k*sin(q.x*5.);float radius=length(q);c+=line(radius-.65,65.)*vec3(.05,.9,.85);for(int i=0;i<12;i++){float f=float(i);vec2 z=q-vec2(cos(f*PI/6.),sin(f*PI/6.))*(.64+.035*s*sin(f));c+=line(length(z)-.025,95.)*vec3(.6,1.,.7);}vec2 hand=q*rot(b*PI/2.);c+=line(hand.x,90.)*step(0.,hand.y)*step(hand.y,.5)*vec3(1.,.4,.12);c+=line(q.y+.68+.15*sin(q.x*8.+t),40.)*vec3(.1,.55,.6);
 }else if(uIndex<12.5){
  for(int i=0;i<6;i++){float f=float(i),angle=f*PI/3.+b*PI/4.;vec2 q=p-vec2(cos(angle)*1.05,sin(angle)*.57);q.y/=max(.13,1.-s*.85);float shape=length(q/vec2(.32,.18));c+=line(shape-1.,25.)*vec3(.9,.6,1.);c+=disk(q,vec2(0.),.1-.04*k)*vec3(.1,.65,.8);c*=1.-disk(q,vec2(.015,0.),.046);c+=disk(q,vec2(-.025,.035),.018)*vec3(1.);}
 }else if(uIndex<13.5){
  for(int i=0;i<4;i++){float f=float(i);vec2 q=p-vec2((f-1.5)*.7,.25*sin(b*PI+f));q*=1.-d*.12;float bell=length(q/vec2(.25,.22));c+=line(bell-1.,35.)*step(-.02,q.y)*pal(f,vec3(.05,.25,1.),vec3(.7,.1,1.));for(int j=0;j<5;j++){float x=(float(j)-2.)*.075+.045*sin(q.y*13.+t*3.+float(j));c+=line(q.x-x,90.)*step(q.y,0.)*step(-.65,q.y)*vec3(.06,.5,1.)*(.5+.5*tr);}}
 }else if(uIndex<14.5){
  vec2 q=p*rot(.3);q.y*=2.4;float rad=length(q);float theta=atan(q.y,q.x);float swirl=sin(theta*3.+rad*15.-b*PI/8.+k*.5);float ring=line(rad-.57-.025*k,40.);float diskLight=exp(-abs(rad-.7)*4.)*pow(.5+.5*swirl,4.);c+=(diskLight+ring)*pal(theta+t,vec3(1.,.17,.025),vec3(.6,.04,1.));c*=smoothstep(.27,.36,rad);c+=vec3(.9,.7,.4)*line(rad-1.1-.4*d,50.)*d;
 }else if(uIndex<15.5){
  // Braided candy torus: inner and outer strands exchange depth.
  vec2 q=p/vec2(1.25,1.);float angle=atan(q.y,q.x);float rad=length(q);
  for(int i=0;i<3;i++){float f=float(i);float twist=angle*5.+b*PI/2.+f*2.*PI/3.;float ribbon=.55+.1*sin(twist)+.06*k+.025*tr*sin(angle*3.+f);float shine=.45+.55*(.5+.5*cos(twist));c+=line(rad-ribbon,55.)*shine*pal(f+tr,vec3(1.,.04,.45),vec3(.06,1.,.75));}
 }else if(uIndex<16.5){
  // Bilateral manta membrane, with a long curling tail.
  vec2 q=p/(1.+d*.2);float wings=.15+.42*pow(abs(q.x),.65)*(-cos(b*PI*2.))-.18*q.x*q.x;float span=1.-smoothstep(.1,1.35,abs(q.x));float membrane=exp(-abs(q.y-wings)*18.)*span;c+=membrane*pal(q.x*3.+t,vec3(.02,.8,.65),vec3(.2,.08,1.));c+=line(q.y-wings-.08*span,65.)*span*vec3(.3,1.,.9);float tail=q.x-.1*sin(q.y*12.-t*3.)-.07*s;c+=line(tail,60.)*step(q.y,0.)*step(-.85,q.y)*vec3(.02,.4,.8);c+=disk(q,vec2(-.06,.035),.025)*vec3(1.)+disk(q,vec2(.06,.035),.025)*vec3(1.);
 }else if(uIndex<17.5){
  // Distinct transparent eggs with moving nuclei.
  for(int i=0;i<19;i++){float f=float(i);vec2 center=vec2(sin(f*2.399),cos(f*2.399))*.18*sqrt(f);center.x*=1.6;vec2 q=p-center;float radius=.12+.026*tr+.015*sin(f+b);float shell=length(q);c+=line(shell-radius,80.)*vec3(.25,.7,.015);c+=disk(q,vec2(.025*sin(t+f),.025*cos(t*2.+f)),radius*(.26+.18*k))*pal(f,vec3(.7,.03,.8),vec3(.1,.8,.25));c+=disk(q,vec2(-radius*.4,radius*.45),.02)*vec3(.8,1.,.6);}
 }else if(uIndex<18.5){
  // Angular exploding paper facets, deliberately unlike the organic scenes.
  for(int i=0;i<11;i++){float f=float(i);vec2 q=p-vec2(sin(f*2.4)*.85,cos(f*2.4)*.55);q*=rot(f*.9+floor(b*2.)*PI/8.+s*.8);float triangle=max(abs(q.x)*.866+q.y*.5,-q.y)-(.1+.06*k);float fill=1.-smoothstep(-.006,.006,triangle);float facet=step(q.x,0.);c+=fill*pal(f+t,vec3(1.,.16,.01),vec3(.05,.4,1.))*(.35+.5*facet);c+=line(triangle,90.)*vec3(.9,.8,.4);}
 }else if(uIndex<19.5){
  // Bone trees; branch lengths open on the half-time accent.
  for(int i=0;i<5;i++){float f=float(i);vec2 q=p-vec2((f-2.)*.6,-.55);float height=.85+.15*sin(f)+.12*s;c+=line(q.x+.035*sin(q.y*9.+t),90.)*step(0.,q.y)*step(q.y,height)*vec3(.5,.4,.9);for(int j=0;j<3;j++){float z=float(j)*.22+.2;float branch=abs(q.x)-(.15+.06*s)*(1.-abs(q.y-z)*7.);float mask=1.-smoothstep(.04,.12,abs(q.y-z));c+=line(branch,90.)*mask*vec3(.6,.75,1.);c+=disk(q,vec2(0.,z),.035+.012*k)*vec3(1.,.25,.6);}}
 }else if(uIndex<20.5){
  // Asymmetric nested zigzag frames fold into a deep corridor.
  vec2 q=p*rot(.08*sin(t));for(int i=0;i<13;i++){float f=float(i);float depth=fract(f/13.+b/16.);float size=.12+depth*1.65;float teeth=abs(fract(q.x*5./size)-.5)*size*.22;float frame=max(abs(q.x)/1.6,abs(q.y)+teeth)-size*(.55+.04*sin(b*PI*4.))-.08*d;c+=line(frame,55./max(.2,size))*pal(f*.65+t,vec3(.01,.65,1.),vec3(.6,.04,.85))*(.25+.75*depth);}
 }else if(uIndex<21.5){
  // Horizontal spring with the coil crossing over and under itself.
  for(int i=0;i<3;i++){float f=float(i);float phase=p.x*19.-b*PI*8.+f*2.*PI/3.;float height=.22*(1.-.3*k);float coil=p.y-height*sin(phase);float depth=.3+.7*(.5+.5*cos(phase));c+=line(coil,55.)*depth*pal(f,vec3(1.,.55,.005),vec3(.7,.08,1.));}c+=line(abs(p.x)-1.5,55.)*step(abs(p.y),.3)*vec3(.5,.2,.8);
 }else if(uIndex<22.5){
  // Liquid spheres with shaded crescents, collision paths and split glints.
  for(int i=0;i<9;i++){float f=float(i);vec2 center=vec2(sin(t+f*2.4)*1.15,cos(t*.8+f*1.7)*.58);center+=normalize(center+vec2(.01))*k*.1;vec2 q=(p-center)/(.12+.07*k);float rad=length(q);float body=1.-smoothstep(.92,1.,rad);float shade=.2+.8*sqrt(max(0.,1.-rad*rad));c+=body*shade*pal(f,vec3(1.,.02,.15),vec3(.1,.2,1.));c+=(disk(q,vec2(-.28-.16*s,.35),.12)+s*disk(q,vec2(.28,.35),.12))*vec3(1.);c+=line(rad-1.08,22.)*vec3(.3,.06,.6);}
 }else if(uIndex<23.5){
  // Rotating jelly cube: bent contour plus a folded interior grid.
  vec2 q=p*rot(b*PI/2.);q.y/=(1.-.18*k);q.x+=.06*sin(q.y*12.+t)*s;float shape=box(q,vec2(.52,.52))-.07*sin(atan(q.y,q.x)*5.+t);float body=1.-smoothstep(-.02,.02,shape);float grid=pow(.5+.5*sin(q.x*22.+.5*sin(q.y*12.+t)),12.)+pow(.5+.5*cos(q.y*22.+q.x*3.),12.);c+=body*(vec3(.015,.03,.2)+grid*vec3(.05,.4,1.));c+=line(shape,70.)*vec3(.4,.7,1.);c+=disk(q,vec2(-.32,.3),.065)*vec3(.7,.9,1.);
 }else{
  // Elastic imp: curved horns, balloon cheeks, and a rubbery grin.
  vec2 q=p;q.y*=1.+.12*s;float face=length(q/vec2(.48+.05*k,.5));c+=line(face-1.,25.)*vec3(.9,.15,.8);c+=disk(q,vec2(-.39,-.04),.11+.03*k)*vec3(.45,.04,.4)+disk(q,vec2(.39,-.04),.11+.03*k)*vec3(.45,.04,.4);for(int i=0;i<2;i++){float side=float(i)*2.-1.;vec2 hq=q-vec2(side*.35,.45);float horn=hq.x-side*(.15*sin(hq.y*8.)+.035*tr);c+=line(horn,65.)*step(0.,hq.y)*step(hq.y,.35)*vec3(.55,.4,1.);c+=disk(q,vec2(side*.18,.11),.065)*vec3(.7,1.,.2);}float grin=q.y+.17+.13*(1.-q.x*q.x/.09)-.06*s;c+=line(grin,70.)*step(abs(q.x),.32)*vec3(1.,.65,.8);

 }
 // A restrained texture binds the pack without replacing the distinct geometry.
 c*=.92+.08*sin(vUv.y*620.);c*=(1.-smoothstep(.2,2.4,length(raw)));
 c*=max(0.,uPower)*(.8+.16*uAttack+.08*uDrop);
 c=pow(1.-exp(-c*1.8),vec3(1./2.2));gl_FragColor=vec4(c,1.);
}`;
