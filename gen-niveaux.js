// Flèchemania – génération HORS LIGNE des 15 niveaux -> niveaux.json
// Méthode : « épluchage » d'une surface pleine. On construit les flèches dans l'ORDRE DE SORTIE :
// la flèche n°k a sa pointe sur une case libre et sa trajectoire de sortie (tout droit, virages, portails,
// jusqu'à une arête extérieure, jamais un mur) ne traverse QUE des cases déjà prises par les flèches 0..k-1
// (sorties avant elle) ou des tuiles spéciales. Son corps serpente sur des cases libres.
// => l'ordre 0,1,2,… vide toujours la forme, et on remplit ~100 % de la surface.
const fs=typeof require=='function'?require('fs'):null;
// formes : cube, L, esc (escalier), pyr (pyramide en escalier), croix (croix 3D), tunnel (cube troué), anneau (cadre), etoile (croix épaisse à 6 branches)
function inShape(s,k){const m=(k-1)/2,b=Math.max(1,Math.round(k/6)),band=v=>Math.abs(v-m)<=b+.01,hole=Math.max(1,Math.round(k/5));
 if(s=='cube')return()=>true;if(s=='L')return(x,y)=>!(x>=k/2&&y>=k/2);if(s=='esc')return(x,y)=>y<k-x;
 if(s=='pyr')return(x,y,z)=>{const r=Math.max(Math.abs(x-m),Math.abs(z-m));return y<k-2*Math.floor(r)-(k%2?0:1)||y==0};
 if(s=='croix'){const B=v=>Math.abs(v-m)<=k/5+.01;return(x,y,z)=>(B(x)+B(y)+B(z))>=2}
 if(s=='etoile')return(x,y,z)=>{const c=Math.abs(x-m)<=b+1&&Math.abs(y-m)<=b+1&&Math.abs(z-m)<=b+1;return c||(band(x)+band(y)+band(z))>=2};
 if(s=='tunnel')return(x,y)=>!(Math.abs(x-m)<hole+.01&&Math.abs(y-m)<hole+.01);
 if(s=='anneau')return(x,y,z)=>!(Math.abs(x-m)<hole+.51&&Math.abs(y-m)<hole+.51)&&Math.abs(z-m)<=Math.max(1.5,k/4);
 return()=>true}
const N=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
const ni=v=>v[0]?(v[0]>0?0:1):v[1]?(v[1]>0?2:3):(v[2]>0?4:5);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const turn=(n,d,s)=>{const c=cross(N[n],N[d]);return ni(s>0?c:c.map(x=>-x))};
function rng(s){return()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function geom(L){const k=L.k,sub=L.sub||1,K=k*sub,sol=new Uint8Array(K*K*K);
 const inC=inShape(L.s,k);
 for(let x=0;x<K;x++)for(let y=0;y<K;y++)for(let z=0;z<K;z++)if(inC(x/sub|0,y/sub|0,z/sub|0))sol[(x*K+y)*K+z]=1;
 const solid=(x,y,z)=>x>=0&&y>=0&&z>=0&&x<K&&y<K&&z<K&&sol[(x*K+y)*K+z]==1;
 const cells=[],map=new Map(),key=(x,y,z,n)=>((x*K+y)*K+z)*6+n;
 for(let x=0;x<K;x++)for(let y=0;y<K;y++)for(let z=0;z<K;z++)if(solid(x,y,z))for(let n=0;n<6;n++){const d=N[n];if(!solid(x+d[0],y+d[1],z+d[2])){map.set(key(x,y,z,n),cells.length);cells.push({v:[x,y,z],n})}}
 const cid=(v,n)=>map.get(key(v[0],v[1],v[2],n));
 function step(c,di){const C=cells[c],v=C.v,D=N[di],M=N[C.n];
  const a=[v[0]+D[0]+M[0],v[1]+D[1]+M[1],v[2]+D[2]+M[2]];if(solid(...a))return{id:cid(a,di^1),d:C.n,concave:true};
  const b=[v[0]+D[0],v[1]+D[1],v[2]+D[2]];if(solid(...b))return{id:cid(b,C.n),d:di};
  return{id:cid(v,di),d:C.n^1,convex:true}}
 const tang=n=>[0,1,2,3,4,5].filter(d=>(d>>1)!=(n>>1));
 return{K,cells,step,tang,nbrs:c=>tang(cells[c].n).map(d=>step(c,d).id)}}
function make(L,seed){const G=geom(L),{cells,step,tang,nbrs}=G,n=cells.length,R=rng(seed),pick=a=>a[R()*a.length|0];
 const red=new Int8Array(n),por=new Map(),special=c=>red[c]||por.has(c);
 const flat=c=>tang(cells[c].n).every(d=>{const s=step(c,d);return!s.convex&&!s.concave});
 const freeSpot=c=>!special(c)&&flat(c)&&nbrs(c).every(x=>!special(x)&&flat(x));
 function ray(h,d){let cur=h,dir=d;const out=[],seen=new Set();
  for(let i=0;i<4000;i++){const r=step(cur,dir);if(r.convex)return{cells:out,dir,ok:true};if(r.concave)return{ok:false};
   let c=r.id;dir=r.d;out.push(c);if(red[c])dir=red[c]-1;else if(por.has(c)){const p=por.get(c);c=p.to;dir=por.get(c).dir;out.push(c)}
   const sk=c*6+dir;if(seen.has(sk))return{ok:false};seen.add(sk);cur=c}return{ok:false}}
 const redL=[],porL=[];
 for(let t=0;redL.length<(L.r||0)&&t<2000;t++){const c=R()*n|0;if(freeSpot(c)){const tg=tang(cells[c].n).filter(d=>ray(c,d).ok);if(tg.length){red[c]=tg[R()*tg.length|0]+1;redL.push(c)}}}
 for(let t=0;porL.length<(L.p||0)&&t<5000;t++){const a=R()*n|0,b=R()*n|0;if(a==b||cells[a].n==cells[b].n||!freeSpot(a)||!freeSpot(b))continue;
  const da=pick(tang(cells[a].n)),db=pick(tang(cells[b].n));por.set(a,{to:b,dir:da,col:porL.length});por.set(b,{to:a,dir:db,col:porL.length});
  if(!ray(a,da).ok||!ray(b,db).ok){por.delete(a);por.delete(b);continue}porL.push([a,b])}
 const asg=new Int32Array(n).fill(-1),arrows=[],wave=[],freeFace=new Map();let nFree=0;
 const isFreeCell=c=>asg[c]<0&&!special(c);
 const freeNb=c=>nbrs(c).filter(isFreeCell).length;
 function walk(h,d,len){const out=[h];const s1=step(h,d^1);if(!isFreeCell(s1.id))return null;out.push(s1.id);let cur=s1.id,b=s1.d,run=1;
  while(out.length<len){let best=null,bs=-1e9;for(const o of[b,turn(cells[cur].n,b,1),turn(cells[cur].n,b,-1)]){const s=step(cur,o);if(!isFreeCell(s.id)||out.includes(s.id))continue;
    const straight=o===b;const sc=-freeNb(s.id)*.9+R()*1.6+(straight?(run<(L.run||4)?.9:-1.2):0);if(sc>bs){bs=sc;best=[s,straight]}}
   if(!best)break;out.push(best[0].id);cur=best[0].id;b=best[0].d;run=best[1]?run+1:1}
  return{body:out.reverse(),tailDir:b}}
 const lo=L.len[0],hi=L.len[1];
 for(let it=0;it<5000;it++){const cand=[];
  for(let h=0;h<n;h++){if(!isFreeCell(h))continue;for(const d of tang(cells[h].n)){const r=ray(h,d);if(!r.ok)continue;let okc=true,rl=0,w=0,sp=0;
    for(const c of r.cells){if(special(c)){sp++;continue}if(asg[c]<0||c==h){okc=false;break}rl++;w=Math.max(w,wave[asg[c]])}
    if(okc)cand.push({h,d,rl,w:w+1,sp,face:cells[h].n})}}
  if(!cand.length)break;
  const needFree=nFree<(L.minFree||3);let pool=needFree?cand.filter(c=>c.rl==0&&!(freeFace.get(c.face)>0)):cand.filter(c=>c.rl>0);
  if(!pool.length)pool=needFree?cand.filter(c=>c.rl==0):[];if(!pool.length)pool=cand;
  pool.forEach(c=>c.sc=c.w*3+Math.min(c.rl,8)*.6+c.sp*6*(arrows.length<40?1:0)-freeNb(c.h)*.7+R()*2.5);pool.sort((a,b)=>b.sc-a.sc);
  let done=false;for(const c of pool.slice(0,40)){const wk=walk(c.h,c.d,lo+(R()*(hi-lo+1)|0));if(!wk||wk.body.length<2)continue;
   const id=arrows.length,a={b:wk.body,e0:c.d,dbl:0,l:-1,c:-1,key:0,ice:0};
   if(R()<(L.dbl||0)){const rB=ray(wk.body[0],wk.tailDir);if(rB.ok&&!rB.cells.some(x=>wk.body.includes(x))){a.dbl=1;a.e1=wk.tailDir}}
   wk.body.forEach(x=>asg[x]=id);arrows.push(a);wave.push(c.w);if(c.rl==0&&!c.sp){nFree++;freeFace.set(c.face,(freeFace.get(c.face)||0)+1)}done=true;break}
  if(!done){// plus aucune pointe possible avec un corps ≥ 2 : on s'arrête
   break}}
 // trous restants : on les rattache à la QUEUE d'une flèche voisine (aucune trajectoire ne passe par une case jamais prise)
 for(let ch=true;ch;){ch=false;for(let c=0;c<n;c++){if(!isFreeCell(c))continue;for(const a of arrows){if(a.dbl)continue;const t=a.b[0];if(nbrs(t).includes(c)&&!a.b.includes(c)){const dd=tang(cells[t].n).find(d=>step(t,d).id==c);if(dd==null)continue;a.b.unshift(c);asg[c]=arrows.indexOf(a);ch=true;break}}}}
 // cadenas : la clé sort AVANT (indice plus petit) ; glace : assez de voisines qui sortent avant
 const nbA=arrows.map((a,i)=>{const s=new Set();a.b.forEach(c=>nbrs(c).forEach(x=>{if(asg[x]>=0&&asg[x]!==i)s.add(asg[x])}));return[...s]});
 for(let p=0;p<(L.lock||0);p++){const cs=arrows.map((a,i)=>i).filter(i=>i>arrows.length*.3&&arrows[i].c<0);if(!cs.length)break;const l=pick(cs);const ks=arrows.map((a,i)=>i).filter(i=>i<l&&i>l-60&&arrows[i].c<0);if(!ks.length)continue;const k=pick(ks);arrows[l].l=k;arrows[l].c=p;arrows[k].c=p;arrows[k].key=1}
 for(let p=0;p<(L.ice||0);p++){const cs=arrows.map((a,i)=>i).filter(i=>arrows[i].c<0&&!arrows[i].ice&&nbA[i].filter(j=>j<i).length>=1);if(!cs.length)break;const f=pick(cs);arrows[f].ice=nbA[f].filter(j=>j<f).length>=2&&R()<.45?2:1}
 // redirecteur que nulle trajectoire ne traverse : retiré (aucune trajectoire ne change)
 {const pass=new Set();for(const a of arrows){for(const [h,d] of[[a.b.at(-1),a.e0],...(a.dbl?[[a.b[0],a.e1]]:[])]){const r=ray(h,d);if(r.cells)r.cells.forEach(c=>pass.add(c))}}
  for(let i=redL.length-1;i>=0;i--)if(!pass.has(redL[i])&&redL.length>1){red[redL[i]]=0;redL.splice(i,1)}}
 const covered=arrows.reduce((s,a)=>s+a.b.length,0),usable=n-redL.length-porL.length*2;
 const used=redL.every(rc=>arrows.some(a=>{const r=ray(a.b.at(-1),a.e0);return r.ok&&r.cells.includes(rc)}))&&porL.every(([x])=>arrows.some(a=>{const r=ray(a.b.at(-1),a.e0);return r.ok&&r.cells.includes(x)}));
 // nombre de vagues (tours où l'on sort toutes les flèches jouables) – mesure de profondeur
 const own=new Int32Array(n).fill(-1);arrows.forEach((a,i)=>a.b.forEach(c=>own[c]=i));const paths=arrows.map(a=>(a.dbl?[[a.b.at(-1),a.e0],[a.b[0],a.e1]]:[[a.b.at(-1),a.e0]]).map(([h,d])=>ray(h,d).cells||[]));
 const al=arrows.map(()=>true),ic=arrows.map(a=>a.ice);let rounds=0,left=arrows.length;
 while(left){const f=arrows.map((a,i)=>i).filter(i=>al[i]&&!ic[i]&&!(arrows[i].l>=0&&al[arrows[i].l])&&paths[i].some(p=>p.every(c=>own[c]<0||own[c]==i)));if(!f.length){rounds=-1;break}rounds++;
  for(const i of f){al[i]=false;left--;arrows[i].b.forEach(c=>own[c]=-1);nbA[i].forEach(j=>{if(al[j]&&ic[j])ic[j]--})}}
 return{rounds,L,arrows,red:redL.map(c=>[c,red[c]-1]),por:porL.map(([a,b])=>[a,b,por.get(a).dir,por.get(b).dir]),cells:n,cov:covered/usable,nFree,used,maxWave:Math.max(...wave)}}
const LV=[
 {s:'cube',k:6,len:[3,8],run:4},
 {s:'esc',k:7,len:[3,6],run:4},
 {s:'cube',k:7,len:[3,9],run:4},
 {s:'L',k:8,len:[4,10],run:5},
 {s:'cube',k:8,len:[4,10],run:5,r:1},
 {s:'esc',k:9,len:[3,7],run:5,r:2},
 {s:'cube',k:9,len:[4,11],run:5,r:2,lock:1},
 {s:'esc',k:10,len:[3,7],run:5,r:2,lock:2,p:1},
 {s:'L',k:10,len:[3,9],run:5,r:2,lock:2,p:1,dbl:.12},
 {s:'cube',k:10,len:[4,11],run:6,r:3,lock:2,p:1,dbl:.1,ice:3},
 {s:'esc',k:11,len:[3,7],run:6,r:3,lock:3,p:2,dbl:.1,ice:4},
 {s:'cube',k:11,len:[4,12],run:6,r:4,lock:3,p:2,dbl:.1,ice:5},
 {s:'esc',k:12,len:[4,9],run:6,r:4,lock:3,p:2,dbl:.1,ice:6},
 {s:'L',k:12,len:[3,9],run:6,r:5,lock:4,p:2,dbl:.1,ice:8},
 {s:'cube',k:12,len:[3,6],run:6,r:6,lock:4,p:3,dbl:.1,ice:10}];
if(typeof module!='undefined'&&module.exports)module.exports={make,geom,LV,inShape};else self.FCGEN={make,geom,inShape};
if(typeof require=='function'&&typeof module!='undefined'&&require.main===module){let prev=null;const out=[];const only=process.argv[2]?process.argv[2].split(',').map(Number):null;
 LV.forEach((L,i)=>{if(only&&!only.includes(i+1))return;let best=null;const T=+process.env.TRIES||12;
  for(let t=0;t<T;t++){const dl=[0,-1,1,-2,2][t%5],g=make({...L,len:[Math.max(2,L.len[0]+(dl<0?-1:dl>0?1:0)),Math.max(3,L.len[1]+dl)]},(i+1)*1009+t*7919);if(!g.used||g.rounds<1)continue;const mono=!prev||(g.arrows.length>prev.n&&g.rounds>=prev.r);const sc=(mono?100:0)+g.cov*10-(prev?Math.abs(g.arrows.length-prev.n-6)*.08+Math.abs(g.rounds-prev.r-4)*.05:0)-g.nFree*.05;if(!best||sc>best.sc)best={...g,sc,seed:t}}
  prev={n:best.arrows.length,r:best.rounds};
  console.log(i+1,L.s,L.k,{fleches:best.arrows.length,cases:best.cells,couverture:(best.cov*100).toFixed(1)+'%',libres:best.nFree,vagues:best.rounds});
  out.push({s:L.s,k:L.k,sub:L.sub||1,red:best.red,por:best.por,arrows:best.arrows.map(a=>{const o={b:a.b,e:a.dbl?[a.e0,a.e1]:[a.e0]};if(a.l>=0)o.l=a.l;if(a.c>=0)o.c=a.c;if(a.key)o.k=1;if(a.ice)o.i=a.ice;return o})})});
 if(!only)fs.writeFileSync(__dirname+'/niveaux.json',JSON.stringify({v:2,niveaux:out}))}
