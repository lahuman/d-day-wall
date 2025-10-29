# [DESIGN] D-Day 픽셀 월

## 1. 아키텍처 개요

* **Framework:** SvelteKit (프론트엔드와 백엔드 API 통합).
* **Canvas:** Konva.js (`konva`)를 사용하여 3000x3000 캔버스의 렌더링, 확대/축소/이동을 처리.
* **Database:** SQLite (개발 초기 단계의 편의성을 위해 선택).
* **ORM:** Prisma를 사용하여 데이터베이스 스키마 관리 및 쿼리 실행.
* **Ad Service:** Google AdMob (Web) 또는 유사 보상형 광고 SDK 연동 (현재는 시뮬레이션으로 구현됨).

## 2. 데이터 모델 (Database Schema)

**`DDayTile` (D-Day 타일)**
* `id`: (Primary Key, UUID)
* `title`: (String, 50자 제한) - D-Day 제목
* `target_date`: (Timestamp) - D-Day 목표 날짜
* `coord_x`: (Integer, 0-59) - 타일 그리드 X좌표 (50x50px 타일 기준)
* `coord_y`: (Integer, 0-59) - 타일 그리드 Y좌표 (50x50px 타일 기준)
* `created_at`: (Timestamp) - 등록 시각

*참고: 타일 크기를 50x50 픽셀로 고정한다고 가정하면, 3000x3000 캔버스는 60x60 그리드가 됩니다. 픽셀 단위(0-2999)가 아닌 그리드 단위(0-59)로 좌표를 저장하는 것이 충돌 감지에 유리합니다.*

## 3. 핵심 API 엔드포인트

* `GET /api/tiles`: 캔버스에 표시할 모든 D-Day 타일 목록을 조회합니다.
* `POST /api/tiles`: 새 D-Day 타일을 등록합니다.
    * **Body:** `{ title, target_date, coord_x, coord_y }`
    * **핵심 로직:**
        1.  `target_date`가 현재로부터 365일 이내인지 확인.
        2.  Prisma와 DB의 `@@unique` 제약조건을 통해 `coord_x`, `coord_y` 위치 중복을 확인하고, 중복 시 409 Conflict 에러 반환.
* `GET /api/cron`: 오래된 타일을 삭제하는 스케줄링 작업용 엔드포인트.
    * **인증:** `Authorization: Bearer <CRON_SECRET>` 헤더를 통해 인증.
    * **핵심 로직:** `target_date`가 7일 이상 지난 타일을 DB에서 삭제.

## 4. 주요 기술 결정

* **캔버스 렌더링:** 수천 개의 타일을 효율적으로 처리하기 위해 DOM 요소(div) 대신 **`<canvas>`** (또는 WebGL 기반의 `pixi.js`)를 사용합니다.
* **자리 선점 (Collision Detection):** 클라이언트가 빈자리를 클릭했더라도, `POST /api/tiles` 요청이 서버에 도달하는 순간 다른 요청이 먼저 처리될 수 있습니다(Race Condition). 충돌 감지는 반드시 **Backend의 DB 트랜잭션** 레벨에서 원자적(Atomic)으로 처리해야 합니다.
* **D-Day 반짝임:** 클라이언트(프론트엔드)에서 1분마다 타일 데이터를 순회하며 `target_date`가 오늘(D-0)인 타일을 찾아 CSS 애니메이션 또는 Canvas 필터 효과를 적용합니다.
* **타일 소멸:** Backend에서 매일 1회 스케줄링 잡(Cron Job)을 실행하여, `target_date`가 7일 이상 지난(D+7) 타일을 DB에서 삭제합니다.