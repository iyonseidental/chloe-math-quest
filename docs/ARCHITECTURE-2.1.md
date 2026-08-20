# CHLOE MATH 2.1 — ARCHITECTURE REVISION REPORT

> 추가된 최상위 원칙: **Never confuse what the system believes with what the system actually knows.**
> — 모든 추정값(p)에는 그 추정에 대한 확신도(U, E)가 반드시 동행한다.

작성일: 2026-08-18 · 기반: v2.0 승인 + 8개 필수 수정 · 상태: **설계 단계 (구현 금지 준수)**

---

## PART A — v2.0에서 유지하는 설계

Micro-Skill Knowledge Graph · Multi-level prerequisite tracing · Root Cause 진단 · Minimum-Dose Remediation ·
Similar A→B→Transfer · 확률적 Mastery · Error/Misconception 구분 · Delayed Retention · 감사 가능한 Adaptive 선택 ·
Fast Track · Frustration Protection · 합성 학습자 시뮬레이션 · **엔진 우선, UI 최후** 개발 순서 ·
기존 38,000 검증 문항 자산의 어댑터 재사용. — 전부 변경 없음.

## PART B — v2.1에서 변경되는 구조 (8개 수정 요약)

| # | v2.0 | v2.1 |
|---|---|---|
| R1 | 1일 복습 1회 통과 → MASTERED | PROVISIONAL → EARLY → MASTERED → STABLE의 장기 사다리 (PART H) |
| R2 | 지식·워크플로 상태가 한 enum에 혼재 | KnowledgeState + LearningFlags 분리 (PART C) |
| R3 | secondary skill 고정 30% 증거 | Evidence Attribution Layer — 진단 후 귀속, 고정 비율 폐지 (PART F) |
| R4 | p ≥ 0.75면 프로브 생략 | Prerequisite **Stability Score** (mastery×기억×확신×최신성×오류안정) (PART E) |
| R5 | p 단일값 | p + uncertainty + effectiveEvidence + estimateConfidence (PART D) |
| R6 | 난이도 = 선언값 고정 | DifficultyProfile: declared + empirical 학습 (PART I) |
| R7 | 같은 태그 3회 → 즉시 오개념 | NONE→SUSPECTED→CONFIRMING→ACTIVE 3단계 + 확인 프로브 (PART G) |
| R8 | 엔진 6개 | + **E7 Calibration & Evaluation Engine** — 시스템 자신을 검증 (PART J) |

추가 채택: Raw Event 보존 + Replay/Recompute (PART N), 버전 필드(curriculum/graph/masteryModel/config), 과잉 진단 방지 한도.

---

## PART C — Knowledge State vs Workflow State 분리 (R2)

**원칙**: "무엇을 아는가"(느리게 변하는 지식 상태)와 "지금 무엇을 해야 하는가"(빠르게 변하는 작업 플래그)는 다른 종류의 정보다.
`MASTERED이면서 오늘 복습 예정`은 정상 상태이며, 이제 자연스럽게 표현된다.

```typescript
type KnowledgeState =
  | 'UNSEEN'        // 어떤 증거도 없음
  | 'EXPOSED'       // 진단 문항만 접함
  | 'LEARNING'      // E < 6 또는 p < 0.40
  | 'PRACTICING'    // 학습 중, 게이트 미달
  | 'PROVISIONAL'   // 당일 기준 4중 조건 충족 (PART H)
  | 'EARLY_MASTERY' // +1일 기억 확인
  | 'MASTERED'      // 3·7일 기억 확인
  | 'STABLE_MASTERY'// 14일+ 기억 확인
  | 'WEAKENED';     // 기억 실패·재발로 강등 (이력 보존)

interface LearningFlags {         // 지식 상태와 독립적으로 켜지고 꺼짐
  reviewDue: boolean;             // 오늘 복습 예정 (모든 mastery 단계와 공존 가능)
  remediationOpen: boolean;       // 치료 케이스 진행 중
  prerequisiteProbeOpen: boolean; // 이 스킬이 프로브 대상으로 걸려 있음
  transferRequired: boolean;      // 게이트에 전이 증거만 남음
  misconceptionSuspected: boolean;
  misconceptionActive: boolean;
}
```

전이 규칙: KnowledgeState는 **오직 mastery 증거**(PART D·H)로만 바뀐다.
플래그는 스케줄러·진단기가 관리하며 KnowledgeState를 건드리지 않는다.
UI 표기는 내부 상태를 단순화해 보여준다: PROVISIONAL/EARLY → "거의 정복", MASTERED/STABLE → "정복" (§R1 "UI와 내부 상태 분리" 준수).

---

## PART D — Mastery + Uncertainty Model (R5) — 핵심 수정

### D-1. 표현: Beta 의사관측(pseudo-count) 모델

v2.0의 로그오즈 가산 모델을 **Beta(α, β) 의사관측 모델**로 교체한다. 선택 이유:
(a) p와 불확실성이 하나의 일관된 통계 구조에서 나온다 (별도 휴리스틱 불필요),
(b) 모든 증거가 "α에 +0.8" 같은 가산 기록으로 남아 완전 감사 가능,
(c) 증거의 질(힌트·추측)을 관측의 '무게'로 자연스럽게 표현,
(d) Replay(PART N)가 단순한 fold 연산이 된다.

```
prior:  α₀ = 1, β₀ = 4                       # p₀ = 0.20, 약한 사전믿음
p  = α / (α + β)                              # mastery 추정값
E  = (α + β) − (α₀ + β₀)                      # effectiveEvidence (질 가중 증거량 ≠ 시도 횟수)
U  = √( p(1−p) / (α + β + 1) )                # posterior 표준편차 = uncertainty

estimateConfidence:                            # E와 U 둘 다 사용
  VERY_LOW  E < 3          LOW  E < 8         MEDIUM  E < 20
  HIGH      E < 45         VERY_HIGH  E ≥ 45  (단 U > 0.12면 한 단계 강등)
```

### D-2. 증거 갱신 (모든 계수 config, masteryModelVersion으로 버전 관리)

```
정답:  α += e⁺
  e⁺ = E_BASE[d] × I(hints) × G(guess) × R(retry) × Div
  E_BASE[d1..d5] = [0.6, 0.8, 1.0, 1.3, 1.6]
  I(hints)       = [1.0, 0.55, 0.30, 0.12]      # Independence
  G(guess)       = 4지선다 & 풀이시간 < 0.2×예상 → 0.35, 아니면 1.0
  R(retry)       = 자기교정 정답 0.5
  Div            = 같은 스킬 4연속째부터 0.5    # 반복 부풀리기 방지
  전이 성공  α += 1.5   /   지연복습 통과  α += 1.2
  단일 시도 상한: e⁺ ≤ 2.0                      # AC9 방어 (요행 1회 폭등 금지)

오답:  β += e⁻   (단, 귀속 확정 후에만 — PART F)
  e⁻ = E_WRONG[d] × C(type)
  E_WRONG[d1..d5] = [1.6, 1.3, 1.0, 0.8, 0.6]   # 쉬운 문제 오답 = 강한 음의 증거
  C: CARELESS 0.35 · GUESSING 0.6 · TIME 0.5 · 그 외 1.0
  전이 실패  β += 1.2   /   복습 실패  β += 2.0

주의: 정답 증거에 시간 페널티 없음 — 느리지만 정확한 학생을 과소평가하지 않는다 (AC2 반영, v2.0 slowPenalty 폐지)
```

### D-3. §115의 5개 질문에 대한 답

1. **Uncertainty 초기화**: prior만 있을 때 E=0, U≈0.163 (최대치), confidence VERY_LOW. 진단 배치는 p를 '설정'하지 않고 의사관측을 '추가'한다 (예: d4 통과 → α+=1.8, β+=0.6) — 진단만으로는 confidence LOW를 넘지 못한다.
2. **Uncertainty 감소**: 질 가중 증거가 쌓여 α+β가 커질수록 U = √(p(1−p)/(α+β+1))가 줄어든다. 힌트·추측 시도는 무게가 작아 U를 거의 줄이지 못한다.
3. **장기 미학습 시 재증가**: 예 — **시간 감쇠**. lastPracticedAt 이후 14일 유예를 지나면 일마다 (α,β) ← prior + (초과분)×0.995. 90일 방치 시 증거 질량 ≈ 68%로 축소 → U 상승, p는 prior 쪽으로 소폭 회귀. 읽기 시점 lazy 계산(전체 스캔 없음, 확장성 요구 충족).
4. **힌트·추측·전이·복습의 영향**: 힌트/추측은 e⁺ 무게 축소로 p와 확신 모두 천천히 증가. 전이·지연복습은 가장 큰 무게(1.5/1.2)로 p와 확신을 동시에 크게 강화 — "새 상황·시간 경과를 이긴 증거가 최고 품질"이라는 학습과학 원칙의 수치화.
5. **effectiveEvidence vs 시도 횟수**: 시도 10회여도 전부 힌트 3개+추측이면 E ≈ 1.5. E는 "정보량"이며, 게이트·stability·프로브 결정은 전부 E를 쓴다. raw count는 통계 표시용으로만 남는다.

---

## PART E — Prerequisite Stability Score (R4)

```
Stability(s) = p_eff × F_ret × F_conf × F_recency × F_error

  p_eff     = masteryProbability (ACTIVE misconception 시 0.60 캡 적용값)
  F_ret     = 0.70 + 0.30 × retentionReliability      # rel = passes/(passes+2·lapses), 무데이터 0.5
  F_conf    = 1 − min(0.40, 1.5 × U)                  # 불확실성 페널티
  F_recency = 0.99^max(0, 지난일수 − 14)               # 90일 방치 → ×0.47
  F_error   = 1 − min(0.40, 0.15 × 최근10회 오답수)

프로브 생략(skip) 조건 — 세 가지 모두:
  Stability ≥ 0.75
  E ≥ 8 (estimateConfidence ≥ MEDIUM)
  misconception ACTIVE/SUSPECTED 없음
```

**Unknown ≠ Weak** (핵심 원칙): `E < 3`이면 Stability를 계산하지 않고 **UNKNOWN**으로 분류한다.
UNKNOWN은 "약함"이 아니라 "모름" — 치료 대상이 아니라 **프로브 최우선 대상**이다.
예: 신선한 p=0.80 (E=30, U=0.06, 어제 학습) → Stability ≈ 0.80×0.94×0.91×1×1 = 0.68 → 어? 이 예시는 skip 불가.
보정: 건강한 스킬 기준값 검산 — p=0.85, rel=0.8(F_ret 0.94), U=0.05(F_conf 0.93), 최근 학습, 무오류 → 0.85×0.94×0.93 = **0.74**. 임계 0.75가 지나치게 엄격하므로 **F_ret 무데이터 기본값을 0.85로 상향**(복습 이력이 없는 신생 스킬을 과도하게 불신하지 않음) → 0.85×0.955×0.93 = **0.755** 통과. (설계 검산으로 발견·수정한 값 — config: `stabilityThreshold = 0.75`, `retReliabilityDefault = 0.85`)

QA 13이 검증하는 사례: p=0.80이지만 90일 전 학습·복습 이력 없음 → F_recency 0.47 → Stability ≈ 0.30 → 프로브 실시.

---

## PART F — Evidence Attribution Model (R3)

고정 30% 규칙 폐지. **"진단이 끝나기 전에는 벌점을 주지 않는다"**가 새 원칙이다.

```
처리 순서 (오답):  Wrong → Error Diagnosis → Skill Attribution → (필요시 Probe) → Mastery Update

interface SkillEvidence {
  skillId: string;
  role: 'primary' | 'secondary';
  attributionProbability: number;   // 이 스킬이 원인일 확률 (합=1)
  evidenceWeight: number;           // 실제 적용된 α/β 증가량
  reason: string;                   // "부호 실수 distractor 선택 → SIGN 스킬 귀속"
}
```

**정답일 때**:
- primary: e⁺ 전액.
- secondary: `estimateConfidence ≤ LOW`인 스킬에만 e⁺×0.15 (정보가 없는 스킬에 대한 약한 양의 신호).
  이미 confidence MEDIUM+면 **0** — 정보 이득이 없는 곳에 증거를 흘리지 않는다.

**오답일 때** — 즉시 벌점 금지, 귀속 파이프라인:
1. distractor 태그가 특정 스킬을 지목하면 (예: 방정식 문장제에서 분수 계산형 오답 선택) 해당 스킬 귀속확률 0.6, primary 0.3, 나머지 0.1.
2. 태그가 primary 개념 자체를 지목하면 primary 0.8.
3. 귀속확률 최대 스킬이 secondary이고 그 스킬 Stability가 UNKNOWN/낮음 → **프로브 1문제로 확정**.
4. 확정 후: 원인 스킬에 e⁻ 전액 × 귀속확률, primary에는 e⁻×0.2 (문제 맥락에서 실패한 약한 신호), **무관한 secondary는 0**.
5. CARELESS/GUESSING/TIME 판정 시: primary에만 축소 계수 적용, secondary 전원 0.

이 구조로 QA 14(분수가 진범인 문장제 오답 → 분수 스킬에만 집중 벌점)가 보장된다.

---

## PART G — Misconception: SUSPECTED → CONFIRMING → ACTIVE (R7)

```
suspicionScore(m) 누적:
  라이브러리 등록 진단 distractor 선택(강신호)  +1.0
  같은 (skill, errorTag) 오답(약신호)           +0.5
  깨끗한 정답(트리거 스킬)                      −0.3   (하한 0)

상태기계:
  NONE       → SUSPECTED   : score ≥ 1.0
  SUSPECTED  → CONFIRMING  : 확인 프로브 2문제 예약 (해당 오개념을 판별하는 distractor 포함 문항)
  CONFIRMING → ACTIVE      : 확인 2문제 중 ≥1에서 동일 사고패턴(그 distractor 또는 동型 오답)
  CONFIRMING → NONE        : 2문제 모두 깨끗한 정답 → score 0.3으로 강등 (완전 삭제 아님 — 재발 시 빠른 재의심)
  ACTIVE     → RESOLVED    : remediationSkill 최소치료 완료 + 트리거 스킬 무태그 2연속 정답

캡 규칙: p ≤ 0.60 캡은 ACTIVE에서만. SUSPECTED/CONFIRMING은 캡 없음 (§R7 명시 준수).
캡 구현: 원시 (α,β)는 손대지 않고 판독 계층에서 min(p, 0.60) — RESOLVED 즉시 원래 추정 복원, Replay 무결성 유지.
```

```typescript
interface MisconceptionInstance {
  misconceptionId: string;
  status: 'SUSPECTED' | 'CONFIRMING' | 'ACTIVE' | 'RESOLVED';
  evidenceScore: number;
  triggeringAttempts: string[];
  confirmationAttempts: string[];
  firstDetectedAt: string;
  resolvedAt?: string;
}
```

QA 15(강신호 1회 → SUSPECTED+확인 프로브, 즉시 ACTIVE 금지)와 QA 16(확인 2문제 통과 → 의심 해제, 캡 없음)이 이 상태기계로 직접 보장된다.

---

## PART H — Long-Term Mastery State Machine (R1)

```
                       ┌────────────────────────────────────────────┐
                       ▼                                            │ (복습 실패 / 재발)
PRACTICING ──게이트──▶ PROVISIONAL ──1d 통과──▶ EARLY_MASTERY        │
                       │                        │                   │
                       │                        ├─3d & 7d 연속 통과─▶ MASTERED
                       │                        │                   │
                       │                        │        14d 통과 & 30d 무실패──▶ STABLE_MASTERY
                       └──────── 실패 ──────────┴───────────────────┴──▶ WEAKENED
                                                                        │ (치료+재게이트)
                                                                        └──▶ PROVISIONAL (이력 보존)

PROVISIONAL 게이트 (TRUE MASTERY 5요소 — Evidence Confidence 추가):
  ① p ≥ 0.85                       (Accuracy)
  ② 최근 8회 무힌트 독립해결 ≥ 0.8   (Independence)
  ③ 현 난이도 Transfer ≥ 1 통과      (Transfer)
  ④ E ≥ 10 ∧ confidence ≥ MEDIUM    (Evidence Confidence — 신설. QA 11 방어)
  ⑤ ACTIVE misconception 없음, 열린 치료 케이스 없음
  (Retention은 게이트가 아니라 그 이후의 사다리)

복습 간격은 상태와 연동: PROVISIONAL[1d] → EARLY[3d,7d] → MASTERED[14d] → STABLE[30d, 이후 유지 점검]
실패 시: 해당 단계에서 WEAKENED + β += 2.0 + 간격 1d로 리셋 + 치료 어젠다. 이전 도달 이력은 삭제하지 않는다 (Gap Reopen 추적, QA 20).
```

**Gap Closure Quality** (Parent 리포트용 내부 상태):
`TEMPORARILY_FIXED → TRANSFER_VERIFIED → RETENTION_VERIFIED → STABLY_CLOSED / REOPENED` —
치료 케이스가 상태 사다리를 따라 올라가며, REOPENED 시 이전 케이스와 링크된다.

---

## PART I — Empirical Difficulty Model (R6)

```typescript
interface DifficultyProfile {
  declaredDifficulty: number;       // 1~5, 사람 설정 (Phase 1의 유일한 판단 기준)
  empiricalDifficulty?: number;     // 데이터 기반 추정
  difficultyConfidence?: number;    // 0~1
  sampleSize?: number;
}
```

- 집계 단위: **문제 템플릿**(생성기 × 레벨 × 변형) — 생성 문항은 무한하므로 개별 문항이 아닌 템플릿 단위로 통계.
- Phase 1 추정식 (IRT 없이 설명 가능): 시도자 mastery로 보정한 성공률 residual을 레벨 오프셋 θ(d)=[−0.8,−0.3,0.2,0.8,1.5] 눈금에 사상 →
  `empirical = declared + (기대성공률 − 관측성공률)/0.10 × 0.5레벨` (선형 근사, sampleSize ≥ 50부터 산출).
- 사용 규칙: `difficultyConfidence ≥ 0.7`이면 adaptive 선택과 증거 가중에 empirical을 **보조 지표로 혼합** (declared 0.5 + empirical 0.5). declared는 절대 덮어쓰지 않는다.
- 향후: 관측 로그가 그대로 IRT 2PL 적합의 입력이 되도록 (문항템플릿, 학생 p, 정오) 튜플을 이벤트에 보존.
- QA 17: 시뮬레이션 인구에서 declared 3 문항이 L4 수준 성공률을 보이면 empirical ↑, declared 불변을 검증.

---

## PART J — E7: Calibration & Evaluation Engine (R8)

역할: **학생이 아니라 시스템 자신을 평가한다.** "Is the system actually correct about Chloe?"

```
저장 (이벤트, PART N과 공유):
  PredictionRecord { attemptId, skillId, predictedP̂, difficulty, 실제 결과, masteryModelVersion, configVersion }
  P̂(correct) = σ( logit(p) − θ(d) )        # 예측은 시도 '직전' 상태로 기록

핵심 지표 (전부 시뮬레이션에서 먼저 검증, 이후 실데이터 전환):
  Calibration Error   = Σ_bins |평균 P̂ − 실제 성공률| × bin 비중   (목표 < 0.07)
  Brier Score         = mean( (P̂ − outcome)² )                    (목표 < 0.20)
  Band별 미래 성공률   : 0.5–0.6 → 56% 처럼 단조 증가해야 함
  Retention 예측 정확도: EARLY+ 스킬의 복습 통과율 vs 예측
  Root Cause Hit Rate : (시뮬레이션: 심어둔 결손을 프로브가 지목한 비율, 목표 ≥ 0.8)
  Probe Yield         : 실패를 발견한 프로브 / 전체 프로브 (0.2~0.6 밴드 유지 — 너무 높으면 skip이 과감, 너무 낮으면 과잉 프로브)
  False Mastery Rate  : MASTERED 도달 후 직후 5회 중 2회+ 실패 비율 (목표 < 0.1)
  False Weakness Rate : WEAKENED 판정 후 즉시 재검에서 통과한 비율
  Misconception P/R   : (시뮬레이션 ground truth 대비) precision ≥ 0.8, recall ≥ 0.7
  Gap Closure Success : 치료 케이스의 RemediationOutcome 기반 재발률
  Transfer Predictive Value : 전이 통과가 이후 신규 유형 성공을 예측하는 정도

RemediationOutcome {rootSkill, preMastery, postMastery, similarSuccess, transferSuccess, retentionSuccess?, recurrenceWithin30Days?}
```

산출물: 개발자용 Calibration 화면(문항 밴드표 + 지표 대시보드)은 **엔진 검증 후** UI 단계에서.
Phase 1에서는 지표 계산 함수 + 시뮬레이션 리포트 출력까지가 범위.

---

## PART K — Updated Root Cause Algorithm

v2.0 대비 변경: 후보 평가에 p 단독이 아니라 **Stability + Uncertainty + 오개념 증거**를 쓰고, Unknown과 Weak를 구분한다.

```
onWrong → 분류/귀속(PART F) 후 프로브 필요 판정:

candidates = prerequisites(skill) 분류:
  STABLE   (Stability ≥ 0.75 ∧ E ≥ 8 ∧ 무오개념)  → 프로브 생략
  UNKNOWN  (E < 3)                                → 프로브 필수 (약점 아님 — 정보 수집)
  SHAKY    (그 외)                                → 프로브 후보

rootCauseProbability(q) ∝ (1 − Stability(q))
                        × (1 + misconceptionEvidence(q))
                        × (1 + 0.3×recentErrorRecurrence(q))
                        × attributionProbability(q)          # PART F의 오답 귀속과 연결

프로브 실행: PART L의 우선순위로 최대 한도까지 → 실패 스킬로 재귀 하강 (깊이 ≤ 4)
  단, "놀라운 실패"(Stability ≥ 0.75였던 스킬의 프로브 실패)는 1문제로 강등하지 않고
  확인 1문제를 추가한다 — 프로브 자체의 실수 가능성 방어 (AC11)
모두 통과 → rootCause = 현재 스킬 개념 → 현재 스킬 micro-lesson부터 치료
```

## PART L — Information-Efficient Probe Selection

```
ProbePriority(q) = RootCauseProbability(q) × DiagnosticSpecificity(q) × (0.5 + U(q)) ÷ ProbeCost(q)

  DiagnosticSpecificity: 이 프로브가 후보들을 얼마나 갈라내는가
    - 오개념 확인 문항(특정 distractor 판별): 1.0
    - 단일 후보만 검사하는 일반 문항: 0.7
    - 여러 후보가 공유하는 상위 개념 문항: 0.5 (성공해도 정보가 적음)
  (0.5 + U): 불확실한 스킬일수록 프로브의 정보 이득이 큼
  ProbeCost: 예상 소요 시간(초)/60 — 짧은 문항 우선

휴리스틱 순서 규칙 (Phase 1): ① UNKNOWN 먼저 ② 공통 조상보다 말단(leaf) 스킬 먼저
  (말단이 통과하면 그 조상들도 간접 신뢰 ↑ — 한 문제로 여러 후보 배제)

과잉 진단 방지 (config 제안값):
  maxProbePerCase = 5          # 치료 케이스당
  maxConsecutiveProbes = 3     # 연속 프로브 (사이에 반드시 일반/성공경험 문제)
  maxDiagnosticShare = 0.30    # 세션 문제 중 진단성(프로브+확인) 비중 상한
  한도 도달 시: 현재까지 최저 Stability 스킬을 잠정 root로 채택하고 진행 (완벽한 진단보다 학습 지속)
```

## PART M — Updated Digital Math Twin Schema

```typescript
interface SkillState21 {
  skillId: string;
  // 추정과 확신 (R5)
  alpha: number; beta: number;               // 원시 의사관측 (p·U·E는 파생)
  masteryProbability: number;                // = α/(α+β), 캡 적용 전 원값
  uncertainty: number;
  effectiveEvidence: number;
  estimateConfidence: 'VERY_LOW'|'LOW'|'MEDIUM'|'HIGH'|'VERY_HIGH';
  // 상태 (R2)
  knowledgeState: KnowledgeState;
  flags: LearningFlags;
  // 난이도 진행
  highestDifficultyPassed: number; currentDifficulty: number;
  // 통계
  attempts: number; correctAttempts: number; independentRate: number;
  transfer: { passedAt: Record<number, boolean>; attempts: number; passes: number };
  retention: { stage: number; nextReviewAt: string|null; passes: number; lapses: number; reliability: number };
  errorCounts: Record<ErrorType, number>;
  suspectedMisconceptions: string[]; activeMisconceptions: string[];
  prerequisiteStability: number;             # 캐시 (읽기 시 재계산 가능)
  lastPracticedAt: string | null;
}

interface DigitalTwin21 {
  studentId: string; name: string;
  versions: { curriculum: string; knowledgeGraph: string; masteryModel: string; config: string };
  skills: Record<SkillId, SkillState21>;
  misconceptions: MisconceptionInstance[];
  agenda: AgendaItem[];                      // probe / confirm / lesson / foundation / similar / transfer / retention / ease
  events: LearningEvent[];                   // PART N — 원본 (최근 N + 스냅샷)
  remediationCases: RemediationCase[];       // outcome·reopen 링크 포함
  behavior: { hintDependency; carelessRate; confidenceBias; learningVelocity };
  snapshots: DailySnapshot[];
  xp: number; streak: number; lastActiveDate: string | null;
}
```

## PART N — Raw Events / Replay Architecture

```
LearningEvent (append-only):
  { seq, ts, type: 'ATTEMPT'|'PROBE_RESULT'|'MISCONCEPTION_CONFIRMATION'|'REVIEW_RESULT'
        |'REMEDIATION_OUTCOME'|'DIAGNOSTIC_PLACEMENT',
    payload: {...원시 사실만: problemId/템플릿, chosenIndex, 시간, 힌트, confidence, 정오...},
    versions: { masteryModel, config } }

원칙: 파생값(p, U, Stability, readiness, 상태)은 절대 이벤트에 '사실'로 저장하지 않는다.
      단 감사 편의를 위해 Attempt에 masteryBefore/After를 '주석'으로 병기 (재계산 시 무시).

Replay:  twin = fold(events, config, curriculum)
  - 모든 엔진 갱신 함수가 순수 fold 단계이므로 자동 성립
  - config/가중치 변경 시: recompute(events, newConfig) → 새 twin (원본 무손실)
  - 확장성: localStorage에는 [최신 스냅샷 + 이후 이벤트 tail(≤2,000)]만 유지.
    스냅샷은 매일 1회 갱신. Replay는 스냅샷 기점 부분 재생 (전체 스캔 회피).
  - 향후 Supabase 이전 시 이벤트 테이블이 그대로 서버 원장이 된다.
```

## PART O — QA 1~20 (Input / Expected / FAIL 명시)

| # | Input | Expected | 명시적 FAIL 조건 |
|---|---|---|---|
| 1 | L2 빠른 무힌트 연속 정답 | p·E↑, 난이도↑, Challenge Test, fast track | 같은 레벨 반복 출제 지속 |
| 2 | 중2 오답, 진짜 원인 중1 분수 | 프로브 → 분수 결손 발견 → 미니 치료 → 검증 → 중2 복귀 | 중2 문제만 반복 |
| 3 | 어려운 문제 부호 1개 실수 | CARELESS/SIGN, β += e⁻×0.35만 | 즉시 난이도 인하 |
| 4 | 같은 잘못된 규칙 반복 | SUSPECTED→CONFIRMING→ACTIVE + 표적 치료 | 단순 CALCULATION 처리 지속 |
| 5 | Similar A/B 성공, Transfer 실패 | mastery 게이트 불통과, 개념 회귀 | PROVISIONAL 진입 |
| 6 | Similar+Transfer 독립 성공 | PROVISIONAL + 1d 복습 예약 | 복습 미예약 |
| 7 | 당일 완벽, 7일 후 실패 | p↓(β+=2.0), WEAKENED, 복습 리셋 | MASTERED 유지 |
| 8 | 쉬운 내용 빠르고 정확 | Challenge Test → 레벨 스킵 | 쉬운 문제 계속 출제 |
| 9 | 3연속 실패 | 원인 분류 → d1 성공 경험 → 복귀 | 어려운 문제 계속 |
| 10 | 핵심 prerequisite 안정 | M2 Readiness Check 발동 | 문제 수 기준 승급 |
| 11 | 5문제 전부 정답 (E 낮음) | p 상승하되 confidence ≤ LOW, PROVISIONAL 불가(게이트 ④) | STABLE로 조기 확정 |
| 12 | p 동일 0.85, E 상이(70 vs 5) | E 낮은 쪽: 추가 증거 수집 우선, E 높은 쪽: 게이트/전이 진행 | 두 학생에게 동일 결정 |
| 13 | p=0.80, 90일 미학습, 복습 무이력 | Stability ≈ 0.3 → 프로브 실시 | Stability가 신선한 0.80과 동일 |
| 14 | 문장제 오답, 진범은 secondary 분수 | 분수 스킬에 벌점 집중, 무관 secondary 0 | 모든 스킬 일괄 감점 (30% 규칙) |
| 15 | 오개념 distractor 1회 선택 | SUSPECTED + 확인 프로브 2 | 즉시 ACTIVE 또는 3회까지 무반응 |
| 16 | 확인 프로브 2문제 모두 통과 | 의심 해제/강등, 캡 없음 | ACTIVE 판정 또는 캡 유지 |
| 17 | declared 3, 실제 성공률 L4 수준 (모집단) | empirical ↑, declared 보존 | declared 덮어쓰기 or empirical 불변 |
| 18 | true ability를 아는 합성 학습자 | 예측 P̂와 실제 성공률로 calibration 지표 산출 가능 | 지표 계산 불능 / 밴드 비단조 |
| 19 | root cause 불확실성 최대 상황 | 프로브가 maxProbePerCase=5, 연속 3 초과 안 함 | 한도 초과 진단 폭주 |
| 20 | 치료+전이 통과 후 7~14일에 동일 오류 재발 | Gap REOPENED, WEAKENED, 이전 케이스 링크, 이력 보존 | 재발 무시 or 이력 소실 |

## PART P — Synthetic Learners A~K (hidden true profile → 기대 행동)

| L | Hidden Profile | 기대되는 엔진 행동 (assert) |
|---|---|---|
| A | 전 스킬 true p 0.9, 빠름, 무힌트 | fast track 발생, 진단성 문제 비중 낮음, MASTERED 도달 |
| B | 평균 0.65, 고른 분포 | 정상 사다리, 완만한 성장, 과잉 프로브 없음 |
| C | 방정식 0.7이지만 분수 true 0.25 | 프로브가 분수를 root로 지목 (Hit ≥ 80%) |
| D | true p 높음, careless 15% | careless 분류 다수, 난이도 유지, p 폭락 없음 |
| E | −a²=(−a)² 오개념 (해당 distractor 70% 선택) | SUSPECTED→ACTIVE, 캡 발동, 표적 치료 후 RESOLVED |
| F | 정확하나 풀이시간 2.5× | **mastery 불이익 없음** (시간 페널티 폐지 검증), TIME 오분류 없음 |
| G | 진짜 실력 0.3, 전부 빠른 추측 | G(guess)=0.35 → E 거의 안 쌓임, p < 0.85 유지, PROVISIONAL 불가 |
| H | true 0.9, 그러나 시도 5회뿐 | p 높아도 confidence LOW → 조기 확정 없음 (QA 11) |
| I | 과거 안정, 90일 미학습 후 망각 (true 0.5로 하락) | 시간 감쇠 + Stability 하락 → 프로브/복습 우선 배정 |
| J | 특정 오개념 지속 + 그 외 정상 | 오개념 스킬만 캡·치료, 다른 스킬 정상 진행 |
| K | 중2 전반 true 0.9, 단 "음수×분수" 하나만 0.2 | **정확히 그 micro-skill만 치료** — 중1 광역 복습이 발생하면 FAIL |

시뮬레이션 방법: 각 학습자를 (스킬별 true p, 행동 파라미터)로 정의 → 문제 정답 확률 = σ(logit(true p) − θ(d)) → 200+ 시도 실행 → 위 assert + PART J 지표 산출 (QA 18).

## PART Q — Updated Phase 1 Implementation Order

```
0  이벤트 원장 + Replay fold 골격 (PART N)          ← 모든 것의 토대 (데이터 무결성 1순위)
1  config21 (전 계수 + 버전 필드) / types21 (PART C·M)
2  E2 Mastery & Uncertainty (Beta 모델 + 감쇠 + confidence)      [unit]
3  Evidence Attribution Layer (PART F)                            [unit]
4  E3 Misconception FSM (PART G)                                  [unit]
5  Stability Score + E4 Root Cause + Probe 선택/한도 (E·K·L)      [unit]
6  E5 Remediation + RemediationOutcome + Gap Closure Quality      [unit]
7  장기 상태기계 + Retention (PART H)                             [unit]
8  E6 Adaptive Progression (우선순위·fast track·frustration·다양성) [unit]
9  E7 Calibration 지표 계산기 (PART J)                            [unit]
10 Session Orchestrator (§110 + agenda 큐)
11 QA 1~20 자동화 + Synthetic Learner A~K 시뮬레이션 → 전부 통과가 Phase 1 완료 조건
12 Adaptive Diagnostic (오케스트레이터 위)
13 (이후에만) UI 연결 → PHASE 1 COMPLETION REPORT (§117)
```

---

## ADVERSARIAL DESIGN REVIEW — 15 Cases

| AC | 공격 | 판정 | 방어 근거 (수정 반영 포함) |
|---|---|---|---|
| 1 | 우연한 연속 정답 → 가짜 mastery? | 방어됨 | 4지선다 무작위 8연속 확률 1.5×10⁻⁵. 그 전에 게이트 ④(E≥10, MEDIUM)와 Transfer가 막음 |
| 2 | 느리지만 정확 → 과소평가? | **수정함** | v2.0의 slowPenalty를 정답 증거에서 **완전 제거**. 시간은 추측가드(과속)와 오답 분류에만 사용. Learner F로 검증 |
| 3 | 빠른 추측 다수 → 가짜 mastery? | 방어됨 | G(guess)=0.35로 E가 안 쌓임 → confidence 미달 → 게이트 불통과. Learner G로 검증 |
| 4 | 단일 micro-skill 결손에 광역 치료? | 방어됨 | Minimum-Dose 원칙 + 프로브가 결손 하나로 수렴(말단 우선) + Learner K가 회귀 방지 테스트 |
| 5 | 현재 개념 vs prerequisite 애매 | 방어됨 | 귀속확률 분산 저장(PART F) + 프로브로 해소. 해소 불가 시 한도 내에서 잠정 root + 낮은 confidence 기록 |
| 6 | 문제 형식 암기 | 방어됨 | Transfer가 게이트 필수 + Similar만 성공·Transfer 실패 시 개념 회귀 (QA 5) |
| 7 | 30일 미학습 후 옛 mastery 신뢰? | 방어됨 | 시간 감쇠로 U↑·Stability↓ + 복습 스케줄 자체가 만료 상태 → REVIEW_DUE flag |
| 8 | 오개념 distractor 1회 실수 선택 | 방어됨 | SUSPECTED까지만, 확인 프로브 2문제 통과 시 해제. 캡은 ACTIVE부터 (QA 15·16) |
| 9 | 초고난도 요행 1회로 폭등? | **수정함** | 단일 시도 증거 상한 e⁺ ≤ 2.0 신설 + 밴드 초과 문제(현 난이도+2↑) 증거 ×0.7 |
| 10 | 난이도 태그 오류로 왜곡? | **수정함** | Empirical Difficulty(PART I)가 편차 감지 + Calibration의 템플릿 이상치 → **quarantine 플래그** 신설 (검수 대상 표시, 학생 노출 지속하되 증거 가중 declared/empirical 혼합으로 완충) |
| 11 | 프로브에서 학생이 실수 → 오진? | **수정함** | "놀라운 실패"(고 Stability 스킬의 프로브 실패)는 확인 1문제 추가 후 판정 (PART K) |
| 12 | 치료 직후 성공, 1주 후 재발 | 방어됨 | Gap Closure Quality 사다리 + REOPENED 상태 + 케이스 링크 (QA 20) |
| 13 | 이미 잘하는 학생의 불필요 반복 | 방어됨 | Fast Track + 진단이 상위 프로브로 상향 + Readiness가 문제 수 무관 (QA 8·10) |
| 14 | 영역별 상이한 수준 강제 단일화? | 방어됨 | grade-equivalent는 영역별 파생값. 단일 학년 필드로 학습 결정하는 코드 경로 없음 (설계 계약으로 명시) |
| 15 | threshold 변경 후 과거 모델 재계산? | 방어됨 | 이벤트 원장 + 순수 fold + 버전 필드 → recompute(events, newConfig) (PART N) |

**검토 중 발견되어 v2.1에 반영한 수정 4건**: ① 정답 시간 페널티 폐지 (AC2) ② 단일 시도 증거 상한 + 초과 난이도 감쇠 (AC9) ③ 문항 템플릿 quarantine 플래그 (AC10) ④ 놀라운 프로브 실패의 2중 확인 (AC11). 추가로 PART E 검산에서 임계값 모순 1건 수정 (retReliabilityDefault 0.5→0.85).

---

## 결론

v2.1은 기능을 늘리지 않았다. 대신 시스템이 채림이를 **잘못 판단할 수 있는 경로 15개를 막았고**,
그 판단 자체를 감시하는 7번째 엔진(Calibration)을 추가했으며, 모든 판단을 원본 이벤트에서
재계산할 수 있게 만들었다. 이 보고서 승인 시 PART Q의 순서로 Phase 1 구현을 시작한다
(0~11이 엔진과 검증, UI는 13번 — 마지막이다).
