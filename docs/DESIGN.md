# CHLOE MATH QUEST — System Design

> From Math Anxiety to Math Mastery.
> 모든 설계 결정의 기준: **"Does this help Chloe understand why she is wrong and become better at mathematics?"**

---

## PART A — Architecture

```
src/
  data/
    curriculum.ts        # Skill Knowledge Graph (코드와 분리된 설정 데이터)
  engine/                # 순수 함수. React를 import하지 않음. node로 직접 테스트 가능
    types.ts             # 공유 타입 (Problem, Attempt, SkillState, StudentModel...)
    config.ts            # 튜닝 가능한 상수 (mastery gate 기준, XP 표, 복습 간격...)
    generators/          # AdaptiveQuestionEngine의 문제 공급원
      util.ts            #   분수/근호/선택지 셔플, error-tag 태깅
      m1.ts              #   중1 스킬별 × 레벨별 생성기 (+ similar/transfer 변형)
    mastery.ts           # MasteryEngine: Mastery Score 계산 + Mastery Gate 판정
    errors.ts            # ErrorDiagnosisEngine: taxonomy, 자동 진단, self 진단 병합
    adaptive.ts          # AdaptiveQuestionEngine: Priority Score, 난이도 적응, Flow Zone
    clinic.ts            # Error Clinic 상태기계 (Wrong→Review→SimilarA→SimilarB→Transfer→Check)
    review.ts            # ReviewScheduler: 망각곡선 1/3/7/14/30일
    diagnostic.ts        # DiagnosticEngine: 적응형 초기 진단
    quest.ts             # Today's Quest 빌더 (Warm Up / Main / Clinic / Challenge / Review)
    progression.ts       # XP, 학생 레벨, 배지, 스트릭 (ProgressAnalyticsEngine 일부)
    recorder.ts          # 단일 진입점: 답안 1개 기록 → 모든 엔진 상태 갱신 (reducer)
    store.ts             # 직렬화 / localStorage 영속화 / 마이그레이션
  context/
    StudentContext.tsx   # engine 상태를 React에 노출하는 thin wrapper
  components/            # 재사용 UI 조각
  screens/               # Dashboard, Quest, Solver, Map, Notebook, Progress, Diagnosis
scripts/
  verify-generators.mjs  # 문제은행 신뢰도 검증 (수천 문제 구조·정답 유일성)
  qa-scenarios.mjs       # QA Scenario 1~7 코드 레벨 자동 검증
docs/
  PHASE0-AUDIT.md, DESIGN.md
```

원칙:
- **UI와 알고리즘 완전 분리** — engine/은 React 없이 node로 실행·검증된다 (QA 시나리오가 이를 강제).
- **Explainability** — 모든 문제 선택·mastery 변화는 `reason` 문자열을 함께 반환한다 (§71).
- 데이터: MVP는 localStorage. `store.ts`가 유일한 영속화 지점이므로 이후 Supabase/Firebase로 교체 시 이 파일만 변경.

## PART B — Student Model

```ts
StudentModel {
  name, gradeCursor: "M1",         // 현재 학습 학년 (선행 시 이동)
  createdAt, lastActiveDate, streakDays,
  xp, badges: BadgeId[],
  diagnosisDone: boolean,
  skills: Record<SkillId, SkillState>,
  attempts: Attempt[],             // 최근 800개 (모든 분석의 원본 데이터)
  clinicQueue: ClinicCase[],       // 진행 중인 Error Clinic 케이스
  reviews: Record<SkillId, ReviewState>,  // 망각곡선 스케줄
  snapshots: { date, overallMastery, bySkill }[],  // 성장 그래프용 일별 기록
}

SkillState {
  mastery: 0..100,
  level: 1..5,                     // 현재 도전 중인 난이도
  masteredLevels: number[],        // Mastery Gate 통과한 레벨
  attempts, correct, recentWindow: AttemptSummary[],  // 최근 12개 (게이트 판정용)
  hintRate, avgTimeMs,
  errorCounts: Record<ErrorType, number>,
  transferPassedAtLevel: Record<number, boolean>,
}

Attempt {
  id, ts, skillId, level, variant: "standard"|"similarA"|"similarB"|"transfer"|"review"|"diagnostic",
  correct, chosenIndex, timeMs, hintsUsed,
  autoDiagnosis: ErrorType|null,   // WHY WRONG ENGINE 판정
  selfDiagnosis: SelfTag|null,     // 학생 자가 진단
  problem: ProblemSnapshot,        // 오답노트 재현용 (stem/choices/해설)
  clinicCaseId?: string,
}
```

## PART C — Curriculum Knowledge Graph

Skill ID: `<학년>.<영역>.<단원>` 예) `M1.ALG.EQ` (일차방정식). 문제 ID는 `M1.ALG.EQ.L3.<uuid>`.
커리큘럼은 `data/curriculum.ts` 단일 파일(향후 JSON/DB 교체 가능)로 관리하며 코드 어디에도 단원명을 하드코딩하지 않는다.

MVP 그래프 (중1 7스킬 + 선행 예고 노드):

```
M1.NUM.INT (정수와 유리수) ──┬─► M1.ALG.EXP (문자와 식) ──► M1.ALG.EQ (일차방정식) ─► [M2.ALG.SYS 연립방정식 🔒]
                             ├─► M1.FUN.COORD (좌표평면) ─┬─► M1.FUN.PROP (정비례·반비례) ─► [M2.FUN.LINEAR 일차함수 🔒]
                             └─► M1.STA.DATA (자료와 해석)└──(+ M1.ALG.EXP)
M1.GEO.BASIC (기본 도형과 각) ─► [M2.GEO.TRI 삼각형의 성질 🔒]
```

각 스킬은 Level 1(Foundation)~5(Elite)의 난이도를 가진다. 레벨은 학년 진도가 아니라 **같은 단원 안의 깊이**다.
M2/M3 노드는 그래프에 존재하되 🔒 — prerequisite 스킬의 평균 mastery ≥ 90이면 Acceleration(선행) 추천이 열린다.

## PART D — Mastery Algorithm

Mastery Score (0~100, 스킬 단위):

```
base       = Σ(정답 ? w : 0) / Σw          # 최근 12회, w = 난이도(level) × 최신성(지수 감쇠 0.85^age)
transfer   = 현재 레벨 transfer 성공 여부 (+8)
hintPen    = hintRate × 12                  # 힌트 의존 감점
speedPen   = 평균시간이 예상시간 2배 초과 시 −5
retention  = 복습 성공 시 +5, 복습 실패 시 −12 (ReviewScheduler가 반영)
levelBonus = masteredLevels 수 × (레벨당 가중)  # 높은 레벨 정복이 점수 상한을 끌어올림

mastery = clamp( levelFloor + base × span + transfer − hintPen − speedPen , 0, 100 )
```

정확한 구현은 `engine/mastery.ts` — 단순 정답률이 아니라 난이도·최신성·힌트·시간·전이·복습을 종합한다 (§7).

**Mastery Gate** (레벨 승급, §12): 최근 8회 중 ≥75% 정답 AND 해당 레벨 transfer 1회 이상 성공 AND hintRate ≤ 0.35 AND 최소 시도 6회. 충족 시 해당 레벨 MASTERED → 다음 레벨 오픈. 3연속 무힌트·빠른 정답이면 Skip Test 1문제로 조기 승급 허용 (rigid 방지).

## PART E — Adaptive Algorithm

다음 학습 스킬 선택 (Today's Quest Main Mission):

```
Priority(skill) = WeaknessSeverity(100−mastery)
                × PrerequisiteImportance(이 스킬을 선행으로 요구하는 후속 스킬 수)
                × ForgettingRisk(복습 경과일 기반)
                × RecentErrorFrequency(최근 오답 밀도)
```

세션 내 난이도 적응 (§48~50):
- 3연속 (무힌트·정상시간) 정답 → 레벨 내 상위 변형 또는 Skip Test 제안
- 2연속 오답 → **바로 난이도를 내리지 않고** 오답 원인 확인:
  - CONCEPT/PREREQUISITE 우세 → prerequisite 스킬의 복습 문제 삽입 (Root Cause remediation)
  - CALCULATION/CARELESS 우세 → 같은 레벨 유지, 유사문제로 재도전
- 3연속 오답 → Frustration Protection: 한 단계 쉬운 성공 경험 문제 → 원래 레벨 복귀
- Flow Zone: 퀘스트 구성 70% 현재 레벨 / 20% +0.5(전이·변형) / 10% Challenge(+1 레벨)

## PART F — Error Diagnosis (WHY WRONG ENGINE)

Taxonomy: `CONCEPT / CALCULATION / SIGN / FORMULA / INTERPRETATION / CARELESS / PREREQUISITE / TIME / GUESSING` (+ LOGIC/DIAGRAM/STRATEGY는 서술형 도입 시).

자동 진단 입력 3가지:
1. **Distractor 태깅** — 모든 오답 선택지는 생성기가 "특정 실수를 하면 나오는 값"으로 만들고 그 실수 유형을 태깅한다. 예) `-4-9×3`에서 `(−4−9)×3=−39` 선택 → CALCULATION(연산 순서), 부호 뒤집힌 값 → SIGN.
2. **행동 신호** — 풀이 시간 < 예상 25% → GUESSING/CARELESS 의심, > 250% → TIME/CONCEPT 의심, 힌트 3개 소진 후 오답 → CONCEPT.
3. **이력** — 같은 스킬에서 CONCEPT 반복 + prerequisite mastery < 60 → PREREQUISITE로 승격 (Root Cause Analysis §18).

학생 self-diagnosis(7택, §9)와 자동 진단을 **모두 저장**하고, 통계에는 자동 진단을 우선하되 둘의 불일치 자체를 메타인지 데이터로 기록한다.

## PART G — Mastery Loop

```
Learn(개념 카드) → Practice → Wrong?
  ├─ No → streak/gate 판정 → Advance
  └─ Yes → "한 번 더 생각해볼까?" (self-correction 1회)
        → Step Hint 1~3 → 해설(IDEA/SOLVE/REMEMBER)
        → Self Diagnosis + Auto Diagnosis 저장
        → Error Clinic 케이스 생성:
             Concept Review → Similar A(동일 구조) → Similar B(다른 표현)
             → Transfer(새로운 상황) → Mastery Check
             (중도 실패 시 한 단계 후퇴, CONCEPT이면 prerequisite로)
        → 완치 시 +30~40 XP, mastery 회복, 오답노트에 "교정 완료" 표시
Mastered → ReviewScheduler 등록(1/3/7/14/30일) → 복습 실패 시 mastery 하향 + Clinic 재개
```

## PART H — UI Wireframe (텍스트)

- **Dashboard**: 인사말 + 학생 레벨/XP링 · 오늘의 미션 카드(예상 시간, START 버튼 중앙) · 🔥스트릭 · Overall Mastery + 주간 변화 · 영역 Radar · 강점/보완 리스트 · 배지
- **Today's Quest**: Warm Up → Main Mission → Error Clinic → Challenge → Review 블록 진행바, 각 블록 문제 수/XP 표시
- **Problem Solver**: 상단(스킬명 · n/m · 난이도 ★) / 중앙 문제 / 4지선다 / 하단 Hint(단계형)·Scratch Pad / 오답 시 인터랙션 시퀀스 / "WHY THIS PROBLEM?" 칩
- **Math Map**: 지식그래프 노드(🟢≥90 🟡75+ 🟠50+ 🔴<50 ⚪미학습 🔒선행), prerequisite 화살표, 학년 진행바(중1 ▓▓ 91% · 중2 🔒 ...)
- **Mistake Clinic(Notebook)**: 자동 오답노트 카드(문제/내 답/정답/원인/현재 상태[치료중→교정완료]) + Mistake Pattern 막대
- **Progress**: Mastery 추이 라인차트, 오답 원인 비율 변화, 스킬별 레벨 pips, Growth Metrics 타일
- **Parent Dashboard**(Phase 2): 주간 시간/문제 수보다 "발견된 구멍 n개 → 교정 n개" 중심

## PART I — Development Roadmap

| Phase | 범위 | 산출물 |
|---|---|---|
| **1 (지금)** | 중1 핵심 7스킬 × 5레벨, 진단·풀이·WHY WRONG·Clinic·Mastery Gate·Map·Quest·Notebook·XP/배지/스트릭·복습 스케줄·로컬 영속화 · QA 시나리오 1~7 | 실동작 MVP |
| 2 | 중1 전 단원 확장, Knowledge Map 그래프 시각 강화, Parent Dashboard, Weekly Report, Confidence System | |
| 3 | 중2·중3 커리큘럼 + AccelerationEngine(선행 판정 정식화), 시험모드 | |
| 4 | 고교 과정, Elite Mode(복수 풀이·메타인지 질문), 서술형 채점 준비 | |
| 5 | AI Math Coach(소크라테스식), AI Problem Generator + validation 파이프라인, 예상 점수, Supabase 동기화 | |

문제은행 신뢰도 전략: MVP는 **검증된 절차적 생성기**(모든 문제가 계산으로 정답이 보장되고, 스트레스 테스트 스크립트로 수천 문제를 자동 검증)로 무한 공급. Phase 5에서 AI 생성 문제를 추가할 때도 §51의 validation(정답 유일성·학년 적합성)을 통과한 것만 은행에 편입.
