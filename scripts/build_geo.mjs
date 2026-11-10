// 노원구 경계/행정동 폴리곤 + 아파트명 ↔ OSM 단지 좌표 매칭 → data/geo.json
import fs from 'node:fs';
const rd=f=>JSON.parse(fs.readFileSync(new URL(`../data/${f}`,import.meta.url)));
const bnd=rd('osm_bnd.json'), osmApt=rd('osm_apt.json');
const trades=rd('trades.json'), rents=rd('rents.json');
// --- 링 조립 ---
function rings(rel){
  const ways=rel.members.filter(m=>m.type==='way'&&m.geometry&&m.role!=='inner').map(m=>m.geometry.map(p=>[p.lat,p.lon]));
  const out=[];const k=p=>p[0].toFixed(7)+','+p[1].toFixed(7);
  while(ways.length){let r=ways.shift();let changed=true;
    while(changed&&k(r[0])!==k(r[r.length-1])){changed=false;
      for(let i=0;i<ways.length;i++){const w=ways[i];
        if(k(w[0])===k(r[r.length-1])){r=r.concat(w.slice(1));}
        else if(k(w[w.length-1])===k(r[r.length-1])){r=r.concat(w.slice(0,-1).reverse());}
        else if(k(w[w.length-1])===k(r[0])){r=w.concat(r.slice(1));}
        else if(k(w[0])===k(r[0])){r=w.slice().reverse().concat(r.slice(1));}
        else continue; ways.splice(i,1);changed=true;break;}}
    out.push(r);}
  return out;
}
const inRing=(pt,r)=>{let c=false;for(let i=0,j=r.length-1;i<r.length;j=i++){const [yi,xi]=r[i],[yj,xj]=r[j];if(((yi>pt[0])!==(yj>pt[0]))&&(pt[1]<(xj-xi)*(pt[0]-yi)/(yj-yi)+xi))c=!c}return c};
const inPoly=(pt,rs)=>rs.some(r=>inRing(pt,r));
const nowonRel=bnd.find(e=>e.tags.name==='노원구'&&e.tags.admin_level==='6');
const nowon=rings(nowonRel);
const dongs=bnd.filter(e=>e.tags.admin_level==='8').map(e=>({name:e.tags.name,rings:rings(e)})).filter(d=>{
  const r=d.rings[0];const c=[r.reduce((s,p)=>s+p[0],0)/r.length,r.reduce((s,p)=>s+p[1],0)/r.length];return inPoly(c,nowon)});
console.log('행정동',dongs.map(d=>d.name).join(','));
const hdong=pt=>(dongs.find(d=>inPoly(pt,d.rings))||{}).name||'';
// --- 이름 정규화 ---
const norm=s=>(s||'').replace(/\(.*?\)/g,m=>/고층|저층|\d차/.test(m)?'':m.replace(/[()]/g,''))
  .replace(/아파트|APT|apt|단지|주상복합|\s|[·.,\-_'"]/g,'').replace(/제(\d)/g,'$1').replace(/(\d+)동$/,'').toUpperCase();
const cand=[];
for(const e of osmApt){
  const nm=e.tags.name;if(!nm||/^[\dA-Za-z가-하]{1,2}동?$|^\d+$/.test(nm))continue;
  const c=e.center||(e.lat?{lat:e.lat,lon:e.lon}:null);if(!c)continue;
  const pt=[c.lat,c.lon];if(!inPoly(pt,nowon))continue;
  cand.push({nm,k:norm(nm.replace(/\s*\d+동$/,'')),pt,lu:!!e.tags.landuse});
}
// 같은 이름 묶기 (landuse 우선, 아니면 평균)
const byK={};for(const c of cand)(byK[c.k]=byK[c.k]||[]).push(c);
const osmIdx=Object.entries(byK).map(([k,a])=>{const lu=a.filter(x=>x.lu);const s=lu.length?lu:a;return{k,nm:a[0].nm,pt:[s.reduce((t,x)=>t+x.pt[0],0)/s.length,s.reduce((t,x)=>t+x.pt[1],0)/s.length]}});
// --- MOLIT 단지 목록 ---
const apts={};
for(const t of trades){const id=`${t.u}|${t.j}|${t.n}`;(apts[id]=apts[id]||{n:t.n,u:t.u,j:t.j,b:t.b,cnt:0}).cnt++;}
for(const t of rents){const id=`${t.u}|${t.j}|${t.n}`;const a=(apts[id]=apts[id]||{n:t.n,u:t.u,j:t.j,b:t.b,cnt:0});a.cnt++;if(t.r)a.r=t.r;}
// 실거래 단지명 → OSM 단지명 별칭 (복합단지·약칭 보정)
const ALIAS={"중계그린1단지":"중계그린","보람아파트":"보람1","한신1":"한신청구","한신2":"한신청구","청구|하계동":"한신청구","시영3차(라이프)아파트":"라이프3","시영2단지(라이프)아파트":"라이프2","포레나노원":"포레나노원1","건영|하계동":"극동건영벽산","극동|하계동":"극동건영벽산","벽산|하계동":"극동건영벽산","성원(사슴4)":"성원4","하계2현대":"하계현대2","상계2차중앙하이츠":"상계중앙하이츠2","상계1차중앙하이츠":"상계중앙하이츠1","상아":"경남롯데상아","경남":"경남롯데상아","롯데(505)":"경남롯데상아","현대|하계동":"현대우성","우성|하계동":"현대우성","동아불암":"불암동아","동아불암(1286-0)":"불암동아","꿈의숲SKVIEW":"꿈의숲SK뷰","한화꿈에그린TheFIRST":"중계2한화꿈에그린더퍼스트","하계1청구":"하계청구","우방아파트":"공릉동우방","한일유앤아이":"상계한일유엔아이","성원상떼빌":"성원쌍떼빌","청구(366)":"라이프청구신동아","라이프":"라이프청구신동아","신동아(366)":"라이프청구신동아","상계1차현대아파트":"상계현대1"};
let hit=0,miss=[];
const bdong=h=>h.replace(/[0-9·본]+동$|동$/,"").replace(/[0-9].*$/,""); // 공릉1동→공릉
for(const o of osmIdx){o.bd=bdong(hdong(o.pt));o.k2=o.k.replace(/([0-9])차/g,"$1");}
const digits=x=>(x.match(/[0-9]+/g)||[]).join(",");
function variants(a){
  const stem=a.u.replace(/동$/,'');const raw=a.n;const vs=new Set();
  const base=raw.replace(/\(([0-9]+|[0-9]+-[0-9]+)\)/g,"");
  const noPar=base.replace(/\(.*?\)/g,"");
  const pars=[...base.matchAll(/\((.*?)\)/g)].map(m=>m[1]).filter(p=>!/고층|저층/.test(p));
  for(const v of [base,noPar,...pars]){const k=norm(v).replace(/([0-9])차/g,'$1');if(!k)continue;vs.add(k);vs.add(norm(stem)+k);vs.add(k.replace(new RegExp('^'+stem+'(동)?'),''));}
  return [...vs].filter(v=>v.length>=2);
}
for(const a of Object.values(apts)){
  const stem0=a.u.replace(/동$/,'');const pool=osmIdx.filter(o=>o.bd===stem0&&o.k2!==stem0&&o.k2!==stem0+"동");
  const vs=variants(a);let m=null;const al=ALIAS[a.n+"|"+a.u]||ALIAS[a.n];if(al)m=osmIdx.find(o=>o.k2===al.replace(/([0-9])차/g,"$1"));
  if(!m)for(const v of vs){m=pool.find(o=>o.k2===v);if(m)break;}
  if(!m&&!al){let best=null,bs=0;for(const v of vs){if(v.length<4||new RegExp("^"+stem0+"[0-9]*$").test(v))continue;for(const o of pool){if(o.k2.length<4)continue;if(!(o.k2.includes(v)||v.includes(o.k2)))continue;if(digits(o.k2)!==digits(v))continue;const sc=Math.min(o.k2.length,v.length);if(sc>bs){bs=sc;best=o}}}m=best;}
  if(m){a.lat=+m.pt[0].toFixed(6);a.lng=+m.pt[1].toFixed(6);a.osm=m.nm;a.h=hdong(m.pt);hit++}else miss.push(a);
}
// 근사 위치: 같은 법정동, 본번이 가장 가까운 매칭 단지 (±6)
const mainNo=j=>parseInt((j||'').split('-')[0])||-999;
for(const a of miss){const ref=Object.values(apts).filter(b=>b.lat&&!b.approx&&b.u===a.u).sort((x,y)=>Math.abs(mainNo(x.j)-mainNo(a.j))-Math.abs(mainNo(y.j)-mainNo(a.j)))[0];
  if(ref&&Math.abs(mainNo(ref.j)-mainNo(a.j))<=6){a.lat=ref.lat;a.lng=ref.lng;a.h=ref.h;a.approx=1;a.near=ref.n}}
miss.sort((x,y)=>y.cnt-x.cnt);
console.log('단지',Object.keys(apts).length,'매칭',hit,'미매칭',miss.length,'미매칭 거래비중',(miss.reduce((s,a)=>s+a.cnt,0)/Object.values(apts).reduce((s,a)=>s+a.cnt,0)*100).toFixed(1)+'%');
console.log('미매칭 상위:',miss.slice(0,70).map(a=>`${a.n}(${a.u} ${a.j},${a.cnt})`).join(' / '));
fs.writeFileSync(new URL('../data/geo.json',import.meta.url),JSON.stringify({nowon:nowon.map(r=>r.map(p=>[+p[0].toFixed(5),+p[1].toFixed(5)])),dongs:dongs.map(d=>({name:d.name,rings:d.rings.map(r=>r.map(p=>[+p[0].toFixed(5),+p[1].toFixed(5)]))})),apts}));
fs.writeFileSync(new URL('../data/osm_names.txt',import.meta.url),osmIdx.map(o=>o.k+'\t'+o.nm+'\t'+o.pt.map(v=>v.toFixed(5)).join(',')).join('\n'));
