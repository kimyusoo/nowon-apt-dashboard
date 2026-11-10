# 홍길동부동산 · 노원구 아파트 브리핑 대시보드

서울 노원구 아파트 시장을 고객에게 브리핑하기 위한 1페이지 대시보드입니다.

**바로 보기:** https://kimyusoo.github.io/nowon-apt-dashboard/

## 주요 기능
- 법정동(상계·중계·하계·공릉·월계) / 행정동 선택, 동별 아파트 리스트
- 주간·월간 집계, 기간 프리셋(1개월~2년) 및 날짜 직접 지정
- 노원구 아파트 TOP 10 (매매·전세·월세, 거래량순/3.3㎡당 가격순) + 지도·최근 실거래
- 추천 매물(샘플 4건 + 브라우저에 직접 추가)
- 입지 분석: 교통(지하철·버스·KTX/SRT·GTX-C), 학군(초·중·고·학원가), 상권(백화점·마트·카페·공원), 관공서·병원, 주변 개발계획
- 한국부동산원 주간 매매·전세 가격지수, 매수우위지수, 월간 거래량, 전월세 전환율
- 청약홈 노원구 분양공고

## 데이터 출처
국토교통부 아파트 매매·전월세 실거래가(공공데이터포털), 한국부동산원 R-ONE, 청약홈 분양정보, © OpenStreetMap contributors.
실거래는 계약 후 30일 이내 신고되므로 최근 2~4주 수치는 늘어날 수 있습니다. 개발계획은 공개 자료 요약으로 일정·규모가 바뀔 수 있습니다. 추천 매물 4건은 예시입니다.

## 데이터 업데이트 (Node.js 18+)
API 키는 저장소에 넣지 말고 환경변수로 지정합니다.

```powershell
$env:DATA_GO_KR_KEY = "공공데이터포털 인증키"
$env:RONE_KEY = "한국부동산원 R-ONE 인증키"
node scripts/fetch_molit.mjs      # 매매·전월세 실거래가
node scripts/fetch_rone.mjs       # 부동산원 지수·거래량·전환율
node scripts/fetch_apply.mjs      # 청약홈 분양공고
node scripts/fetch_osm.mjs        # 경계·단지 좌표·생활시설 (처음 1회, 다시 받으려면 --force)
node scripts/build_geo.mjs        # 단지명 ↔ 좌표 매칭
node scripts/build_dashboard.mjs  # index.html 재생성
```

로컬 미리보기: `node scripts/serve.mjs` → http://localhost:5178/

## 수정 위치
- 화면·추천매물 샘플(SAMPLE)·개발계획(DEV)·상호/전화: `src/template.html`
