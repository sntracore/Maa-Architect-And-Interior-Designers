import * as T from './vendor/three.module.min.js';

export const PHOTOGRAPHS = Object.freeze([22,16,17,15,13,8,21,24,19,3,4,23,26,31,30,29,32]);
// Native landscape proportions preserve every architectural photograph.
export const HELIX = Object.freeze({ step: 1.12, pitch: 3.05, top: 24.4, radius: 5.25, width: 7.8, height: 7.8 * 941 / 1672 });
const clamp = T.MathUtils.clamp;
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const damping = (speed, dt) => 1 - Math.exp(-speed * dt);

export function railPoint(angle, inset = 0) {
  const r = 2.2 + .23 * Math.sin(angle * .68) - inset;
  return new T.Vector3(Math.sin(angle) * r, HELIX.top - angle / HELIX.step * HELIX.pitch, Math.cos(angle) * r);
}

// Closed, bevelled section transported along the same helix as the photographs.
export function makeRibbon(inset = 0, halfWidth = .48, halfDepth = .105) {
  const steps = 440, start = -.65, end = (PHOTOGRAPHS.length - 1) * HELIX.step + .75;
  const b = Math.min(.035, halfDepth * .4);
  const profile = [[-halfWidth+b,-halfDepth],[halfWidth-b,-halfDepth],[halfWidth,-halfDepth+b],[halfWidth,halfDepth-b],[halfWidth-b,halfDepth],[-halfWidth+b,halfDepth],[-halfWidth,halfDepth-b],[-halfWidth,-halfDepth+b]];
  const vertices = [], uvs = [], indices = [], tangent = new T.Vector3(), radial = new T.Vector3(), binormal = new T.Vector3();
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, a = T.MathUtils.lerp(start, end, t), c = railPoint(a, inset);
    tangent.copy(railPoint(a+.001,inset)).sub(railPoint(a-.001,inset)).normalize();
    radial.set(Math.sin(a),0,Math.cos(a)); binormal.crossVectors(tangent,radial).normalize();
    for (const [x,y] of profile) { const p=c.clone().addScaledVector(radial,x).addScaledVector(binormal,y);vertices.push(p.x,p.y,p.z);uvs.push(t,(x/halfWidth+1)/2); }
  }
  const geometry = new T.BufferGeometry();
  for (let side = 0; side < 8; side++) {
    const offset = indices.length;
    for (let i=0;i<steps;i++) { const a=i*8+side,b=i*8+(side+1)%8,c=a+8,d=b+8;indices.push(a,c,b,b,c,d); }
    geometry.addGroup(offset,indices.length-offset,side===0||side===4?1:0);
  }
  const capOffset=indices.length;
  for(let j=1;j<7;j++){indices.push(0,j,j+1);const n=steps*8;indices.push(n,n+j+1,n+j);}
  geometry.addGroup(capOffset,indices.length-capOffset,0);
  for(let i=0;i<indices.length;i+=3){const next=indices[i+1];indices[i+1]=indices[i+2];indices[i+2]=next;}
  geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingSphere();
  return geometry;
}

function roundedPath(Path, width, height, radius) {
  const p = new Path(), x=-width/2,y=-height/2,r=radius;
  p.moveTo(x+r,y);p.lineTo(x+width-r,y);p.quadraticCurveTo(x+width,y,x+width,y+r);
  p.lineTo(x+width,y+height-r);p.quadraticCurveTo(x+width,y+height,x+width-r,y+height);
  p.lineTo(x+r,y+height);p.quadraticCurveTo(x,y+height,x,y+height-r);
  p.lineTo(x,y+r);p.quadraticCurveTo(x,y,x+r,y);p.closePath();return p;
}

function makeGrain() {
  const size=256,data=new Uint8Array(size*size*4);let seed=7251;
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const value=Math.round(186+((seed/4294967296)-.5)*24+Math.sin(y*.86)*8),i=(y*size+x)*4;
    data[i]=data[i+1]=data[i+2]=value;data[i+3]=255;
  }
  const texture=new T.DataTexture(data,size,size,T.RGBAFormat);texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.repeat.set(7,2);texture.magFilter=T.LinearFilter;texture.minFilter=T.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;return texture;
}

export function createSculpture(photoTextures, own) {
  const group=new T.Group(),grain=own(makeGrain());
  const bronze=own(new T.MeshPhysicalMaterial({color:0xb18b62,metalness:.86,roughness:.28,roughnessMap:grain,clearcoat:.7,clearcoatRoughness:.16,envMapIntensity:1.35}));
  const shadowMetal=own(new T.MeshStandardMaterial({color:0x252827,metalness:.66,roughness:.32,roughnessMap:grain}));
  const crystal=own(new T.MeshPhysicalMaterial({color:0xf5f5ed,metalness:0,roughness:.065,transmission:.94,thickness:.48,ior:1.46,dispersion:.035,attenuationColor:0xc0d2d1,attenuationDistance:7,clearcoat:1,clearcoatRoughness:.045,envMapIntensity:1.7}));
  const cutEdge=own(new T.MeshPhysicalMaterial({color:0xe6d5b8,metalness:.18,roughness:.1,transmission:.65,thickness:.18,ior:1.5,clearcoat:1,envMapIntensity:2}));
  group.add(new T.Mesh(own(makeRibbon(0,.62,.19)),[cutEdge,crystal]));
  group.add(new T.Mesh(own(makeRibbon(.59,.055,.06)),[shadowMetal,bronze]));
  const frameShape=roundedPath(T.Shape,HELIX.width+.16,HELIX.height+.16,.075);
  frameShape.holes.push(roundedPath(T.Path,HELIX.width-.035,HELIX.height-.035,.024));
  const frameGeometry=own(new T.ExtrudeGeometry(frameShape,{depth:.22,steps:1,bevelEnabled:true,bevelSegments:3,bevelSize:.023,bevelThickness:.025,curveSegments:5}));
  frameGeometry.translate(0,0,-.11);
  const photoGeometry=own(new T.PlaneGeometry(HELIX.width-.02,HELIX.height-.02));
  const backGeometry=own(new T.BoxGeometry(HELIX.width-.012,HELIX.height-.012,.2));
  const glass=own(new T.MeshPhysicalMaterial({color:0xe0dacf,metalness:.12,roughness:.16,transparent:true,opacity:.025,clearcoat:1,clearcoatRoughness:.1,depthWrite:false,envMapIntensity:1.1}));
  const armGeometry=own(new T.CylinderGeometry(.044,.044,1,8));
  const cards=[];
  PHOTOGRAPHS.forEach((id,index)=>{
    const texture=photoTextures.get(id)||null;
    const angle=index*HELIX.step,card=new T.Group();
    card.userData.mediaId=id;card.userData.photoIndex=index;
    card.position.set(Math.sin(angle)*HELIX.radius,HELIX.top-index*HELIX.pitch,Math.cos(angle)*HELIX.radius);card.rotation.y=angle;
    card.add(new T.Mesh(frameGeometry,crystal));card.add(new T.Mesh(backGeometry,shadowMetal));
    const photoMaterial=own(new T.MeshBasicMaterial({map:texture,toneMapped:false,color:texture?0xffffff:0x253531}));
    card.userData.photoMaterial=photoMaterial;
    const photo=new T.Mesh(photoGeometry,photoMaterial);photo.position.z=.14;card.add(photo);
    const reversePhoto=new T.Mesh(photoGeometry,photoMaterial);reversePhoto.position.z=-.14;reversePhoto.rotation.y=Math.PI;card.add(reversePhoto);
    const glaze=new T.Mesh(photoGeometry,glass);glaze.position.z=.145;card.add(glaze);
    group.add(card);cards.push(card);
    const anchor=railPoint(angle),direction=card.position.clone().sub(anchor),arm=new T.Mesh(armGeometry,bronze);
    arm.position.copy(anchor).addScaledVector(direction,.5);arm.scale.y=direction.length();arm.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),direction.normalize());group.add(arm);
  });
  return {group,cards,setTexture(id,texture){
    const card=cards.find(item=>item.userData.mediaId===id);if(!card)return;
    const material=card.userData.photoMaterial,hadMap=!!material.map;
    material.map=texture||null;material.color.set(texture?0xffffff:0x253531);if(hadMap!==!!texture)material.needsUpdate=true;
  }};
}

export function tourIndex(progress) {
  const travel=clamp((progress-.075)/.87,0,1)*(PHOTOGRAPHS.length-1);
  const floor=Math.floor(travel),fraction=travel-floor;
  // Each image has a calm reading interval; the camera travels between them.
  return floor+smooth(.18,.82,fraction);
}

export const progressForPhoto=index=>.075+.87*clamp(index,0,PHOTOGRAPHS.length-1)/(PHOTOGRAPHS.length-1);

export function cameraPose(progress, mobile, aspect=1.78) {
  const enter=smooth(0,.105,progress),exit=smooth(.955,1,progress),index=tourIndex(progress);
  const y=HELIX.top-index*HELIX.pitch;
  const tan=Math.tan(42*Math.PI/360),safeAspect=Math.max(.3,aspect);
  const distance=Math.max(HELIX.width/(2*tan*safeAspect*(mobile?.88:.74)),HELIX.height/(2*tan*.63));
  return {index,rotation:-index*HELIX.step,x:mobile?0:2.1*(1-enter),y,z:HELIX.radius+distance+3.7*(1-enter)+1.8*exit,lookX:0,lookY:y+(mobile?.55:.25),copyOpacity:1-smooth(.005,.065,progress),expansion:enter};
}

export function makeBackdrop(own) {
  const material=own(new T.ShaderMaterial({depthWrite:false,depthTest:false,uniforms:{uTime:{value:0},uProgress:{value:0},uTexture:{value:null},uHasTexture:{value:0},uAspect:{value:1.78},uImageAspect:{value:1.777},uPointer:{value:new T.Vector2()}},vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.999,1.);}',fragmentShader:`
    varying vec2 vUv; uniform float uTime; uniform float uProgress;
    uniform sampler2D uTexture; uniform float uHasTexture; uniform float uAspect; uniform float uImageAspect; uniform vec2 uPointer;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    void main(){
      vec2 uv=vUv; float ratio=uAspect/uImageAspect;
      vec2 crop=ratio>1.?vec2(1.,1./ratio):vec2(ratio,1.);
      vec2 focus=vec2(mix(.5,.65,1.-smoothstep(.7,1.4,uAspect)),.5);
      float approach=1.-.12*uProgress-.012*sin(uTime*.09);
      vec2 sampleUv=focus+(uv-.5)*crop*approach+uPointer*vec2(.006,.004);
      vec3 base=mix(vec3(.011,.016,.018),texture2D(uTexture,clamp(sampleUv,vec2(.001),vec2(.999))).rgb,uHasTexture);
      vec3 light=vec3(0.);
      // Three optical distances move independently, never distorting the photographs.
      for(int i=0;i<3;i++){
        float depth=float(i)+1.;
        vec2 q=(uv-vec2(.65,.38))*vec2(uAspect,1.);
        q+=uPointer*.007/depth;
        float ray=q.x+q.y*(.23+depth*.17)+sin(uTime*(.045+depth*.009)+depth)*.1;
        float veil=exp(-ray*ray*(26.+depth*17.));
        float height=exp(-pow((q.y-.06*sin(uTime*.037+depth))*(1.4+depth*.35),2.));
        light+=mix(vec3(.04,.025,.012),vec3(.008,.026,.035),float(i)*.5)*veil*height/depth;
      }
      base*=mix(.63,.94,smoothstep(.1,.65,uv.x));
      base+=light*.7;
      base*=1.-.16*smoothstep(.4,.95,length((uv-.5)*vec2(.8,1.)));
      base+=(hash(floor(sampleUv*vec2(1672.,941.)))-.5)*.0006;
      gl_FragColor=vec4(base,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`}));
  const mesh=new T.Mesh(own(new T.PlaneGeometry(2,2)),material);mesh.frustumCulled=false;mesh.renderOrder=-100;return mesh;
}
