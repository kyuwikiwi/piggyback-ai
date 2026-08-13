# PiggyOn — 철도 슬롯 편성 (프론트엔드)

운영자가 주문을 **편성 가능 / 확인 필요 / 불가**로 판정하고, 불가한 주문에 대해
무엇을 바꾸면 다시 검토할 수 있는지 보여주는 화면 6개.

> 모든 운영 수치는 `DEMO_ASSUMPTION` 목업이다. 실제 운행 가능성이나 운영 성과의
> 근거로 사용하지 않는다.

판정·편성·검증은 전부 백엔드가 한다. 이 저장소는 그 결과를 그리기만 하며, 계산을
재현하거나 보정하지 않는다.

## 실행

백엔드가 먼저 떠 있어야 한다 —
[xiuiworld/piggyon](https://github.com/xiuiworld/piggyon):

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
| `/scenarios/{id}` | `GET /v1/scenarios/{id}` (+ `GET /v1/runs/{id}`) |
| `/scenarios/{id}/validate` | `POST /v1/scenarios/{id}/validate` |
| `/scenarios/{id}/eligibility` | 같은 검증 응답 |
| `/scenarios/{id}/runs/{runId}` | `GET /v1/runs/{id}` + `GET /v1/runs/{id}/explanation` |
| `.../alternatives` | `POST /v1/runs/{id}/alternatives` (`?order=`로 선택) |
| `.../decisions` | `GET /v1/runs/{id}` + `/export` + `POST .../decisions` |

전부 서버 컴포넌트다. `API_BASE_URL`은 서버에서만 읽으며 `NEXT_PUBLIC_`이 아니다.

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
