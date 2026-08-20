# CHLOE MATH QUEST

> From Math Anxiety to Math Mastery — 채림(Chloe)을 위한 개인 맞춤 Mastery-Based Adaptive Math Learning System

중1~중3 수학 19개 단원을 지식그래프로 연결하고, **왜 틀렸는지(WHY WRONG ENGINE)** 를 진단해
학습 구멍을 찾아 치료(Error Clinic)하며, Mastery Gate를 통과해야 다음 난이도로 올라가는
적응형 학습 웹앱입니다. 최종 목표는 중1 → 고3 최상위권까지의 6년 성장 시스템 (현재 Phase 2).

**Phase 2에서 추가된 것**
- KaTeX 수식 조판 — 시중 문제집 수준의 수식 표기 (분수·근호·지수·부등호)
- 교육과정 트랙: 중1·중2·중3 (각 6~7단원 × 5레벨 문제 생성기) + 고등 7과목(공통수학1·2, 대수, 미적분Ⅰ·Ⅱ, 확률과 통계, 기하 — 2022 개정, Phase 3 오픈 예정)
- 과정 선택: 대시보드의 "과정 · 변경" 버튼 → 바텀시트 모달, 또는 "과정" 탭. 어느 학년이든 클릭해 진단 → 미달이면 아래 학년 구멍부터 자동 보충, 정복(90+)하면 위 학년 도전 추천
- 문제 상단에 학년(과정)·난이도 명시, 각 과정 졸업 조건 = 전 단원 Lv.5(Elite) 정복
- **필수 복습 게이트**: 틀린 문제의 Error Clinic이 완치되기 전에는 해당 단원의 레벨 승급이 잠긴다 (Skip Test 포함)
- **학부모 주간 리포트**: 발견/완치된 학습 구멍, 과정별 분리 분석, Biggest Improvement, 다음 주 목표 자동 생성
- **학년별 분리 분석**: 성장·오답노트 화면에 과정(중1/중2/중3) 필터 — 여러 학년 동시 진행 지원

## 파일 문제은행 관리 (UCAT 방식)

`src/data/bank/m1.json · m2.json · m3.json` — 시중 문제집 유형을 참고해 창작한 큐레이션 문제은행.
생성기(무한 공급)와 병행 출제되며, (스킬, 레벨)에 은행 문제가 있으면 약 35% 확률로 은행에서 나온다.

문제 추가 방법:
1. 해당 트랙 JSON의 `questions` 배열에 항목 추가 (id는 `<스킬ID>.B###` 형식, 오답 선택지마다 `error` 유형 태깅)
2. `npm run verify:bank` 로 무결성 검증 (정답 유일성·answerIndex·힌트 3단계·해설 3요소)
3. 앱 재시작 없이 다음 빌드/새로고침부터 반영

## 실행

```bash
npm install
npm run dev        # http://localhost:5174
```

## 검증

```bash
npm run check        # 타입체크 + 문제은행 검증 + QA 시나리오 1~7
npm run verify:bank  # 문제은행 14,000문제 신뢰도 검증 (정답 유일성·오답 태깅·해설)
npm run qa           # 스펙 QA Scenario 1~7 (난이도 상승, prerequisite remediation,
                     # 계산실수 난이도 유지, similar→transfer, mastery 상승,
                     # spaced repetition, 선행 판정)
```

## 구조

- `docs/PHASE0-AUDIT.md` — 기존 프로토타입 감사 보고서
- `docs/DESIGN.md` — PART A~I 전체 설계 (아키텍처, 학생 모델, 지식그래프, Mastery/Adaptive/오답진단 알고리즘, 로드맵)
- `src/data/curriculum.ts` — Curriculum Knowledge Graph (스킬·prerequisite; 코드와 분리)
- `src/engine/` — 순수 함수 학습 엔진 (React 무관, node로 직접 테스트)
  - `generators/` — 절차적 문제 생성기 (스킬 × 5레벨 × similar/transfer 변형, 오답 선택지에 실수 유형 태깅)
  - `mastery.ts` `errors.ts` `adaptive.ts` `clinic.ts` `review.ts` `diagnostic.ts` `quest.ts` `progression.ts` `recorder.ts`
- `src/screens/` — Dashboard / QuestPlayer / Diagnosis / KnowledgeMap / Notebook / Progress
- 데이터는 localStorage 저장 (`src/engine/store.ts` 만 교체하면 Supabase/Firebase 연동 가능)

## 사용 팁

- 첫 실행 시 **진단 테스트 14문제**로 단원별 시작 레벨이 정해집니다.
- 대시보드 하단 **"데모 데이터 보기"** — 2주 학습을 실제 엔진으로 시뮬레이션한 데모 학생을 볼 수 있습니다.
- **"처음부터"** — 모든 기록을 지우고 채림이의 실제 학습을 시작합니다.
