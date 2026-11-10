// 국토교통부 아파트 매매·전월세 실거래가 수집 (공공데이터포털)
// 사용: node scripts/fetch_molit.mjs  → data/trades.json, data/rents.json
import fs from 'node:fs';
const KEY = process.env.DATA_GO_KR_KEY;
if (!KEY) { console.error('환경변수 DATA_GO_KR_KEY(공공데이터포털 API 키)를 설정하세요.'); process.exit(1); }
const LAWD = '11350'; // 서울 노원구
const TRADE_MONTHS = 25, RENT_MONTHS = 13;
const now = new Date();
function months(n){const a=[];for(let i=0;i<n;i++){const d=new Date(now.getFullYear(),now.getMonth()-i,1);a.push(`${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}`)}return a.reverse();}
const tag=(x,t)=>{const m=x.match(new RegExp(`<${t}>([^<]*)</${t}>`));return m?m[1].trim():''};
async function get(url){for(let i=0;i<4;i++){try{const r=await fetch(url);const t=await r.text();if(t.includes('<resultCode>000</resultCode>')||t.includes('<resultCode>00</resultCode>'))return t;console.warn('retry',t.slice(0,200));}catch(e){console.warn('err',e.message)}await new Promise(r=>setTimeout(r,1500))}throw new Error('fail '+url)}
async function fetchAll(svc,ym){
  let page=1,items=[];
  while(true){
    const url=`https://apis.data.go.kr/1613000/${svc}/get${svc}?serviceKey=${KEY}&LAWD_CD=${LAWD}&DEAL_YMD=${ym}&numOfRows=1000&pageNo=${page}`;
    const x=await get(url);
    const total=+tag(x,'totalCount')||0;
    const its=x.split('<item>').slice(1).map(s=>s.split('</item>')[0]);
    items.push(...its);
    if(page*1000>=total||its.length===0)break; page++;
  }
  return items;
}
const trades=[],rents=[];
for(const ym of months(TRADE_MONTHS)){
  const its=await fetchAll('RTMSDataSvcAptTrade',ym);
  for(const s of its){
    if(tag(s,'cdealType')) continue; // 해제거래 제외
    trades.push({n:tag(s,'aptNm'),u:tag(s,'umdNm'),j:tag(s,'jibun'),
      d:`${tag(s,'dealYear')}-${tag(s,'dealMonth').padStart(2,'0')}-${tag(s,'dealDay').padStart(2,'0')}`,
      p:+tag(s,'dealAmount').replace(/,/g,''),a:+tag(s,'excluUseAr'),f:+tag(s,'floor'),b:+tag(s,'buildYear'),
      g:tag(s,'dealingGbn')==='직거래'?1:0});
  }
  console.log('trade',ym,its.length);
}
for(const ym of months(RENT_MONTHS)){
  const its=await fetchAll('RTMSDataSvcAptRent',ym);
  for(const s of its){
    rents.push({n:tag(s,'aptNm'),u:tag(s,'umdNm'),j:tag(s,'jibun'),r:tag(s,'roadnm'),
      d:`${tag(s,'dealYear')}-${tag(s,'dealMonth').padStart(2,'0')}-${tag(s,'dealDay').padStart(2,'0')}`,
      dep:+tag(s,'deposit').replace(/,/g,''),m:+tag(s,'monthlyRent').replace(/,/g,''),a:+tag(s,'excluUseAr'),f:+tag(s,'floor'),b:+tag(s,'buildYear'),
      c:tag(s,'contractType')});
  }
  console.log('rent',ym,its.length);
}
fs.writeFileSync(new URL('../data/trades.json',import.meta.url),JSON.stringify(trades));
fs.writeFileSync(new URL('../data/rents.json',import.meta.url),JSON.stringify(rents));
console.log('done',trades.length,rents.length);
