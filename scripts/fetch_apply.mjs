// 청약홈 분양정보(공공데이터포털) - 노원구 분양공고 수집 → data/apply.json
import fs from 'node:fs';
const KEY = process.env.DATA_GO_KR_KEY;
if (!KEY) { console.error('환경변수 DATA_GO_KR_KEY(공공데이터포털 API 키)를 설정하세요.'); process.exit(1); }
const out=[];
for(let p=1;p<=8;p++){
  const r=await fetch(`https://api.odcloud.kr/api/ApplyhomeInfoDetailSvc/v1/getAPTLttotPblancDetail?serviceKey=${KEY}&page=${p}&perPage=1000`);
  const d=await r.json(); const rows=d.data||[];
  for(const x of rows) if(/노원구/.test(x.HSSPLY_ADRES||'')) out.push({nm:x.HOUSE_NM,addr:x.HSSPLY_ADRES,pblanc:x.RCRIT_PBLANC_DE,rcpt:x.RCEPT_BGNDE,win:x.PRZWNER_PRESNATN_DE,hh:x.TOT_SUPLY_HSHLDCO,mvn:x.MVN_PREARNGE_YM,cons:x.CNSTRCT_ENTRPS_NM,url:x.PBLANC_URL,se:x.HOUSE_SECD_NM});
  console.log('page',p,rows.length,'nowon',out.length, rows.at(-1)?.RCRIT_PBLANC_DE);
  if(rows.length<1000)break;
}
out.sort((a,b)=>a.pblanc<b.pblanc?1:-1);
fs.writeFileSync(new URL('../data/apply.json',import.meta.url),JSON.stringify(out,null,1));
out.forEach(x=>console.log(x.pblanc,x.nm,x.hh,x.mvn,x.cons));
