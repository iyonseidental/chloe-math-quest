# CHLOE MATH 2.0 — ARCHITECTURE REPORT

> **최상위 원칙**: Find the smallest mathematical weakness that is blocking Chloe, fix it completely,
> verify that the understanding transfers, verify that it remains after time has passed, and only then move forward.

작성일: 2026-08-18 · 기준 스펙: CHLOE MATH 2.0 (§0~§119) · 작성 방식: 구현 전 설계 보고서 (§114)

---

## PART A — Current Repository Audit

감사 대상: `chloe-math-quest` (Phase 1~2 완료 상태)

### A-1. 현재 보유 자산 (재사용 가능 — 다시 만들지 않는다)

| 자산 | 상태 | 2.0에서의 역할 |
|---|---|---|
| 절차적 문제 생성기 19단원 × 5레벨 + 전이 변형 | 38,000문항 자동검증 통과, **모든 오답 선택지에 오류유형 태깅** | 그대로 micro-skill의 문제 공급원 (어댑터로 연결) |
| 파일 문제은행 (UCAT식 JSON 3파일, 37문항) | 무결성 검증 스크립트 보유 | 유지. misconceptionTags 필드만 추가 |
| KaTeX 수식 조판, 화면 8종 (Dashboard·Quest·Map·Notebook·Progress·Parent·진단·과정선택) | 실동작 | 유지. 엔진 v2 검증 완료 후 재연결 |
| 트랙 구조 (중1~3 + 고등 7과목, 2022 개정) | 실동작 | 유지. micro-skill이 트랙 아래 계층으로 들어감 |
| localStorage 영속화 + v1→v2 마이그레이션 | 실동작 | repository abstraction으로 확장 (§77) |
| QA 시나리오 1~9 자동 테스트 | 통과 | 2.0의 QA 1~10으로 대체·확장 |

### A-2. 2.0 스펙 대비 결함 (이번 재설계의 이유)

| # | 결함 | 스펙 근거 |
|---|---|---|
| 1 | **Skill 단위가 너무 큼** — "일차방정식" 1개. 스펙은 "괄호 방정식/분수 방정식/문장→식/거리/나이…" 수준의 micro-skill 요구 | §9 |
| 2 | **Mastery가 확률이 아님** — 휴리스틱 점수(0~100). P(mastery) 확률 모델 + 상태기계(UNSEEN~WEAKENED) 없음 | §10~13 |
| 3 | **Error와 Misconception을 구분하지 않음** — 반복되는 같은 오류를 오개념으로 승격하는 로직 없음, 오개념 라이브러리 없음 | §14~16 |
| 4 | **Prerequisite Probe 없음** — 오답 시 즉시 클리닉으로 감. "선수개념 미니 진단으로 원인을 좁힌 뒤" 치료하는 단계 부재 | §18~19 |
| 5 | **Minimum-Dose Remediation 불완전** — Micro Lesson(IDEA/WHY/EXAMPLE/TRY) 단계 없음, 치료가 항상 원 스킬 레벨에서만 진행 | §20~22 |
| 6 | **Retention이 Mastery 확정에 관여하지 않음** — 당일 게이트 통과 = MASTERED. 스펙은 지연 기억 확인 후 확정(PROVISIONAL → MASTERED), 실패 시 WEAKENED | §25~26, §96 |
| 7 | 문제가 단일 스킬에만 연결됨 (multi-skill tagging 없음) | §6, §38 |
| 8 | Confidence·Metacognition 데이터 없음 | §36~37 |
| 9 | 합성 학습자 시뮬레이션 테스트 없음 | §101 |
| 10 | 선택 감사(Audit) 로그가 문자열 1개 — 컴포넌트별 점수 분해 없음 | §102 |

### A-3. 결정

**전면 재작성이 아니라 엔진 계층 교체**: UI·콘텐츠·저장소는 유지하고, `src/engine2/`에 6개 엔진을 새로 구축한다.
기존 생성기는 "micro-skill → (기존 단원, 레벨)" 어댑터로 연결해 검증된 문항을 그대로 쓴다.
UI 연결은 엔진이 headless 테스트(QA 1~10 + 시뮬레이션)를 통과한 뒤에만 진행한다 (§FINAL COMMAND).

---

## PART B — System Architecture

```
┌────────────────────────── UI (기존 화면 유지, 마지막에 연결) ──────────────────────────┐
│  Dashboard · Quest Player · Knowledge Map · Mistake Clinic · Parent · Diagnostic      │
└──────────────────────────────────────┬────────────────────────────────────────────────┘
                                       │  (순수 함수 호출만. UI에 학습 로직 금지 §79)
┌──────────────────────────────────────▼────────────────────────────────────────────────┐
│                              SESSION ORCHESTRATOR (session.ts)                        │
│   nextAction(twin, today) → 무엇을 할 차례인가 (문제/프로브/마이크로레슨/복습/도전)      │
│   submitAttempt(twin, action, answer) → §110 핵심 알고리즘 실행, twin' 반환             │
└───┬──────────┬───────────┬───────────┬───────────┬───────────┬────────────────────────┘
    │          │           │           │           │           │
┌───▼───┐ ┌────▼────┐ ┌────▼────┐ ┌────▼─────┐ ┌───▼────┐ ┌────▼────┐
│ E1    │ │ E2      │ │ E3      │ │ E4       │ │ E5     │ │ E6      │
│ Know- │ │ Mastery │ │ Error & │ │ RootCause│ │Adaptive│ │Motiva-  │
│ ledge │ │ Estima- │ │ Miscon- │ │ & Remed- │ │Progres-│ │tion &   │
│ Graph │ │ tion    │ │ ception │ │ iation   │ │sion    │ │Flow     │
└───┬───┘ └────┬────┘ └────┬────┘ └────┬─────┘ └───┬────┘ └────┬────┘
    └──────────┴───────────┴─────┬─────┴───────────┴───────────┘
                          ┌──────▼──────────────────────────┐
                          │  DIGITAL MATH TWIN (단일 상태)    │
                          │  skills · misconceptions ·       │
                          │  agenda · attempts · snapshots   │
                          └──────┬──────────────────────────┘
                          ┌──────▼──────────────────────────┐
                          │  Repository (localStorage → 향후 │
                          │  Supabase 교체용 추상화)          │
                          └─────────────────────────────────┘
```

원칙: 모든 엔진은 **순수 함수** — `(twin, input) → (twin', 근거)`. React 미의존. node로 직접 테스트.
모든 임계값은 `config2.ts` 한 곳에서 관리 (§80). 모든 결정은 근거 객체를 함께 반환 (§75~76, §102).

---

## PART C — Curriculum & Knowledge Graph Model

### C-1. 3계층 구조

```
Track (교육과정: 중1 / 중2 / 중3 / 공통수학1 / … )   ← 기존 유지
  └─ Unit (단원: 일차방정식, 식의 계산, …)            ← 기존 19단원 유지 (UI 표시 단위)
       └─ Micro-Skill (M1.ALG.EQ.01 …)              ← 신규. 추적·치료·mastery의 실제 단위
```

### C-2. Micro-Skill 노드 스키마 (§8 준수)

```json
{
  "skillId": "M1.ALG.EQ.03",
  "nameKo": "일차방정식 활용(문장제)",
  "unit": "M1.ALG.EQ",
  "grade": "M1",
  "domain": "ALGEBRA",
  "prerequisites": ["M1.ALG.EQ.01", "M1.ALG.EQ.02", "M1.ALG.EXP.01"],
  "difficultyRange": [1, 5],
  "importance": 1.2,
  "microLesson": { "idea": "...", "why": "...", "example": "...", "try": "..." },
  "problemSource": { "generator": "M1.ALG.EQ", "levelByDifficulty": [5,5,5,5,5] }
}
```

`successors`는 저장하지 않고 그래프에서 역산한다(중복 데이터 방지).
한 문제는 `skills: []` + `primarySkill`로 여러 스킬에 연결된다 (§38). 정오답 증거는 primarySkill에 전액,
보조 스킬에 30% 가중으로 반영한다.

### C-3. Phase 1 파일럿 그래프 (10 micro-skills — §84)

```
M1.NUM.SIGN.01 부호 있는 수의 덧셈·뺄셈          (prereq 없음)
M1.NUM.SIGN.02 곱셈·나눗셈·거듭제곱의 부호        ← SIGN.01
M1.NUM.FRAC.01 분수의 사칙연산                   ← SIGN.01
M1.ALG.EXP.01  문자식과 동류항                   ← SIGN.01
M1.ALG.EXP.02  분배법칙과 전개                   ← EXP.01, SIGN.02
M1.ALG.EQ.01   일차방정식 기본 풀이               ← EXP.01, SIGN.01
M1.ALG.EQ.02   괄호·분수 방정식                  ← EQ.01, EXP.02, FRAC.01
M1.ALG.EQ.03   일차방정식 활용(문장제)            ← EQ.01, EQ.02, EXP.01
M1.FUN.COORD.01 좌표평면                         ← SIGN.01
M1.FUN.COORD.02 그래프 위의 점과 규칙             ← COORD.01, EXP.01
```

이 그래프는 **의도적으로 깊이 3~4의 체인**(EQ.03 → EQ.02 → FRAC.01 → SIGN.01)을 갖는다 —
multi-level root cause tracing(§7, QA 2)을 검증하기 위해서다.

---

## PART D — Chloe Digital Math Twin

```typescript
interface DigitalTwin {
  studentId: string; name: string;
  skills: Record<SkillId, SkillState2>;        // PART O 참조
  misconceptions: MisconceptionInstance[];      // 활성/해결된 오개념
  agenda: AgendaItem[];                         // 프로브·치료·복습 등 "해야 할 일" 큐
  attempts: Attempt2[];                         // 전체 풀이 기록 (증거의 원천)
  snapshots: DailySnapshot[];                   // 성장 그래프·주간 비교용
  behavior: {                                   // 스킬 횡단 특성
    hintDependency: number;                     // 최근 30문제 중 힌트 사용 비율 (EWMA)
    carelessRate: number; confidenceBias: number;  // (자신감 − 실제 정답) 평균
    learningVelocity: number;                   // 최근 14일 신규 MASTERED/PROVISIONAL 수
  };
  xp: number; streak: number; lastActiveDate: string | null;
}
```

핵심 설계: **트윈은 단일 직렬화 가능 객체**이고 모든 엔진은 이 객체만 읽고 쓴다.
학생은 단일 학년으로 정의되지 않는다 — 영역(domain)별 grade-equivalent는
그 영역 스킬들의 상태에서 파생 계산한다 (§33).

---

## PART E — Mastery Estimation Model  *(§115: 구체 수식·임계값)*

### E-1. 왜 이 모델인가

BKT(Bayesian Knowledge Tracing)나 IRT를 도입할 수도 있으나, 초기 데이터가 없고 §11이
"설명 가능·감사 가능·config 조정 가능"을 요구하므로 **로그오즈(logit) 가산 증거 모델**을 선택한다.
이는 BKT의 단순화 버전과 수학적으로 동치 계열이면서, 모든 증거가 "몇 점짜리 증거였는지"
그대로 로그에 남아 §102의 감사 요구를 만족한다. 향후 실데이터가 쌓이면 가중치만 재튜닝하면 된다.

### E-2. 상태와 갱신 수식

각 스킬의 mastery는 확률 `p ∈ [0.02, 0.98]`, 내부 표현은 로그오즈 `L = ln(p / (1-p))`.

```
초기값:  진단 전 p₀ = 0.10 (L ≈ −2.20)
        진단 배치 시 p₀ = {d1 통과: 0.30, d2: 0.45, d3: 0.60, d4: 0.72}

매 시도 후:  L ← L + w      (w = 증거 가중치)
             p ← σ(L) = 1/(1+e⁻ᴸ),  [0.02, 0.98]로 클램프
```

**정답 증거** (모든 계수는 config2.ts):

```
w⁺ = W_BASE[d] × I(hints) × R(retry) × G(guess)

W_BASE[d]   = [0.25, 0.35, 0.45, 0.60, 0.80]     # 난이도 1~5. 어려운 문제일수록 강한 증거
I(hints)    = [1.0, 0.55, 0.30, 0.12][hints]     # Independence: 힌트가 많을수록 증거 약화 (§12-B)
R(retry)    = 자기교정으로 맞힘 → 0.5, 아니면 1.0
G(guess)    = 4지선다에서 풀이시간 < 0.2×예상시간 → 0.45, 아니면 1.0   # 추측 가드 (§116-Q2)
전이 성공    = 추가로 +0.50                        # Transfer는 최고 가중 증거 (§24)
복습(지연) 성공 = 추가로 +0.40                     # Retention 증거 (§12-D)
```

**오답 증거**:

```
w⁻ = −W_WRONG[d] × C(type)

W_WRONG[d]  = [0.90, 0.75, 0.60, 0.45, 0.35]     # 쉬운 문제를 틀릴수록 강한 음의 증거
C(type)     = CARELESS → 0.35                     # 단순 실수 1회로 폭락 금지 (§116-Q4)
              GUESSING → 0.6, TIME → 0.5, 그 외 → 1.0
전이 실패    = 추가 −0.40,  복습 실패 = 추가 −0.80  # 망각은 강하게 반영 (§96)
```

**오개념 캡**: 활성 misconception이 있는 동안 `p ≤ 0.60`으로 상한 —
아무리 정답을 쌓아도 오개념 해소 전에는 mastery로 인정하지 않는다 (§116-Q1 방어).

**다양성 감쇠**: 같은 스킬 연속 4회째부터 정답 증거 ×0.5 —
같은 유형 반복으로 mastery를 부풀릴 수 없다 (§116-Q3 방어).

### E-3. TRUE MASTERY 판정 (§12의 4요소 → 상태기계)

```
PROVISIONAL_MASTERY 진입 조건 (모두 충족):
  p ≥ 0.85                                        # Accuracy (확률 종합)
  최근 8회 중 무힌트 독립해결 비율 ≥ 0.8            # Independence
  현재 난이도의 Transfer 1회 이상 성공              # Transfer
  활성 misconception 없음, 열린 remediation 없음
  해당 스킬 시도 ≥ 6회                             # 최소 증거량 (추측 방어)

MASTERED 확정: PROVISIONAL 상태에서 지연 복습(1일 이후) 1회 통과   # Retention (§30 "최종 확정")
WEAKENED: 복습 실패, 또는 p가 0.85 이상에서 0.50 미만으로 급락
REVIEW_DUE: nextReviewAt ≤ today
REMEDIATION: 열린 치료 케이스 존재
상태 사슬: UNSEEN → EXPOSED(진단만) → LEARNING(<6회 or p<0.4) → PRACTICING → PROVISIONAL → MASTERED
                                              ↑__________________ WEAKENED ←┘ (복습 실패 시)
```

---

## PART F — Error Taxonomy

기존 v1 태깅을 2.0 명칭으로 확장 (§14). 분류 입력은 v1과 동일하게 3중:
① distractor 태그(생성 시점에 심어둔 "이 실수를 하면 나오는 값") ② 행동 신호(시간·힌트·재시도) ③ 이력.

```
CONCEPT_GAP, PREREQUISITE_GAP, CALCULATION_ERROR, SIGN_ERROR, FORMULA_ERROR,
READING_ERROR, INTERPRETATION_ERROR, STRATEGY_ERROR, LOGIC_ERROR, DIAGRAM_ERROR,
CARELESS_ERROR, TIME_PRESSURE, GUESSING, UNKNOWN
```

행동 규칙(요약): 풀이시간 < 0.2×예상 → CARELESS/GUESSING 계열로 조정,
힌트 3개 소진 후 오답 → CONCEPT_GAP, prerequisite p<0.6이면 CONCEPT_GAP → PREREQUISITE_GAP 승격.
분류 불가 시 UNKNOWN (억지 분류 금지).

---

## PART G — Misconception Detection

**Error ≠ Misconception** (§15). 판정 알고리즘:

```
detectMisconception(twin, skillId, errorTag):
  window = 해당 스킬 최근 10회 시도
  sameTagWrong = window에서 (오답 ∧ 같은 errorTag)인 시도 수
  distinctProblems = 그 시도들의 서로 다른 문제 수
  IF sameTagWrong ≥ 3 AND distinctProblems ≥ 2:      # 서로 다른 문제에서 같은 규칙 오류 = 신념
      entry = MISCONCEPTION_LIBRARY.find(skillId, errorTag)
      → 활성 misconception 등록 (entry 있으면 그 항목, 없으면 generic)
```

**해소 조건**: 해당 misconception의 `remediationSkill`에 대한 Minimum-Dose 치료 완료
**그리고** 트리거 스킬에서 같은 태그 없이 2연속 정답. 해소 시 mastery 캡(0.60) 제거.

라이브러리 초기 항목 (Phase 1, 계속 추가 §16):

| id | 트리거 (skill, tag) | 오개념 | remediation |
|---|---|---|---|
| MIS.SIGN.NEGSQ | SIGN.02, SIGN_ERROR | −a²을 (−a)²으로 처리 | SIGN.02 micro-lesson |
| MIS.EQ.MOVE | EQ.01, SIGN_ERROR | 이항 시 부호 유지 | EQ.01 |
| MIS.FRAC.ADDDEN | FRAC.01, CONCEPT_GAP | 분모끼리 더함 | FRAC.01 |
| MIS.EXP.DISTR | EXP.02, CALCULATION_ERROR | 분배 시 둘째 항 누락 | EXP.02 |
| MIS.EQ.WORDDIR | EQ.03, INTERPRETATION_ERROR | "~보다 많다" 방향 반전 | EQ.03 |
| MIS.COORD.ORDER | COORD.01, INTERPRETATION_ERROR | (x,y) 순서 혼동 | COORD.01 |

---

## PART H — Prerequisite Root Cause Algorithm  *(§115: 구체 의사코드)*

### H-1. 왜 이 방법인가

오답 즉시 유사문제를 퍼붓는 것은 원인을 모른 채 증상만 반복시키는 것이다.
**프로브(최소 문항 미니 진단)로 가설을 좁히고**, 실패한 선수개념으로 **재귀 하강**해
가장 아래층의 진짜 구멍을 찾는다. 프로브 비용(문항 수)을 아끼기 위해
"이미 안정(p ≥ 0.75)인 선수개념은 프로브하지 않는다".

### H-2. 의사코드

```
onWrongAnswer(twin, attempt):
  tag = classifyError(attempt)                       # PART F
  mis = detectMisconception(twin, skill, tag)        # PART G

  # 프로브가 필요한가?
  needProbe = (tag ∈ {CONCEPT_GAP, PREREQUISITE_GAP})
              OR (skill 연속 오답 ≥ 2)
              OR (mis 존재 AND mis.remediationSkill ≠ skill)
  IF NOT needProbe:
      # 단순 실수·추측·시간 → 같은 난이도 재도전만 예약 (난이도 인하 금지, §92)
      agenda.push(SIMILAR_RETRY(skill, 현재 난이도));  return

  # ---- PREREQUISITE PROBE (§19) ----
  suspects = prerequisites(skill)
             .filter(q → twin.p(q) < θ_stable(0.75))   # 안정 스킬은 건너뜀 (최소 문항 원칙)
             .sortBy(p 오름차순)
             .take(3)
  IF suspects 비어있음:
      rootCause = skill                                # 현재 개념 자체의 문제
  ELSE:
      agenda.push(PROBE(skill, suspects))              # 스킬당 1문제, 즉시 출제
      # 프로브 결과 수집 후:
      failed = probe에서 틀린 스킬들
      IF failed 비어있음:  rootCause = skill
      ELSE:
          root = argmin_{q ∈ failed} twin.p(q)
          # ---- 재귀 하강 (§7 multi-level, 최대 깊이 4) ----
          WHILE depth < 4:
              deeper = prerequisites(root).filter(p < 0.75)
              IF deeper 비어있음: BREAK
              agenda.push(PROBE(root, deeper.take(2)))
              failed2 = 프로브 실패 스킬들
              IF failed2 비어있음: BREAK
              root = argmin(failed2, p);  depth += 1
          rootCause = root

  agenda.push(REMEDIATION(rootCause, returnTo = 원 문제의 skill, 난이도))   # PART I
```

깊이 예: 중3 이차방정식 오답 → 프로브 {인수분해, 제곱근} → 인수분해 실패 →
프로브 {다항식 연산} → 실패 → 프로브 {부호 계산} → 실패 → **rootCause = 중1 부호 계산** (§7 예시 그대로).

---

## PART I — Minimum-Dose Remediation Algorithm

```
REMEDIATION(rootSkill, returnTo, returnDifficulty):
  1. MICRO_LESSON(rootSkill)          # IDEA/WHY/EXAMPLE/TRY — 화면 1장, 긴 강의 금지 (§22)
  2. FOUNDATION_CHECK: rootSkill d1~2 × 2문제        # 기초 확인
     실패 → rootSkill의 더 깊은 프로브로 재진입 (PART H)
  3. IF rootSkill ≠ returnTo:          # 아래층을 고쳤으면 원래 층으로 복귀
       BRIDGE: returnTo d(원래−1) × 1문제
  4. SIMILAR_A(returnTo, 원 난이도)    # 거의 동일 구조
  5. SIMILAR_B(returnTo, 원 난이도)    # 표현 변경
  6. TRANSFER(returnTo, 원 난이도)     # 새로운 상황
  7. 성공 → 케이스 완치, 복습 예약, returnTo 원 난이도로 복귀 (§20 "성공하면 바로 원래 수준")
  실패 규칙: 각 단계 2회 실패 시 한 단계 후퇴. TRANSFER 실패 시 → 개념 이해로 회귀 (§94):
             MICRO_LESSON부터 재시작하되 mastery는 PROVISIONAL 진입 불가.
```

**미완치 케이스가 열려 있는 동안 해당 스킬 승급 금지** (기존 v1 필수복습 게이트 유지).

---

## PART J — Adaptive Question Selection

```
priority(s) = Need × PrereqImportance × ForgettingRisk × CurriculumImportance
              × ErrorFrequency × Opportunity × Diversity

Need                = 1 − p(s)  (+0.1 하한)
PrereqImportance    = 1 + 0.2 × |successors(s)|
ForgettingRisk      = 1 + 0.15 × min(연체일, 10)          # REVIEW 지남
CurriculumImportance= skill.importance (기본 1.0, 핵심 1.2)
ErrorFrequency      = 1 + 0.25 × 최근30회 중 이 스킬 오답 수
Opportunity         = 상태 부스트: REMEDIATION 2.0 / WEAKENED 1.6 / REVIEW_DUE 1.5
                      / PRACTICING 1.2 / PROVISIONAL 0.8 / MASTERED 0.3
Diversity           = 직전 3문제에 등장한 스킬 ×0.5, 같은 스킬 4연속째 ×0.3   (§27)
```

agenda(프로브·치료·복습)가 비어 있을 때만 priority 선택이 작동한다 — **치료가 항상 신규 학습보다 우선**.
모든 선택은 `{skillId, difficulty, mode, breakdown: {각 항의 값}, reason}`을 반환한다 (§102).

**난이도 상승** (§29~30): `p ≥ 0.85 ∧ 독립해결률 ≥ 0.8 ∧ 해당 난이도 Transfer 통과` — 정답률만으로 불가.
**Fast Track** (§31): 무힌트·정상시간 3연속 정답 ∧ p ≥ 0.8 → Challenge Test(현 난이도+2, 1문제).
통과 시 중간 레벨 스킵. **Frustration Protection** (§35): 3연속 오답 → 원인 분류 후
(개념→프로브 / 실수→유지 / 과부하→d1 성공 경험 1문제 후 복귀).

---

## PART K — Transfer & Retention Model

- **Transfer** = 같은 개념·새 상황 (기존 transfer 생성기 재사용). 난이도별로 통과 기록.
  Similar A/B 성공 + Transfer 실패 = "풀이 암기" 신호 → mastery 증거 무효화·개념 회귀 (§94, QA 5).
- **Retention 스케줄**: PROVISIONAL 진입 시 [1, 3, 7, 14, 30]일. 통과 → 다음 간격 + p +0.40 로짓,
  첫 통과에서 MASTERED 확정. 실패 → 간격 리셋 + p −0.80 로짓 + WEAKENED + 치료 어젠다 (§25~26, QA 7).
- **Retention Score** = 통과 복습 수 / 예정 복습 수 (스킬·전체 단위 노출).

---

## PART L — Acceleration / Advanced Learning Model

```
readiness(다음과정) = 0.4×(핵심 prerequisite 평균 p) + 0.2×(Transfer 성공률)
                    + 0.2×(Retention Score) + 0.1×(1 − careless율) + 0.1×(최근 일관성)
READY ⇔ readiness ≥ 0.85 ∧ 핵심 prerequisite 전부 p ≥ 0.75 ∧ 심각 misconception 없음
```

문제 수·진도는 조건에 포함하지 않는다 (§33, §111). 영역별로 따로 판정 —
"대수는 M2, 기하는 M1"이 정상 상태다. Fast Track과 결합해 이미 아는 내용은 반복시키지 않는다 (QA 8, 10).

---

## PART M — Student UX (엔진 검증 후 연결)

기존 화면 유지 + 변경점만:
문제 화면에 선택적 Confidence 질문(5단계, 3문제에 1회 빈도) · Metacognition 질문(세션당 1~2회) ·
Micro Lesson 카드(IDEA/WHY/EXAMPLE/TRY) · Probe 모드("원인을 찾는 중" 배지, XP 부담 없음 명시) ·
Knowledge Map을 Unit 클릭 → micro-skill 트리 + 상태 색(6단계, 아이콘 병행 §48) ·
Root Cause 시각화(§50: 선수개념 체크리스트 + "이것부터 고치자" 버튼) ·
오답 표현은 항상 성장 언어("새로운 성장 포인트를 찾았어") (§47).

## PART N — Parent Dashboard

기존 주간 리포트 유지 + 추가: Gap Closure Rate, Error Recurrence Rate, Retention Score,
활성 오개념 목록(한국어 설명), 영역별 grade-equivalent, Advancement Readiness와 그 근거 (§53~55).
게임 요소 없음 — 분석 중심.

## PART O — Data Schemas (핵심만)

```typescript
type MasteryState = 'UNSEEN'|'EXPOSED'|'LEARNING'|'PRACTICING'|'PROVISIONAL_MASTERY'
                  |'MASTERED'|'REVIEW_DUE'|'WEAKENED'|'REMEDIATION';

interface SkillState2 {
  skillId: string;
  masteryProbability: number;          // 0.02~0.98
  masteryState: MasteryState;
  highestDifficultyPassed: number;     // 1~5
  currentDifficulty: number;
  attempts: number; correctAttempts: number;
  recentWindow: AttemptSummary2[];     // 최근 12
  independentRate: number;             // 최근 무힌트 비율
  transferPassedAt: Record<number, boolean>;   // 난이도별
  retention: { stage: number; nextReviewAt: string|null; passes: number; lapses: number };
  errorCounts: Record<ErrorType2, number>;
  activeMisconceptions: string[];
  lastPracticedAt: string|null;
}

interface Attempt2 {                    // §74 준수 + masteryBefore/After로 완전 감사 가능
  id, ts, problemId, skillId, secondarySkills, difficulty, mode,   // mode: normal|probe|remediation-*|transfer|retention|challenge
  correct, chosenIndex, solveTimeSec, hintsUsed, retryCount,
  confidenceBefore?, errorType?, misconceptionId?,
  masteryBefore, masteryAfter, evidenceWeight    // ← 이 시도가 몇 점짜리 증거였는지 기록
}

interface AgendaItem {                  // 오케스트레이터 큐
  kind: 'probe'|'micro-lesson'|'foundation'|'bridge'|'similarA'|'similarB'
       |'transfer'|'return'|'retention'|'challenge'|'ease';
  skillId; returnTo?; difficulty?; caseId?; createdTs;
}
```

문제은행 스키마는 §38대로 `skills[]`, `primarySkill`, `misconceptionTags`, `transferGroup` 필드를 추가한다.

## PART P — Test Strategy

1. **단위 테스트** (§100): mastery 갱신 수식(경계값·클램프·캡), 그래프 순회(순환 감지 포함),
   프로브 계획(안정 스킬 제외·최대 3), 상태기계 전이표, 복습 스케줄, readiness.
2. **QA 시나리오 1~10** (§90~99): 각 시나리오를 스크립트로 자동화. FAIL 조건 명시
   (예: QA 2에서 "중2 문제만 반복 출제 = FAIL"을 assert로 검사).
3. **합성 학습자 시뮬레이션** (§101): Learner A(강함)~G(빠른 추측형) 7종을 확률 정책으로 정의,
   각 200+ 시도 시뮬레이션 후 불변식 검사 — A는 fast-track 발생, C는 프로브가 실제 결손 스킬 적중,
   E는 misconception 감지, G는 p가 0.85를 넘지 못함(추측 가드) 등.
4. 기존 문제은행 검증(38,000문항·bank 무결성)은 그대로 CI 체인에 유지.

## PART Q — Phase 1 Implementation Plan

| 순서 | 작업 | 완료 기준 |
|---|---|---|
| 1 | `engine2/`: config2, types2, curriculum2(10 micro-skills + misconception 6종 + 문제 어댑터) | 타입체크 통과 |
| 2 | mastery2 (수식 E-2/E-3 + 상태기계) | 단위 테스트 통과 |
| 3 | errors2 + misconception (F, G) | 단위 테스트 |
| 4 | rootcause (프로브 계획·평가·재귀 하강, H) | 단위 테스트 |
| 5 | remediation (I) + retention2 (K) | 단위 테스트 |
| 6 | adaptive2 (J: priority+audit+fast track+frustration) | 단위 테스트 |
| 7 | session.ts 오케스트레이터 (§110 의사코드 구현) | — |
| 8 | **QA 1~10 + 시뮬레이션 7종 전부 통과** | 이것이 Phase 1의 정의 |
| 9 | 진단(adaptive, §42~43) — 오케스트레이터 위에 구현 | QA 통과 |
| 10 | 이후에만: UI 연결 (Quest/Map/Clinic/Parent를 engine2로 교체) | 브라우저 검증 |

의도적으로 **UI 연결이 마지막**이다 (§FINAL COMMAND).

---

## §116 SELF-CONSISTENCY AUDIT — 설계 모순 검사

| 질문 | 답 | 방어 장치 |
|---|---|---|
| 1. 학생이 mastery를 게임할 수 있는가? | 어렵다 | 같은 스킬 연속 정답 증거 감쇠(E-2), Transfer·Retention 없이는 PROVISIONAL 불가, 오개념 캡 0.60 |
| 2. 추측으로 가짜 mastery가 생기는가? | 아니다 | 4지선다 초고속 정답 증거 ×0.45, 최소 시도 6회, Transfer 필수. 추측만으로 p 0.85 도달 불가 (시뮬레이션 G로 검증) |
| 3. 유사문제 반복이 가짜 mastery를 만드는가? | 아니다 | 다양성 감쇠 + Similar만 성공하고 Transfer 실패 시 증거 무효화·개념 회귀 (QA 5) |
| 4. 부주의 1회로 스킬이 부당 강등되는가? | 아니다 | CARELESS 음의 증거 ×0.35. p 0.9에서 1회 부주의 → p ≈ 0.87. 강등은 반복 증거 필요 |
| 5. 학년을 넘는 prerequisite 결손을 찾을 수 있는가? | 예 | 재귀 프로브 최대 깊이 4 (H-2), 그래프가 학년 경계를 넘어 연결됨 (QA 2에서 검증) |
| 6. Error와 Misconception을 구분하는가? | 예 | 1회 = error, 서로 다른 문제 ≥2에서 같은 태그 ≥3회 = misconception (G). QA 4로 검증 |
| 7. Retention 실패가 mastery를 낮추는가? | 예 | −0.80 로짓 + WEAKENED + MASTERED 박탈 (QA 7) |
| 8. 잘하는 학생이 불필요한 반복을 건너뛰는가? | 예 | Fast Track Challenge Test(+2 난이도 1문제)로 레벨 스킵 (QA 8) |
| 9. 약한 학생이 무한 실패 루프에 빠지는가? | 아니다 | 3연속 오답 → 원인별 분기 + d1 성공 경험 → 복귀. 치료 단계 2회 실패 시 후퇴(더 쉬운 층으로) — 같은 곳에서 무한 반복 불가 (QA 9) |

발견된 설계 수정 2건 (검사 중 반영):
① 초기안은 misconception 캡이 없어 Q1에 취약 → **캡 0.60** 추가.
② 초기안은 프로브를 모든 선수개념에 실시 → 문항 낭비. **p ≥ 0.75 스킬 제외** 규칙 추가 (최소 문항 원칙).

---

## 다음 단계

이 보고서 승인 시 PART Q의 순서대로 Phase 1 구현을 시작한다.
구현 완료 시 §117 형식의 PHASE 1 COMPLETION REPORT를 제출한다.
