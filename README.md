# ShortsForge 🎬

AI 쇼츠/시리즈 영상 생성 SaaS — **사용자 API 키 기반**, 승인제 로그인, Railway 배포용

## 핵심 특징

- 🔑 **사용자가 본인 OpenAI 키로 직접 호출** — 운영자는 API 비용 0원
- 🔒 **승인제 로그인** — 가입 신청 → 관리자 승인 → 접속
- 📚 **사용자별 히스토리 분리** — user_id 기준으로 서버 DB 저장
- 🎬 **4컷 Scene 자동 생성** — 후킹 / 전개 / 반전 / 엔딩
- 🔄 **시리즈 이어쓰기** — 이전 화의 감정선/줄거리를 컨텍스트로 전달
- 🎭 **캐릭터 일관성** — 키워드를 모든 Scene 프롬프트에 자동 주입
- ⚙️ **관리자 패널** — 승인/거부/차단/비밀번호 초기화/사용자 직접 추가

## 기술 스택

- **Backend**: Node.js + Express
- **DB**: PostgreSQL (Railway)
- **Auth**: bcrypt + JWT (쿠키)
- **Frontend**: Vanilla HTML/CSS/JS (빌드 과정 없음)

---

## Railway 배포 가이드 (5분 컷)

### 1단계 — GitHub에 푸시

```bash
cd shortsforge
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/루피깃허브아이디/shortsforge.git
git push -u origin main
```

### 2단계 — Railway 프로젝트 생성

1. https://railway.app 접속 → New Project
2. **Deploy from GitHub repo** 선택 → `shortsforge` 리포지토리 선택
3. 자동으로 빌드/배포 시작됨 (이 시점엔 DB 없어서 아직 에러남 — 정상)

### 3단계 — Postgres 추가

1. 프로젝트 대시보드에서 **+ New** → **Database** → **Add PostgreSQL**
2. 자동으로 `DATABASE_URL` 환경변수가 서비스에 주입됨

### 4단계 — 환경변수 설정

프로젝트 서비스 → **Variables** 탭에서 아래 3개 추가:

| 변수명 | 값 | 설명 |
|---|---|---|
| `ADMIN_USERNAME` | `dud2587` | 관리자 아이디 |
| `ADMIN_PASSWORD` | `원하는_비밀번호` | 관리자 비밀번호 (아무 문자열) |
| `JWT_SECRET` | `32자_이상_랜덤_문자열` | 쿠키 서명용 (예: `openssl rand -hex 32`) |

**`DATABASE_URL`은 Postgres 추가할 때 자동으로 생성**되므로 직접 입력하지 마세요.

> 💡 `JWT_SECRET` 간단히 만들기: 아무 긴 랜덤 문자열이면 OK. 예시:  
> `shortsforge_super_secret_key_change_me_abc123xyz789`

### 5단계 — 도메인 생성

- Settings → **Generate Domain** 클릭
- `https://shortsforge-production.up.railway.app` 같은 URL이 생성됨
- 해당 URL 접속 → 로그인 페이지 나오면 성공

### 6단계 — 첫 로그인

- 설정한 `ADMIN_USERNAME` / `ADMIN_PASSWORD`로 로그인
- 관리자 계정은 서버 시작 시 **자동 생성**됨 (DB에 없으면 INSERT, 있으면 비밀번호 동기화)
- 로그인 후 우측 상단 **관리자 패널** 버튼으로 이동

---

## 로컬 개발 (선택)

```bash
# 1. Postgres 로컬 설치 또는 Railway DB URL 복사해서 사용
# 2. .env 파일 생성
cp .env.example .env
# .env 편집해서 값 채우기

# 3. 설치 & 실행
npm install
npm start

# → http://localhost:3000
```

---

## 사용 흐름

### 구매자(일반 사용자)

1. `/signup.html` 에서 가입 신청
2. 루피(관리자)가 `/admin.html` 에서 승인
3. 로그인 → `/` 스튜디오 접속
4. **[API 키] 메뉴에서 본인 OpenAI 키 입력** (`sk-...`)
5. 주제 입력 → **[장면 4컷 생성]** 클릭
6. 저장 / JSON / TXT 다운로드 / 이어쓰기

### 관리자(루피)

1. `ADMIN_USERNAME` / `ADMIN_PASSWORD`로 로그인
2. `/admin.html` 자동 이동
3. **승인 대기** 탭에서 신청자 확인 → 승인/거부
4. **사용자 직접 추가** 버튼으로 승인 단계 스킵해서 바로 생성 가능

---

## 보안 원칙

- ✅ 사용자 OpenAI API 키는 **절대 서버로 전송되지 않음** (브라우저 localStorage만)
- ✅ 모든 OpenAI 호출은 사용자 브라우저 → OpenAI 직통
- ✅ 비밀번호는 bcrypt 해시로 DB 저장 (원본 저장 안 함)
- ✅ JWT는 httpOnly 쿠키 (JS로 탈취 불가)
- ✅ 사용자별 데이터 완전 분리 (user_id 기준)

---

## 폴더 구조

```
shortsforge/
├── package.json
├── .env.example
├── .gitignore
├── server.js              ← Express 진입점
├── README.md
├── db/
│   ├── db.js              ← Postgres 연결 (pg 풀)
│   └── init.js            ← 스키마 생성 + 관리자 자동 생성
├── middleware/
│   └── auth.js            ← JWT 검증 미들웨어
├── routes/
│   ├── auth.js            ← /api/auth/* (가입/로그인/로그아웃)
│   ├── history.js         ← /api/history/* (user_id별 CRUD)
│   └── admin.js           ← /api/admin/* (사용자 관리)
└── public/
    ├── common.css         ← 공통 스타일
    ├── common.js          ← api/toast/requireLogin 유틸
    ├── index.html         ← 스튜디오 메인
    ├── login.html         ← 로그인
    ├── signup.html        ← 가입 신청
    └── admin.html         ← 관리자 패널
```

---

## DB 스키마

```sql
-- 사용자
users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(64) UNIQUE,
  password_hash TEXT,           -- bcrypt
  status VARCHAR(16),           -- pending / approved / rejected
  is_admin BOOLEAN,
  note TEXT,
  created_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ
)

-- 프로젝트 히스토리 (user_id별)
histories (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  project_id VARCHAR(32),       -- 브라우저 측 uid
  title, episode, topic, style, mood, length, platform,
  character_keyword, parent_id,
  data JSONB,                   -- 전체 결과 (scenes 포함)
  created_at TIMESTAMPTZ
)
```

---

## API 엔드포인트

### 공개
- `POST /api/auth/signup` — 가입 신청
- `POST /api/auth/login` — 로그인
- `POST /api/auth/logout` — 로그아웃

### 로그인 필요
- `GET /api/auth/me` — 현재 사용자 정보
- `POST /api/auth/change-password` — 비밀번호 변경
- `GET /api/history` — 내 히스토리 목록
- `POST /api/history` — 히스토리 저장 (upsert)
- `DELETE /api/history/:projectId` — 프로젝트 삭제
- `DELETE /api/history` — 전체 삭제

### 관리자 전용
- `GET /api/admin/users` — 사용자 목록
- `GET /api/admin/stats` — 통계
- `POST /api/admin/users` — 사용자 직접 추가
- `POST /api/admin/users/:id/approve` — 승인
- `POST /api/admin/users/:id/reject` — 거부
- `POST /api/admin/users/:id/revoke` — 차단
- `POST /api/admin/users/:id/reset-password` — 비번 초기화
- `DELETE /api/admin/users/:id` — 삭제

---

## 확장 포인트

이미 구조가 잡혀있어서 아래 기능은 바로 붙일 수 있음:

- **이미지 생성** — Pollinations / DALL-E / Stability → `key-image` 슬롯 이미 있음
- **TTS** — Edge TTS (ko-KR-SunHiNeural) / ElevenLabs → `key-tts` 슬롯 이미 있음
- **영상 렌더링** — ffmpeg 서버 작업 큐
- **자동 업로드** — YouTube Data API v3
- **쿠팡 파트너스** — Scene 프롬프트에 자동 상품 훅 주입

---

## 트러블슈팅

### "DB 연결 실패"
- Railway에서 Postgres 서비스가 정상 실행 중인지 확인
- 환경변수 `DATABASE_URL`이 자동 주입되었는지 확인 (수동으로 지우지 말 것)

### "관리자 로그인 안 됨"
- `ADMIN_USERNAME`, `ADMIN_PASSWORD` 환경변수 확인
- 서버 로그에서 `[DB] Admin account synced: dud2587` 메시지 있는지 확인
- 비번 바꾸고 싶으면 `ADMIN_PASSWORD` 환경변수 수정 → Railway가 재배포하면서 자동 동기화됨

### "OpenAI API 오류"
- 사용자가 [API 키] 메뉴에서 본인 키 등록했는지 확인
- **[연결 테스트]** 버튼으로 검증
- 키는 `sk-...`로 시작해야 함

---

## 라이선스

Private use only. 구매자에게만 배포.
