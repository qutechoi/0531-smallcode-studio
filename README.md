# Smallcode Studio

[Smallcode](https://github.com/Doorman11991/smallcode)를 로컬 저장소에서 안전하게 실행하고, AI가 만든 변경사항을 `git diff`로 먼저 검토하기 위한 **로컬 우선 웹 콘솔**입니다.

Smallcode Studio는 Smallcode 자체를 웹 IDE로 복제하지 않습니다. 대신 Smallcode CLI는 터미널/서버 레이어에 그대로 두고, 브라우저에서는 다음 흐름만 깔끔하게 제공합니다.

1. 작업할 로컬 저장소 선택
2. Smallcode에 보낼 작업 프롬프트 작성
3. 실행 로그 확인
4. 변경된 파일과 diff 검토
5. 실제로 유지할 패치인지 판단

## 왜 만들었나

AI 코딩 에이전트는 코드를 빠르게 수정하지만, 개발자는 여전히 결과를 검토하고 승인해야 합니다. Smallcode Studio의 목표는 “AI가 바로 적용한 코드”가 아니라 **리뷰 가능한 패치**를 만드는 것입니다.

특히 Smallcode처럼 소형/로컬 LLM 친화적인 코딩 에이전트를 사용할 때 다음 니즈가 있습니다.

- 터미널 로그를 브라우저에서 보기 쉽게 확인
- 실행 전 저장소 상태 점검
- 실행 후 `git diff`를 한 화면에서 리뷰
- 위험한 임의 shell 실행을 피하고, 허용된 명령만 사용
- 나중에 다른 AI 코딩 에이전트도 같은 리뷰 UI에 붙일 수 있는 구조 만들기

## 현재 MVP 기능

- React/Vite 기반 로컬 대시보드
- 저장소 경로 입력
- 작업 프롬프트 입력
- 자주 쓰는 프롬프트 preset 버튼
- 저장소 점검 버튼
  - Git 사용 가능 여부
  - 현재 브랜치
  - `git status --short --branch`
  - Smallcode CLI 감지 여부
- Smallcode 실행 버튼
- 실행 로그 패널
- `git diff` 미리보기 패널
- diff 통계 요약
  - 변경 파일 수
  - 추가 라인 수
  - 삭제 라인 수
- 테스트 코드
  - Smallcode 인자 생성 guardrail
  - 로그 파싱
  - diff stat 파싱
  - 기본 UI 동작

## 안전 설계

브라우저는 임의의 shell 명령을 실행할 수 없습니다. 로컬 Node 서버는 제한된 API만 제공합니다.

- `POST /api/inspect`
  - 저장소 상태와 Smallcode 사용 가능 여부를 확인합니다.
- `POST /api/run`
  - `smallcode --cwd <repoPath> <prompt>` 형태로만 실행합니다.
- `POST /api/diff`
  - `git diff`, `git diff --stat`만 읽습니다.

추가 guardrail:

- `spawn(command, args, { shell: false })` 사용
- repo path의 shell metacharacter 차단
- 브라우저에서 arbitrary command runner 미제공
- auto commit / auto push 미제공
- 패치 적용보다 diff review를 우선하는 UI

## 요구사항

- Node.js 22 이상
- npm
- Git
- Smallcode CLI
  - `smallcode` 명령이 `PATH`에서 실행 가능해야 실제 Smallcode 실행이 됩니다.

## 설치

```bash
git clone https://github.com/qutechoi/0531-smallcode-studio.git
cd 0531-smallcode-studio
npm install
```

## 개발 서버 실행

UI만 빠르게 개발할 때는 Vite dev server를 사용합니다.

```bash
npm run dev
```

## 로컬 Studio 서버 실행

API까지 포함해서 실제 사용 흐름을 확인하려면 아래 명령을 사용합니다.

```bash
npm run serve
```

실행 후 브라우저에서 엽니다.

```text
http://localhost:4173
```

## 사용 방법

1. `Repository path`에 작업할 로컬 Git 저장소 경로를 입력합니다.
2. `Inspect repo`를 눌러 현재 상태를 확인합니다.
3. `Task prompt`에 Smallcode에게 맡길 작업을 적습니다.
4. `Run Smallcode`를 누릅니다.
5. 로그와 diff를 확인합니다.
6. 마음에 들지 않으면 터미널 또는 Git 도구로 변경사항을 되돌립니다.

현재 MVP는 “리뷰 콘솔”에 집중하므로 UI에서 직접 discard/apply 버튼은 제공하지 않습니다.

## 검증

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

## 프로젝트 구조

```text
.
├── server/
│   └── studio-server.mjs      # 로컬 API 서버와 정적 파일 서빙
├── src/
│   ├── App.tsx                # 메인 UI
│   ├── App.css                # 대시보드 스타일
│   ├── App.test.tsx           # UI 테스트
│   └── lib/
│       ├── api.ts             # 브라우저 API 클라이언트
│       ├── smallcode.ts       # Smallcode guardrail / parser 유틸
│       └── smallcode.test.ts  # 유틸 테스트
└── README.md
```

## 다음에 만들 것

- Server-Sent Events 기반 실시간 로그 스트리밍
- 실행 기록 저장
- 파일별 diff 접기/펼치기
- 변경사항 discard 버튼
- `git status` 전후 비교
- 테스트 실행 버튼
- Smallcode 외 Claude Code, Codex, Aider 등 다른 에이전트 adapter
- 소형 코딩 모델 benchmark 모드

## 라이선스

아직 별도 라이선스 파일은 추가하지 않았습니다.
