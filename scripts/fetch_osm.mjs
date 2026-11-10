// OpenStreetMap(Overpass) - 노원구 경계, 아파트 단지 좌표, 생활 POI 수집 → data/osm_*.json
import fs from 'node:fs';
const B='37.590,127.020,37.710,127.130';
const Q={
  bnd:`rel["boundary"="administrative"](37.60,127.03,37.70,127.12);out geom;`,
  apt:`(way["landuse"="residential"]["name"](${B});relation["landuse"="residential"]["name"](${B});way["building"="apartments"]["name"](${B});way["residential"]["name"](${B}););out center tags;`,
  station:`nwr["railway"="station"](37.55,126.95,37.72,127.15);out center tags;`,
  school:`nwr["amenity"~"^(school|university)$"](${B});out center tags;`,
  shop:`nwr["shop"~"^(supermarket|department_store|mall)$"](${B});out center tags;`,
  cafe:`nwr["amenity"="cafe"](${B});out center tags;`,
  civic:`nwr["amenity"~"^(townhall|police|post_office|library|hospital|community_centre|fire_station)$"](${B});nwr["office"="government"](${B});out center tags;`,
  park:`nwr["leisure"="park"]["name"](${B});out center tags;`,
  bus:`node["highway"="bus_stop"](37.60,127.04,37.70,127.11);out;`,
  landmark:`nwr["name"~"노원구청|은행사거리|을지|백병원|원자력병원|노원구보건소|노원우체국|노원경찰서|노원문화예술회관|창동차량기지|서울과학기술대|광운대학교|삼육대|인덕대|육군사관학교|서울아레나|태릉"](${B});out center tags;`,
};
const SRV=['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter','https://maps.mail.ru/osm/tools/overpass/api/interpreter'];
for(const [k,q] of Object.entries(Q)){
  const f=new URL(`../data/osm_${k}.json`,import.meta.url);
  if(fs.existsSync(f)&&!process.argv.includes('--force')){console.log('skip',k);continue}
  let ok=false;
  for(let i=0;i<9&&!ok;i++){
    const srv=SRV[i%SRV.length];
    try{
      const r=await fetch(srv,{method:'POST',headers:{'User-Agent':'apt-dashboard-builder/1.0','Content-Type':'application/x-www-form-urlencoded'},body:'data='+encodeURIComponent('[out:json][timeout:120];'+q)});
      const t=await r.text();
      if(t.startsWith('{')){const d=JSON.parse(t);fs.writeFileSync(f,JSON.stringify(d.elements));console.log(k,d.elements.length,srv);ok=true}
      else console.log('fail',k,srv,t.slice(0,40));
    }catch(e){console.log('err',k,srv,e.message)}
    if(!ok)await new Promise(r=>setTimeout(r,4000));
  }
}
