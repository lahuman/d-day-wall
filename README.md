# D-Day Pixel Wall

'D-Day 픽셀 월'은 여러 사용자가 자신의 D-Day를 거대한 디지털 캔버스에 함께 공유하는 웹 애플리케이션입니다. 개인의 소중한 D-Day 경험을 다른 사람들과 함께 구경하며 독특한 사회적 경험을 나누는 것을 목표로 합니다.

## ✨ 주요 기능

- **공유 캔버스**: 3000x3000 픽셀 크기의 거대한 공유 캔버스
- **D-Day 등록**: 캔버스의 빈 공간을 클릭하여 나만의 D-Day 타일 등록
- **광고 시청 (시뮬레이션)**: 타일 등록을 위해 보상형 광고 시청 си뮬레이션 플로우 적용
- **캔버스 탐색**: 마우스 드래그를 통한 이동(Pan) 및 휠을 통한 확대/축소(Zoom) 지원
- **반짝임 효과**: D-Day 당일(`D-0`)이 된 타일은 반짝이는 애니메이션 효과 적용
- **자동 소멸**: D-Day가 7일 이상 지난 타일은 매일 자동으로 삭제

## 🛠️ 기술 스택

- **Framework**: SvelteKit (Svelte + Vite)
- **Language**: TypeScript
- **Database**: SQLite
- **ORM**: Prisma
- **Canvas**: Konva.js
- **Styling**: TailwindCSS

## 🚀 시작하기

### 1. 의존성 설치

프로젝트 디렉토리에서 아래 명령어를 실행하여 필요한 패키지를 설치합니다.

```bash
npm install
```

### 2. 데이터베이스 설정

Prisma를 사용하여 SQLite 데이터베이스와 테이블을 생성합니다. `.env` 파일이 없다면, `DATABASE_URL="file:./prisma/dev.db"` 내용으로 생성해주세요.

```bash
npx prisma migrate dev
```

### 3. 개발 서버 실행

아래 명령어를 실행하여 개발 서버를 시작합니다.

```bash
npm run dev
```

서버가 시작되면 터미널에 표시되는 주소(예: `http://localhost:5173`)로 접속하여 애플리케이션을 확인할 수 있습니다.