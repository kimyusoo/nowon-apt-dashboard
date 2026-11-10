// 수집 데이터 → 대시보드 HTML 한 파일로 결합
// 사용: node scripts/build_dashboard.mjs  → 노원구_부동산_대시보드.html
import fs from 'node:fs';
const P = f => new URL(`../${f}`, import.meta.url);
const rd = f => JSON.parse(fs.readFileSync(P('data/' + f)));
const rdo = (f, d = []) => fs.existsSync(P('data/' + f)) ? rd(f) : d;
const geo = rd('geo.json'), trades = rd('trades.json'), rents = rd('rents.json'), rone = rd('rone.json'), apply = rdo('apply.json');
const BASE = Date.UTC(2020, 0, 1) / 864e5;
const day = s => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / 864e5 - BASE;

// ---- 단지 ----
const stripApt = s => s.replace(/아파트$/, '').replace(/\s+\d+동$/, '').trim();
const nk = s => s.replace(/\s|\(.*?\)|단지|아파트|차|고층|저층/g, '');
// 같은 단지(고층/저층, 동별 분리 표기 등)는 하나로 병합: 법정동 + 괄호 제거 명칭 + 좌표
const groupOf = {}, keys = [];
for (const [k, a] of Object.entries(geo.apts).sort((x, y) => y[1].cnt - x[1].cnt)) {
  const g = `${a.u}|${nk(a.n)}|${a.lat || ''}|${a.lng || ''}`;
  if (!(g in groupOf)) { groupOf[g] = keys.length; keys.push(k); }
  groupOf['k:' + k] = groupOf[g];
}
const idx = {}; for (const k of Object.keys(geo.apts)) idx[k] = groupOf['k:' + k];
const apts = keys.map(k => {
  const a = geo.apts[k]; const stem = a.u.replace(/동$/, '');
  let disp = a.n.replace(/\((\d+|\d+-\d+|\d+-0|고층|저층|고층,.*?)\)$/, '').replace(/\(\d+동\)$/, '').replace(/아파트$/, '');
  if (a.osm && !a.approx) { const o = stripApt(a.osm); if (o.startsWith(stem) && nk(o).includes(nk(disp))) disp = o; }
  // 짧은 단지명(예: 청구3, 보람)은 동 이름을 앞에 붙여 브리핑 시 구분
  if (!disp.startsWith(stem) && !/노원|수락|불암|태릉|광운|초안|공릉|월계|상계|중계|하계/.test(disp) && disp.length <= 6) disp = `${stem} ${disp}`;
  return { n: disp, raw: a.n, u: a.u, h: a.h || '', j: a.j, b: a.b, lat: a.lat || null, lng: a.lng || null, ap: a.approx ? 1 : 0, r: a.r || '' };
});
const cnt = {}; apts.forEach(a => cnt[a.u + a.n] = (cnt[a.u + a.n] || 0) + 1);
apts.forEach(a => { if (cnt[a.u + a.n] > 1) a.n += `(${a.j})`; });
const T = []; for (const t of trades) { const i = idx[`${t.u}|${t.j}|${t.n}`]; T.push(i, day(t.d), t.p, Math.round(t.a * 100), t.f); }
const R = []; for (const t of rents) { const i = idx[`${t.u}|${t.j}|${t.n}`]; R.push(i, day(t.d), t.dep, t.m, Math.round(t.a * 100), t.f, t.c === '신규' ? 1 : t.c === '갱신' ? 2 : 0); }

// ---- 한국부동산원 ----
const ser = (tb, cls, item) => { const s = rone[tb]?.series?.[cls]; if (!s) return null; const v = item ? s[item] : Object.values(s)[0]; return v ? v.map(r => [r[0], r[1], +(+r[2]).toFixed(3)]) : null; };
const RONE = {
  wk: {
    sale: { 노원구: ser('wk_sale', '노원구'), 서울: ser('wk_sale', '서울'), 동북권: ser('wk_sale', '동북권'), 도봉구: ser('wk_sale', '도봉구'), 강북구: ser('wk_sale', '강북구') },
    jeonse: { 노원구: ser('wk_jeonse', '노원구'), 서울: ser('wk_jeonse', '서울'), 동북권: ser('wk_jeonse', '동북권'), 도봉구: ser('wk_jeonse', '도봉구'), 강북구: ser('wk_jeonse', '강북구') },
    supply: { 서울: ser('wk_supply', '서울'), 동북권: ser('wk_supply', '동북권') },
    jsupply: { 서울: ser('wk_jsupply', '서울'), 동북권: ser('wk_jsupply', '동북권') },
  },
  mm: {
    volume: { 노원구: ser('mm_volume', '노원구', '동(호)수'), 서울: ser('mm_volume', '서울', '동(호)수'), 도봉구: ser('mm_volume', '도봉구', '동(호)수'), 강북구: ser('mm_volume', '강북구', '동(호)수') },
    conv: { 노원구: ser('mm_conv', '노원구'), 서울: ser('mm_conv', '서울') },
  },
};

// ---- 생활 POI (OpenStreetMap) ----
const pt = e => e.center ? [e.center.lat, e.center.lon] : [e.lat, e.lon];
const r5 = v => +v.toFixed(5);
const LINES = { '불암산': ['4'], '상계': ['4'], '노원': ['4', '7'], '창동': ['1', '4'], '수락산': ['7'], '마들': ['7'], '중계': ['7'], '하계': ['7'], '공릉': ['7'], '태릉입구': ['6', '7'], '화랑대': ['6'], '봉화산': ['6'], '먹골': ['7'], '월계': ['1'], '광운대': ['1', '경춘'], '석계': ['1', '6'], '녹천': ['1'], '신내': ['6', '경춘'], '도봉산': ['1', '7'], '장암': ['7'], '별내': ['8', '경춘'], '갈매': ['경춘'], '별내별가람': ['4'], '중화': ['7'], '신이문': ['1'], '돌곶이': ['6'], '상봉': ['7', '경의중앙', '경춘'], '방학': ['1'], '도봉': ['1'], '쌍문': ['4'], '수유': ['4'], '외대앞': ['1'], '회기': ['1', '경의중앙'], '청량리': ['1', '경의중앙', '수인분당', '경춘', 'KTX-이음'], '서울': ['1', '4', '공항', 'KTX'], '상월곡': ['6'], '중랑': ['경의중앙', '경춘'], '망우': ['경의중앙', '경춘'] };
const stMap = {};
for (const e of rdo('osm_station.json')) { const n = (e.tags.name || '').replace(/역$/, ''); if (!n || !LINES[n]) continue; (stMap[n] = stMap[n] || []).push(pt(e)); }
const avg = (ps, i) => r5(ps.reduce((s, p) => s + p[i], 0) / ps.length);
const stations = Object.entries(stMap).map(([n, ps]) => [n + '역', avg(ps, 0), avg(ps, 1), LINES[n]]);
stations.push(['수서역', 37.48727, 127.10141, ['3', '수인분당', 'SRT']]);

const schools = [];
for (const e of rdo('osm_school.json')) {
  const n = e.tags.name || '';
  const t = /초등학?교$/.test(n) ? 'e' : /중학교$/.test(n) ? 'm' : /고등학교$/.test(n) ? 'h' : (/대학교$/.test(n) && !/대학원|사이버/.test(n)) ? 'u' : null;
  if (!t) continue; const p = pt(e);
  if (!schools.some(s => s[0] === n && Math.abs(s[2] - p[0]) < 0.004)) schools.push([n.replace(/초등교$/, '초등학교'), t, r5(p[0]), r5(p[1])]);
}
const shops = [];
for (const e of rdo('osm_shop.json')) {
  let n = e.tags.name || e.tags.brand || ''; if (!n) continue; n = n.replace(/^Homeplus/i, '홈플러스'); const s = e.tags.shop;
  let t = null;
  if (n === '현대') n = '현대백화점';
  if (/백화점|아울렛|세이브존|플라자|몰$/.test(n)) t = 'dept';
  else if (/(이마트|홈플러스|롯데마트|코스트코|트레이더스|하나로마트|하나로클럽)/.test(n) && !/에브리데이|익스프레스|24|슈퍼|케이마트/.test(n)) t = 'mart';
  else if (s === 'department_store') t = 'dept';
  else if (/에브리데이|익스프레스|롯데슈퍼|롯데수퍼|롯데프레시|GS더프레시/.test(n)) t = 'ssm';
  if (!t) continue; const p = pt(e);
  // 같은 시설 중복(건물·포인트 이중 등록) 제거: 같은 유형·브랜드, 350m 이내
  const brand = n.replace(/\s.*$/, '').replace(/점$/, '');
  const dup = shops.find(s => s[1] === t && s[0].replace(/\s.*$/, '').replace(/점$/, '') === brand && Math.hypot((s[2] - p[0]) * 111000, (s[3] - p[1]) * 88000) < 350);
  if (dup) { if (n.length > dup[0].length) dup[0] = n; continue; }
  shops.push([n, t, r5(p[0]), r5(p[1])]);
}
const cafes = rdo('osm_cafe.json').filter(e => e.tags.name || e.tags.brand).map(e => { const p = pt(e); return [(e.tags.brand || e.tags.name).replace(/^Starbucks$/i, '스타벅스'), r5(p[0]), r5(p[1])]; });
const civ = [];
for (const e of rdo('osm_civic.json')) {
  const n = e.tags.name || ''; if (!n || /관리사무소|undefined|사거리/.test(n)) continue; const a = e.tags.amenity || '';
  const t = /구청$/.test(n) ? 'gu' : /주민센터|행정복지센터/.test(n) ? 'dong' : (a === 'hospital' || /병원$/.test(n)) ? 'hosp' : (a === 'library' || /도서관/.test(n)) ? 'lib' : (a === 'police' || /경찰서|지구대|파출소/.test(n)) ? 'police' : (a === 'post_office' || /우체국/.test(n)) ? 'post' : /법원|검찰청|세무서|교육지원청/.test(n) ? 'gov' : null;
  if (!t) continue; const p = pt(e); if (!civ.some(c => c[0] === n)) civ.push([n, t, r5(p[0]), r5(p[1])]);
}
// OSM 랜드마크(노원구청·종합병원) 좌표 보강
const lm = rdo('osm_landmark.json');
const lmPt = (re, filt = () => true) => { const e = lm.find(x => re.test(x.tags.name || '') && filt(x)); return e ? pt(e).map(r5) : null; };
const guPt = lmPt(/^노원구청$/, x => x.tags.amenity === 'townhall') || [37.65433, 127.05637];
if (!civ.some(c => c[0] === '노원구청')) civ.push(['노원구청', 'gu', ...guPt]);
for (const [n, p] of [['노원을지대학교병원', [37.6367, 127.0697]], ['원자력병원', [37.6283, 127.0821]], ['인제대 상계백병원', [37.6485, 127.0630]]]) civ.push([n, 'hosp', ...p]);
const parks = rdo('osm_park.json').filter(e => /공원|숲|정원/.test(e.tags.name || '')).map(e => { const p = pt(e); return [e.tags.name, r5(p[0]), r5(p[1])]; });
const bus = rdo('osm_bus.json').filter(e => e.lat).map(e => [e.tags?.name || '', r5(e.lat), r5(e.lon), e.tags?.route_ref || '']);

const DATA = { gen: new Date().toISOString().slice(0, 10), base: BASE, apts, T, R, RONE, apply, geo: { nowon: geo.nowon, dongs: geo.dongs }, poi: { stations, schools, shops, cafes, civ, parks, bus } };
const json = JSON.stringify(DATA);
const tpl = fs.readFileSync(P('src/template.html'), 'utf8');
const html = tpl.replace('/*__DATA__*/null', () => json);
fs.writeFileSync(P('노원구_부동산_대시보드.html'), html);
fs.writeFileSync(P('index.html'), html); // GitHub Pages 용
console.log('apts', apts.length, 'T', T.length / 5, 'R', R.length / 7, 'stations', stations.length, 'schools', schools.length, 'shops', shops.length, 'cafes', cafes.length, 'civ', civ.length, 'parks', parks.length, 'bus', bus.length, 'size', (json.length / 1e6).toFixed(2) + 'MB');
if (process.argv.includes('--dump')) { console.log(shops.map(x => x[0] + ':' + x[1]).join(', ')); console.log(civ.map(x => x[0] + ':' + x[1]).join(', ')); console.log(stations.map(x => x[0]).join(',')); console.log(apts.slice(0, 60).map(a => a.n).join(', ')); }
