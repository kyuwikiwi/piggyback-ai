# 계약 정본

이 폴더의 `openapi.yaml`은 **이 저장소가 소유한 파일이 아니다.** 정본은
[xiuiworld/piggyon](https://github.com/xiuiworld/piggyon)의 `docs/openapi.yaml`이고,
여기 있는 건 복사본이다. 백엔드 `docs/01-requirements.md` §11이 그 파일을 계약
정본으로 지정한다.

`src/data/canonical-v1/scenario.json`도 같다. 백엔드의 `data/canonical-v1/scenario.json`
복사본이며, §10 DEC-02가 이 문서를 프론트·API·테스트가 함께 쓰는 정본 입력으로
지정한다.

## 왜 vendoring인가

빌드가 GitHub 도달성에 의존하지 않게 하려는 것이다. 대신 복사본은 드리프트하므로,
갱신은 명시적으로 한다.

```bash
npm run sync:contract           # main에서
npm run sync:contract -- <ref>  # 특정 브랜치·태그에서
npm run gen:api                 # 반드시 뒤이어 실행
```

`gen:api`를 빼먹으면 계약이 바뀌어도 타입은 옛날 것이라, 런타임에 깨지기 전까지
아무도 모른다.

## 생성물

`npm run gen:api`는 `src/types/generated/api.ts`를 만든다. **직접 수정하지 않는다.**
잘못된 타입이 나오면 고칠 곳은 백엔드의 `openapi.yaml`이다.

## 스냅샷을 손대지 말 것

`scenario.json`은 `POST /v1/scenarios`의 `input_snapshot`에 **그대로** 실어야 한다.
백엔드는 제출된 문서 그 자체를 해싱해서 `input_snapshot_sha256`을 만든다. 파싱한
모델을 다시 직렬화하면 이쪽 기본값이 끼어들어 해시가 달라지고, 재현성 대조가
깨진다. `src/lib/api/scenarios.ts`가 이 파일을 파싱 없이 통과시키는 이유다.
