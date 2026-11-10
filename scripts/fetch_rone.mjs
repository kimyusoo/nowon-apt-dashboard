// 한국부동산원 R-ONE 통계 수집 → data/rone.json
import fs from 'node:fs';
const KEY = process.env.RONE_KEY;
if (!KEY) { console.error('환경변수 RONE_KEY(한국부동산원 R-ONE API 키)를 설정하세요.'); process.exit(1); }
const BASE='https://www.reb.or.kr/r-one/openapi';
const TABLES={
  wk_sale:{id:'T244183132827305',cyc:'WK',start:'202401'},   // (주) 아파트 매매가격지수
  wk_jeonse:{id:'T247713133046872',cyc:'WK',start:'202401'}, // (주) 아파트 전세가격지수
  wk_supply:{id:'T248163133074619',cyc:'WK',start:'202401'}, // (주) 매매수급동향
  wk_jsupply:{id:'T245423133086632',cyc:'WK',start:'202401'},// (주) 전세수급동향
  mm_sale:{id:'A_2024_00178',cyc:'MM',start:'202201'},       // (월) 매매지수_아파트
  mm_jeonse:{id:'A_2024_00182',cyc:'MM',start:'202201'},     // (월) 전세지수_아파트
  mm_avg:{id:'A_2024_00188',cyc:'MM',start:'202201'},        // (월) 매매 평균가격_아파트
  mm_javg:{id:'A_2024_00192',cyc:'MM',start:'202201'},       // (월) 전세 평균가격_아파트
  mm_conv:{id:'A_2024_00156',cyc:'MM',start:'202201'},       // 전월세 전환율_아파트
  mm_volume:{id:'A_2024_00554',cyc:'MM',start:'202201'},     // (월) 행정구역별 아파트매매거래현황
  mm_buyer:{id:'A_2024_00609',cyc:'MM',start:'202401'},      // (월) 매입자거주지별 아파트매매거래현황
  mm_age:{id:'A_2024_00610',cyc:'MM',start:'202401'},        // (월) 매입자연령대별 아파트매매거래현황
};
const WANT=[/노원구$/,/^서울$/,/동북권$/,/^전국$/,/도봉구$/,/강북구$/];
async function j(url){for(let i=0;i<4;i++){try{const r=await fetch(url);return await r.json()}catch(e){await new Promise(r=>setTimeout(r,1500))}}throw new Error(url)}
const out={};
for(const [k,t] of Object.entries(TABLES)){
  const it=await j(`${BASE}/SttsApiTblItm.do?KEY=${KEY}&Type=json&pIndex=1&pSize=1000&STATBL_ID=${t.id}`);
  const rows=(it.SttsApiTblItm?.[1]?.row)||[];
  const cls=rows.filter(r=>r.ITM_TAG==='분류'&&WANT.some(w=>w.test(r.ITM_FULLNM)));
  // 서울 노원구 우선, 동명이구 방지
  const pick=cls.filter(r=>!/노원구|도봉구|강북구/.test(r.ITM_FULLNM)||r.ITM_FULLNM.startsWith('서울'));
  out[k]={id:t.id,series:{}};
  for(const c of pick){
    let page=1,all=[];
    while(true){
      const d=await j(`${BASE}/SttsApiTblData.do?KEY=${KEY}&Type=json&pIndex=${page}&pSize=1000&STATBL_ID=${t.id}&DTACYCLE_CD=${t.cyc}&CLS_ID=${c.ITM_ID}&START_WRTTIME=${t.start}`);
      const r=d.SttsApiTblData?.[1]?.row||[]; all.push(...r);
      const tot=d.SttsApiTblData?.[0]?.head?.[0]?.list_total_count||0;
      if(page*1000>=tot||!r.length)break; page++;
    }
    const s={};
    for(const r of all){const key=r.ITM_NM+(r.GRP_NM?`|${r.GRP_NM}`:'');(s[key]=s[key]||[]).push([r.WRTTIME_IDTFR_ID,r.WRTTIME_DESC,r.DTA_VAL]);}
    for(const v of Object.values(s))v.sort((a,b)=>a[0]<b[0]?-1:1);
    out[k].series[c.ITM_NM]=s;
    console.log(k,c.ITM_FULLNM,Object.keys(s).length,'items',all.length,'rows');
  }
}
fs.writeFileSync(new URL('../data/rone.json',import.meta.url),JSON.stringify(out));
