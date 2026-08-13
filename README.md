# PiggyOn — 철도 슬롯 편성 (프론트엔드)

운영자가 주문을 **편성 가능 / 확인 필요 / 불가**로 판정하고, 불가한 주문에 대해
무엇을 바꾸면 다시 검토할 수 있는지 보여주는 화면 3개.

> 모든 운영 수치는 `DEMO_ASSUMPTION` 목업이다. 실제 운행 가능성이나 운영 성과의
> 근거로 사용하지 않는다.

판정·편성·검증은 전부 백엔드가 한다. 이 저장소는 그 결과를 그리기만 하며, 계산을
재현하거나 보정하지 않는다.

## 실행

백엔드가 먼저 떠 있어야 한다 —
[xiuiworld/piggyon_back](https://github.com/xiuiworld/piggyon_back):

```bash
uvicorn app.main:app --port 8000
```

그다음:

```bash
npm install
cp .env.example .env.local
npm run dev
```

<http://localhost:3000>에서 **데모 시나리오 시작**을 누르면 시나리오를 생성하고
입력을 검증한 뒤 기본 편성을 실행하고, 발급된 실제 id로 이동한다.

백엔드가 없으면 랜딩 페이지가 그 사실을 표시하고 버튼을 잠근다. **fixture로
대체하지 않는다** — 편성 화면이 서비스 응답 없이 그럴듯한 결과를 그리면 운영자가
구분할 방법이 없다.

## 화면

| 경로 | 데이터 |
| --- | --- |
| `/` | `GET /health`, `GET /v1/ai/status` · 시작 버튼이 create→validate→run |
| `/scenarios/{id}?run={runId}` | `GET /v1/scenarios/{id}` · `POST .../validate` · `GET /v1/runs/{id}` + `/explanation` |
| `.../decisions` | `GET /v1/runs/{id}` + `/export` + `POST .../decisions` |

대시보드는 한 스냅샷과 한 실행에서 나오는 모든 것을 세로로 쌓는다 — ① 입력,
② 타임라인, ③ 편성과 대기·불가 구역. 블록 순서가 곧 작업 순서라 스크롤이 흐름이
된다. 쿼리로 상태를 더한다:

- `?order=ORD-005` — 옆에 상세 패널을 연다 (다섯 상태축, 비교값, 출처)
- `?alt=ORD-005` — 승인된 변경으로 파생 시나리오를 계산해 아래에 그린다

`/validate`, `/eligibility`, `/runs/{runId}`, `.../alternatives`는 307로 대시보드에
넘긴다. 앞의 둘은 같은 검증 응답을 각자 POST해서 거의 같은 표를 그리던 화면이고,
대안은 화면이 아니라 주문 하나에 대한 동작이다. 결정만 따로 남는다 — 되돌릴 수
없는 POST라 어떤 실행을 두고 내린 결정인지의 경계가 주소로 있어야 한다.

전부 서버 컴포넌트다. `API_BASE_URL`은 서버에서만 읽으며 `NEXT_PUBLIC_`이 아니다.

## 화면이 하지 않는 것

판정은 백엔드가 한다. 화면은 사유 코드가 **어떤 두 값을 견준 것인지** 짚어줄 뿐이다
(`src/lib/view/constraints.ts`) — `준비 11:00 → 반입 마감 10:30 · 30분 초과`. 값은
전부 스냅샷 원본이고, 유일한 산술은 서비스가 하는 것과 같은 것뿐이다(도착 + 도착
터미널 하역시간, 그리고 초과분).

두 값이 초과를 보이지 않으면 초과 배지를 지우고 개발 콘솔에 경고한다. 상태는 그대로
서비스의 것을 쓴다 — 화면의 산술로 판정을 덮지 않는다. 매핑이 없는 사유 코드는 라벨만
나오고, 네 구역 어디에도 안 걸리는 상태 조합은 `분류되지 않음`으로 보인다.

## 계약

정본은 백엔드의 `docs/openapi.yaml`이다. 타입은 손으로 쓰지 않고 생성한다.

```bash
npm run sync:contract           # 백엔드 main에서 계약·정본 시나리오 갱신
npm run sync:contract -- <ref>  # 특정 브랜치에서
npm run gen:api                 # -> src/types/generated/api.ts
```

자세한 건 [contract/README.md](contract/README.md). 생성 파일은 직접 고치지 않는다 —
타입이 틀렸으면 고칠 곳은 백엔드 스펙이다.

## 확인

```bash
npm run typecheck
npm run lint
npm run build
```

화면 값은 백엔드의 `fixtures/canonical-v1/expected-results.json`이 정답지다.
ORD-001/002/003 → SLT-AM-01~03 배정, 다섯 개 주 사유 코드, 재현성 해시 3개가
그대로 나와야 한다. 해시가 어긋나면 스냅샷이 손대진 채 전송된 것이다 —
`src/lib/api/scenarios.ts`가 `scenario.json`을 파싱 없이 통과시키는 이유다.
