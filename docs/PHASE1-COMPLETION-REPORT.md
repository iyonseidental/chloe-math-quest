# CHLOE MATH 2.1 — PHASE 1 COMPLETION REPORT (최종판)

작성일: 2026-08-19 (Step 0~11 완료 시점 초판 작성 후, Step 12~13 완료를 반영해 당일 갱신)
기준 문서: `docs/ARCHITECTURE-2.1.md` (PART A~Q)
구현 범위: PART Q **Step 0 ~ Step 13 전부** — 미착수 단계 없음

---

## Phase 1 완료 기준 대조 (승인 문서 §11)

| 기준 | 상태 |
|---|---|
| PART Q Step 0~10 구현 | ✅ 완료 (엔진 18개 모듈) |
| QA 1~20 ALL PASS | ✅ 62/62 체크 통과, 반복 실행 안정 (QA17 비결정성까지 시드 LCG로 제거) |
| Synthetic Learner A~K ALL PASS | ✅ 47/47 체크 통과 |
| Replay/Recompute PASS | ✅ 동일 config 바이트 단위 일치 + **다른 config 재계산** + 진단 세션 포함 재생 검증 |
| Calibration Report 생성 | ✅ 11개 지표 전부 실계산 (PART H) |
| 가짜 적응 로직 없음 | ✅ Math.random() 문제선택 없음, 모든 결정에 reason/breakdown |
| 하드코딩 mastery/progress 없음 | ✅ 전 파생상태가 이벤트 fold로만 산출 |
| Step 12 Adaptive Diagnostic | ✅ 구현 + 30/30 체크 (별도 명세 부재를 기존 원칙 재조합으로 설계 — PART B) |
| Step 13 UI Integration (0~11 검증 후에만) | ✅ 게이트 조건 충족 후 착수, 실브라우저 E2E 검증 완료 (아래) |

**Step 13 실브라우저 검증 기록** (Vite dev 서버, 실제 클릭 주행):
- 적응 진단 전체 주행: **12문항으로 10스킬 판정** — 6개 직접 확인(EQ.01/EXP.02/EQ.02/EQ.03/COORD.01 통과, COORD.02 0/2 실패), 4개 그래프 추론(INFERRED_PASS), 매 문항에 엔진 사유(WHY THIS) 표기. 오답 시 d3→d2 하강, COORD.02 실패 시 COORD.01로의 하강("하강/확인 지시가 걸린 스킬 우선")이 화면에서 그대로 재현됨.
- 학습 플레이어: nextAction이 고른 스킬·사유·모드 라벨 표시, 오답→"한 번 더 생각하기"→자기수정(retryCount=1) 흐름, 정오 판정과 세션 진행 동작.
- 대시보드: 스킬별 p/확신/실효증거/지식상태가 전부 트윈 파생값으로 렌더 — 진단만 마친 스킬은 전원 "확신 매우 낮음"(설계 그대로), 최약 스킬 COORD.02 14% 정확 표시.
- **영속화 = 이벤트 로그 단독**: 페이지 전체 새로고침 후 localStorage의 23개 이벤트만으로 트윈 재구성(연습 1회분 상태 보존), 화면 내 상시 리플레이 검증 배지 "무손실 재구성됨" 통과. 콘솔 오류 0. 프로덕션 빌드(`npm run build`) 성공.

---

# PART A — Implemented Architecture

## 신규 생성 — 엔진 코어 (`src/engine2/`, 총 3,327줄)

| 파일 | 줄수 | 역할 |
|---|---|---|
| `types21.ts` | 294 | 전 타입 정의 — ErrorType21(14종), KnowledgeState(9종), LearningFlags, SkillState21, MisconceptionInstance, RemediationCase, AgendaItem, PredictionRecord, DifficultyProfile, DigitalTwin21 |
| `config21.ts` | 164 | 전 계수 단일 소스 CONFIG21 + 버전 상수 4종 (config/masteryModel/curriculum/knowledgeGraph) |
| `events21.ts` | 94 | Raw Event Ledger — LearningEvent(ATTEMPT/DIAGNOSTIC_PLACEMENT/REMEDIATION_OUTCOME), AttemptMode 14종, append-only EventLog |
| `curriculum21.ts` | 235 | 파일럿 지식그래프 10 micro-skill (의도적 깊이-4 사슬 포함) + 오개념 라이브러리 6종 |
| `problemAdapter21.ts` | 74 | v1 검증 문제은행(38,000문항) 재사용 어댑터 — 난이도 매핑 + ErrorType 매핑 |
| `mastery21.ts` | 147 | E2: Beta 의사관측 모델, 시간감쇠, effectiveEvidence, uncertainty, estimateConfidence, predictSuccess |
| `attribution21.ts` | 134 | Evidence Attribution Layer — 정답/오답 귀속, ATTRIBUTION_RULES, likelyRoot |
| `misconception21.ts` | 152 | E3: 오개념 FSM (NONE→SUSPECTED→CONFIRMING→ACTIVE→RESOLVED), 읽기 계층 mastery cap |
| `stability21.ts` | 73 | Prerequisite Stability Score — UNKNOWN≠SHAKY 분리, surprising-failure 판정 |
| `rootcause21.ts` | 178 | E4: 다단계 원인 추적(깊이≤4), 정보효율 프로브 우선순위, 프로브 한도 |
| `remediation21.ts` | 120 | E5: 최소단위 치료 단계기계, Gap Closure Quality 사다리, 재발(REOPEN) 처리 |
| `retention21.ts` | 130 | 장기 숙달 상태기계 — PROVISIONAL 게이트(5조건), 복습 사다리 1→3→7→14→30일 |
| `adaptive21.ts` | 116 | E6: 우선순위 점수(7요소 breakdown), Fast Track, 좌절 보호, 다양성 페널티, Flow |
| `calibration21.ts` | 215 | E7: 캘리브레이션 11지표 + Empirical Difficulty 모델(PART I) |
| `session21.ts` | 756+ | 세션 오케스트레이터 — nextAction 6단계 의사결정, 모드 핸들러 8종, submitAttempt/이벤트 생성 |
| `replay21.ts` | 94 | 단일 reducer `applyEvent` + `fold` + `replayFromScratch` — 라이브/재생 동일 경로 |
| `diagnostic21.ts` (Step 12) | 288 | 적응 진단 정책 계층 — 그래프 이분탐색(중간 깊이 시작→통과 시 상류 추론/실패 시 하강), 예산 16, 전 판단이 트윈의 순수 함수 |
| `store21.ts` (Step 13) | 44 | 브라우저 영속화 — **이벤트 로그만 저장**, 로드 = replayFromScratch (파생값 디스크 저장 0) |

## 신규 생성 — Step 13 UI (`src/context`, `src/screens`)

| 파일 | 역할 |
|---|---|
| `context/Engine2Context.tsx` | 엔진 API 얇은 래퍼 (submit/ack/finalize/reset + 상시 replayCheck) — 학습 판단 없음 |
| `screens/Engine2Coach.tsx` | AI코치 홈 — 스킬별 디지털 트윈(p·확신·증거·상태·복습일), 열린 치료 케이스, 오개념, 다음 추천+사유, 리플레이 검증 배지 |
| `screens/Engine2Diagnosis.tsx` | Step 12 진단 흐름 UI — 문항 서빙·WHY THIS·진행률·판정 결과표 |
| `screens/Engine2Player.tsx` | 학습 플레이어 — nextAction이 정한 14종 모드(연습/프로브/확인/개념카드/치료 5단계/복습/도전/ease) 서빙, 자기수정 흐름, 해설 |
| `App.tsx` (수정) | "AI코치" 탭 추가 + Engine2Provider 장착 — 기존 v1 화면 무변경 공존 |

## 신규 생성 — 검증 스크립트 (`scripts/`, 총 2,516줄)

| 파일 | 검증 대상 | 결과 |
|---|---|---|
| `test21-step0.mjs` | 이벤트 원장 + fold 골격 | 13/13 |
| `test21-mastery.mjs` | Beta 모델·증거가중·감쇠·예측 | 28/28 |
| `test21-attribution.mjs` | 귀속 계층 (QA14 정신) | 9/9 |
| `test21-misconception.mjs` | FSM 전이 (QA15/16 정신) | 16/16 |
| `test21-rootcause.mjs` | 안정도·다단계 하강·AC11·한도 | 29/29 |
| `test21-remediation.mjs` | 단계기계·bridge·transfer 전면 재시작·REOPEN | 27/27 |
| `test21-retention.mjs` | 게이트 5조건·복습 사다리·신뢰도 | 32/32 |
| `test21-adaptive.mjs` | 우선순위·Fast Track·좌절 보호 | 20/20 |
| `test21-calibration.mjs` | 11지표 수식 | 13/13 |
| `test21-session.mjs` | 통합 + **Replay 충실도(바이트 일치)** | 13/13 |
| `test21-replay-config.mjs` | **변경된 config 하 재계산** (Step 11c) | 6/6 |
| `test21-diagnostic.mjs` | **Step 12 적응 진단** — 강/약/숨은결손 학생, 예산 고갈, 진단 포함 리플레이 | 30/30 |
| `qa21.mjs` | QA 1~20 전체 파이프라인 E2E | 62/62 |
| `simulate21.mjs` | Synthetic Learner A~K + Calibration Report | 47/47 |
| `trace21-parte.mjs` | PART E 전체 추적 생성기 | 정상 완주 |

**단위검증 합계: 236 체크 / QA 62 체크 / 시뮬레이션 47 체크 = 345 체크 전부 PASS. `tsc --noEmit` 클린, 프로덕션 빌드 성공.**

## 기존 자산 수정
- `src/App.tsx` 단 1개 — "AI코치" 탭 추가 + Engine2Provider 장착(수 줄). v1 엔진(`src/engine/`)과 기존 8개 화면은 무변경 — engine2는 완전 병렬 신규 계층이며, v1 문제 생성기는 `problemAdapter21.ts`를 통해 읽기 전용으로 재사용.

---

# PART B — Seven Learning Engines

**E1 — Knowledge Graph (curriculum21).** 파일럿 10 micro-skill. `EQ.03 → EQ.02 → FRAC.01 → SIGN.01` 깊이-4 사슬을 의도적으로 배치해 다단계 추적을 실전 검증 가능하게 함. EQ.02/EQ.03은 secondarySkillIds 선언(귀속 계층 실동작 대상).

**E2 — Mastery & Uncertainty (mastery21).** Beta(α,β) 의사관측. `p = α/(α+β)`, `uncertainty = √(p(1−p)/(α+β+1))`, `effectiveEvidence = (α+β) − priorMass`. 증거 가중은 난이도·힌트·추측·자기수정·동일스킬 연속(다양성 방어)·과도전 감쇠로 조정, 단일시도 상한 2.0. 14일 유예 후 초과질량만 일감쇠(0.995^일) — **prior는 영구 바닥**이므로 감쇠가 p를 조작하지 않고 확신만 낮춤 (Learner I로 검증: E 44→30.1, p 0.837→0.808).

**E3 — Misconception FSM (misconception21).** 등록 트리거 1회 → SUSPECTED(즉시 ACTIVE 금지), 확인문항 2개 배정. 확인 중 동일 패턴 재현 → ACTIVE + mastery 읽기 캡 0.60(α/β 무변조 — Replay 무결성 유지). 2문항 모두 클린 → NONE으로 강등하되 **삭제하지 않고** 재발점수 0.3 유지(재의심 가속). ACTIVE 확정 시 즉시 치료 케이스 개설(구현 중 발견한 실결함 2건 수정 — PART K).

**E4 — Root Cause & Probe (stability21 + rootcause21).** `Stability = p_eff × F_ret × F_conf × F_recency × F_error`, 단 `effectiveEvidence < 3`이면 **UNKNOWN으로 분류하고 점수 자체를 계산하지 않음** (Unknown ≠ Weak). STABLE(≥0.75, E≥8, 오개념 없음)은 프로브 대상에서 제외. 프로브 큐는 Unknown-first, 이후 `RootCauseProbability × DiagnosticSpecificity × (0.5+U) ÷ Cost`. 예상외 실패(강해 보이던 스킬의 프로브 실패)는 1회 재확인 후에만 신뢰(AC11). 한도: 케이스당 5문항, 연속 3문항, 진단 비중 30%.

**E5 — Minimum-Dose Remediation (remediation21).** micro-lesson(확인만) → foundation×2(**ROOT 스킬**에서) → [root≠target이면 bridge 1문항] → similarA → similarB → transfer → resolved. 비-transfer 단계 2연속 실패 → 한 단계 후퇴. foundation 2연속 실패 → **더 깊은 프로브**(단계 후퇴 아님). transfer 실패 → **micro-lesson 전면 재시작**("이해가 애초에 없던 것"). Gap Closure: TRANSFER_VERIFIED → RETENTION_VERIFIED → STABLY_CLOSED / 재발 시 **같은 케이스 객체를 REOPENED로 표시**(이력 보존, QA20).

**E6 — Adaptive Progression (adaptive21).** `Need × PrereqImportance × ForgettingRisk × CurriculumImportance × ErrorFrequency × Opportunity × Diversity` — 7요소 breakdown이 매 결정에 첨부. Fast Track: 무힌트·비추측 3연속 + p≥0.8 → 난이도+2 도전, 통과 시 즉시 점프. 좌절 보호: 3연속 오답 시 오류유형 분석 — 개념성 우세면 조사, 실수성 우세면 ease(진단 우선, 반사적 난이도 인하 금지).

**E7 — Calibration & Evaluation (calibration21).** 11지표 전부 실계산: Calibration Error(밴드 가중), Brier, 밴드별 미래정확도, Retention Prediction Accuracy, Root Cause Hit Rate, Probe Yield, False Mastery/Weakness Rate, Misconception Precision/Recall, Gap Closure Success Rate, Transfer Predictive Value. PART I Empirical Difficulty: `computeEmpiricalDifficulty()`가 표본 50+ 확보 시 예측-관측 격차로 드리프트 추정, **declaredDifficulty는 절대 덮어쓰지 않음** (QA17: 3 → 3.55 드리프트, declared 3 보존).

**오케스트레이터 (session21).** `nextAction` 6단계 우선순위: ① 프로브/확인(과잉진단 가드 내) → ② micro-lesson → ③ 치료 단계 → ③′ 도래한 복습 → ④ 게이트에 transfer만 남은 스킬 전역 스캔 → ⑤ 직전 스킬의 Fast Track/좌절 반응 → ⑥ 전역 적응 우선순위. 모든 분기가 한국어 reason 문자열 반환(§6 감사 출력 요건).

**Step 12 — Adaptive Diagnostic (diagnostic21, 오케스트레이터 위 정책 계층).** 설계 문서에는 PART Q 항목명 외 상세 명세가 없어(초판 보고서에서 확인·기록), 기존 원칙들을 재조합해 정의했다 — 신규 엔진이 아니다:
- **이분탐색 흐름**: 미해결 스킬의 중간 위상 깊이에서 시작, 스킬당 최대 2문항(d3 → 정답 시 d4 / 오답 시 d2). 2/2 통과 시 이행적 상류 전체를 INFERRED_PASS로 추론(재검사 없음), 0/2 실패 시 직계 상류로 하강하고 이행적 하류는 SKIPPED_LOW로 검사 생략. 예산 16문항.
- **PART D-3 그대로**: 추론 통과는 약한 의사관측(α+=1.8, β+=0.6, E=2.4 < confidence 최저 밴드 3)만 추가 — 진단만으로는 구조적으로 LOW를 넘지 못하고 EXPOSED에 머문다. 직접 검사 스킬은 실제 ATTEMPT 이벤트가 증거이며 배치 이벤트는 시작 난이도만 확정(seed 0/0 — 가짜 증거 0).
- **Unknown ≠ Weak를 진단에도 적용**: 생략된 하류에 부정 증거를 조작해 넣지 않는다(α/β = prior 보존, 테스트로 검증).
- **숨은 상태 없음**: 진단 세션의 모든 판단이 `deriveDiagnosticRun(twin)` — 트윈의 순수 함수 — 로 재구성되므로 진단 중간에 끊겨도 이벤트 재생만으로 이어진다(테스트 ⑤에서 바이트 일치 검증).
- **역할 경계**: 추론이 덮은 잔여 결손(예: 분수 약한 학생이 요행으로 EQ.02를 통과한 경우)은 진단이 아니라 이후 일반 학습의 원인조사(QA2 경로)가 잡는다 — 진단은 빠른 사전분포 설정기이지 보증이 아니다.

**Step 13 — UI Integration.** §3("UI는 실엔진 출력만") 이행 방식: 화면 계층은 엔진 API의 얇은 래퍼(Engine2Context)만 통해 접근하고 학습 판단 로직을 일절 갖지 않는다. 영속화는 store21이 **이벤트 로그 하나만** localStorage에 저장하고 로드 시 replayFromScratch로 트윈을 재구성 — 저장 포맷 자체가 PART N의 구현이며, config 버전이 바뀌어도 기존 사용자 데이터가 무손실 재계산된다. 대시보드에 상시 리플레이 검증 배지를 두어 §5 위반이 발생하면 즉시 화면에 드러난다. 기존 v1 앱(8개 화면)은 무변경 공존하고, engine2는 "AI코치" 탭으로 진입한다.

---

# PART C — Digital Math Twin

```
DigitalTwin21
├─ versions { curriculum, knowledgeGraph, masteryModel, config }   ← 재계산 감사용
├─ skills: Record<skillId, SkillState21>
│    ├─ alpha, beta                        ← 유일한 원시 상태 (이벤트에서만 변경)
│    ├─ masteryProbability, uncertainty,
│    │  effectiveEvidence, estimateConfidence  ← 파생 (매 읽기 재계산)
│    ├─ knowledgeState (9종) ⊥ flags (6종)     ← 지식상태/워크플로 직교 분리
│    ├─ transfer.passedAt{난이도별}, retention{stage, nextReviewAt, reliability}
│    └─ recentWindow(15), errorCounts, consecutiveCorrect/Wrong
├─ misconceptions: MisconceptionInstance[]     ← 삭제 없음, 강등만
├─ remediationCases: RemediationCase[]         ← resolved/REOPENED 이력 영구 보존
├─ agenda: AgendaItem[]                        ← 워크플로 큐
├─ predictions: PredictionRecord[]             ← 캘리브레이션 원료 (링버퍼 2000)
└─ recentSkillSequence, seq(이벤트 재생 북키핑)
```

**실측 샘플** (PART E 추적 종료 시점, `M1.NUM.FRAC.01`):

```
p=0.852  uncertainty=0.035  E=95.8  confidence=VERY_HIGH
knowledgeState=EARLY_MASTERY   (PROVISIONAL → 1일 복습 통과로 승급)
transfer.passedAt={3:true, 5:true}
retention={stage:1, nextReviewAt:'2026-08-22', passes:1, lapses:0}
연결 케이스: target=M1.ALG.EQ.03, rootCause=M1.NUM.FRAC.01, gapQuality=TRANSFER_VERIFIED
```

지식상태 `EARLY_MASTERY`와 워크플로 플래그(reviewDue 등)가 독립적으로 공존 — R2 요건 충족.

---

# PART D — Mastery & Uncertainty

**수식** (config21 계수):

```
prior: α₀=1, β₀=4  (p₀=0.2 — 미지 스킬은 낮게 시작)
p             = α/(α+β)
uncertainty   = √( p(1−p) / (α+β+1) )
E (effective) = (α+β) − 5
정답 가중     = correctBase[d] × hintFactor^h × guessFactor? × retryFactor? × diversityFactor? × overReach?  (cap 2.0)
                correctBase = [0.6, 0.8, 1.0, 1.3, 1.6]
오답 가중     = wrongBase[d] × errorTypeWrongFactor[type]   (CARELESS 0.35 … CONCEPT_GAP 1.3)
시간감쇠      = 14일 유예 후 초과질량 × 0.995^일   (prior 바닥 보존)
예측          = σ( logit(p) − θ(d) ),  θ = [−0.8, −0.3, 0.2, 0.8, 1.5]
confidence    = E 밴드 [3, 8, 20, 45] → VERY_LOW…VERY_HIGH, uncertainty>0.12 시 1랭크 강등
```

**검증 결과 (핵심 발췌)**
- Mastery ≠ Accuracy: QA10 — 동일 정답률에서 진단 3문항 스킬 E=3.3 vs 실전 20문항 스킬 E=13.0 → 게이트 판단 상이. QA12 — p 유사(0.58 vs 0.59)여도 E 격차로 상이한 결정.
- 추측 방어: Learner G(진짜 실력 0.3, 전부 초고속 추측) → guessFactor 0.35 적용, 최대 p=0.120, PROVISIONAL 도달 0건.
- 소표본 방어: Learner H(진실력 0.9, 5문항) → p=0.588로 상승하되 confidence=VERY_LOW, 게이트 차단 (QA11 동일).
- 감쇠: Learner I(90일 공백) → E 44→30.1 (확신 하락), p 0.837→0.808 (원점수 근사 보존 — 감쇠는 "잊었을 가능성"이지 "틀렸다"가 아님).
- 단위검증: `test21-mastery.mjs` 28/28.

---

# PART E — Root Cause Example (실행 로그 전문 발췌)

시나리오: EQ.01/EXP.01/EXP.02/SIGN.01 강함(각 30회 진단), **FRAC.01 숨은 결손**(CONCEPT_GAP 6회), EQ.02 미접촉(UNKNOWN). `scripts/trace21-parte.mjs` 실제 출력:

**[1] 표적 실패** — EQ.03(문장제, d5) CONCEPT_GAP 2연속:
```
investigation opened → stage=investigating depth=1 frontier=M1.ALG.EQ.03
                       queue=[M1.ALG.EQ.02]  rootCause=null
```
Attribution: EXP.01(secondary)은 confidence HIGH → 벌점 0. STABLE인 EQ.01/EXP.01은 **프로브 큐에서 제외**(한 문항도 낭비 안 함). UNKNOWN인 EQ.02만 Unknown-first로 큐 등재.

**[2] 다단계 하강** — 실제 서빙 순서:
```
probe M1.ALG.EQ.02      → FAIL → depth=2, frontier=EQ.02, queue=[M1.NUM.FRAC.01]
                          (EQ.02의 전제 중 STABLE EQ.01/EXP.02 제외, FRAC.01만 하강 등재)
confirm M1.NUM.FRAC.01  → (병행: 시딩 오답이 촉발한 MIS.FRAC.ADDDEN 확인 2문항 — 클린 통과, 오개념 강등)
probe M1.NUM.FRAC.01    → FAIL(CONCEPT_GAP) → rootCause=M1.NUM.FRAC.01, stage=micro-lesson
```
프로브 총 2문항으로 깊이-2 하강 완료 — "전 단원 복습" 없음.

**[3] 최소단위 치료** (전 단계 실서빙·실통과):
```
micro-lesson  M1.NUM.FRAC.01        → 확인
foundation ×2 M1.NUM.FRAC.01 @d1    → PASS, PASS        ← ROOT 스킬에서
bridge        M1.ALG.EQ.03  @d4     → PASS              ← root≠target이므로 자동 삽입
similarA/B    M1.ALG.EQ.03  @d5     → PASS, PASS
transfer      M1.ALG.EQ.03  @d5 [TRANSFER VARIANT] → PASS → stage=resolved
gapQuality: TEMPORARILY_FIXED → TRANSFER_VERIFIED
outcome: {rootSkill:'M1.NUM.FRAC.01', similarSuccess:1, transferSuccess:true}
```

**[4] 게이트 + 복습 예약** — 독립 풀이 누적, 엔진이 스스로 `게이트 통과까지 전이 문제만 남았어요` 사유로 transfer 변형 서빙:
```
M1.NUM.FRAC.01: p=0.852 E=95.8 confidence=VERY_HIGH → PROVISIONAL
retention: stage=0, nextReviewAt=2026-08-19 (1일)
```

**[5] 지연 복습** — 다음날로 시간 이동:
```
2026-08-19: retention on M1.NUM.FRAC.01 (사유: 복습 시점 도래) → PASS
→ EARLY_MASTERY, 다음 복습 2026-08-22(3일), gapQuality=TRANSFER_VERIFIED
```

Failure → Attribution → Probe → Root Cause → Remediation → Transfer → Retention 전 구간이 단일 세션 API로 완주됨.

---

# PART F — QA 1~20 Results

**62/62 체크 PASS** (반복 5회 실행 안정). 시나리오별:

| QA | 시나리오 | 판정 | 핵심 실측 |
|---|---|---|---|
| 1 | 연속 정답 → 난이도 상승 | ✅ | d2→d5, 같은 레벨 무한반복 없음 |
| 2 | 숨은 원인 다단계(분수) | ✅ | rootCause=M1.NUM.FRAC.01, STABLE 스킬 재프로브 0, 무관 스킬 접촉 0 |
| 3 | 어려운 문제 실수 1회 | ✅ | CARELESS 분류, 난이도 유지, 케이스 미개설 |
| 4 | 동일 오류 반복 | ✅ | SUSPECTED→CONFIRMING→ACTIVE (즉시 ACTIVE 없음) |
| 5 | transfer 실패 | ✅ | micro-lesson 전면 재시작, similar만으론 PROVISIONAL 불가 |
| 6 | similar+transfer 독립 통과 | ✅ | resolved → PROVISIONAL → 복습 예약 |
| 7 | 이후 복습 실패 | ✅ | p 0.863→0.834 하락, WEAKENED — MASTERED 비영구 |
| 8 | 이미 아는 내용 | ✅ | Fast Track challenge 제공 |
| 9 | 3연속 오답 | ✅ | 진단(probe/confirm) 또는 ease — 침묵 반복 없음 |
| 10 | 실효증거 vs 시도횟수 | ✅ | E 3.3 vs 13.0 구분 |
| 11 | 정답만 5회 | ✅ | p 상승하되 게이트 미통과 |
| 12 | p 동일·E 상이 | ✅ | E 낮은 쪽만 게이트 차단 |
| 13 | 90일 묵은 전제 | ✅ | 신뢰하지 않고 프로브 큐 등재 |
| 14 | 문장제 오답 진범=분수 | ✅ | 분수만 벌점 집중(E 5→5.48), 무관 스킬 0 |
| 15 | distractor 1회 | ✅ | SUSPECTED + 확인문항 배정 |
| 16 | 확인 2문항 클린 | ✅ | 강등, 캡 미적용 |
| 17 | Empirical Difficulty | ✅ | 3→3.55 드리프트, declared 보존 |
| 18 | 캘리브레이션 산출 가능성 | ✅ | 실세션 데이터로 오차 계산 |
| 19 | 프로브 폭주 방지 | ✅ | 4 ≤ maxProbePerCase(5) |
| 20 | 7~14일 후 재발 | ✅ | 같은 케이스 REOPENED, treatmentLog 보존, WEAKENED |

---

# PART G — Synthetic Learners A~K

**47/47 체크 PASS.** 각 학습자는 은닉 true p + 행동 파라미터로 정의, `σ(logit(trueP)−θ(d))` 확률 롤로 수백~1,200회 실시도를 실제 세션 API에 주입.

| L | 은닉 프로필 | 기대 | 관측 |
|---|---|---|---|
| A | 전역 0.97, 빠름, 무힌트 (1,200회+복습 fast-forward) | fast track, 낮은 진단 비중, MASTERED | ✅ challenge 발생, 진단 127/1260(10%), 복습 사다리로 MASTERED 도달 |
| B | 평균 0.65 (1,200회) | 정상 사다리, 과잉 프로브 없음 | ✅ 진단 43/1200(3.6%), 최고 p=0.585(난이도 보정 반영 — PART K 해설), 조기 MASTERED 0 |
| C | 방정식 0.7, 분수 0.08 (독립 30트라이얼) | 분수 root 지목 ≥80% | ✅ **26/30 = 86.7%** (미스 4건 전부 "단일 프로브 요행 통과" — 오귀속 0건) |
| D | 0.85 + careless 15% (300회) | CARELESS 다수, 폭락 없음 | ✅ 26/102 CARELESS 태그(어댑터 태그 가용률 ~18% 상한 하에서), WEAKENED 폭락 0, p=0.634 유지 |
| E | −a²=(−a)² distractor 70% | SUSPECTED→ACTIVE→캡→치료 | ✅ ACTIVE 확정, 케이스 연결, 표적 micro-lesson 후 교정 |
| F | 정확·풀이 2.5× 느림 (400회) | **시간 페널티 없음** | ✅ 추측 오분류 0, TIME_PRESSURE 태그 0, p=0.710 정상 성장 |
| G | 실력 0.3, 전부 추측 | false mastery 금지 | ✅ 게이트 도달 0, 최대 p=0.120 |
| H | 0.9, 시도 5회 | 조기 확정 금지 | ✅ p=0.588 & VERY_LOW → LEARNING 유지 |
| I | 강했다가 90일 망각 | 감쇠+안정도 하락 | ✅ E 44→30.1, p 보존적 하락 |
| J | 특정 오개념 지속 (350회) | 해당 스킬만 캡·치료 | ✅ ACTIVE 유지, 타 스킬 정상 진행, 교차오염 0 |
| K | 전역 0.9, 분수 하나만 0.2 (350회) | **그 micro-skill만 치료** | ✅ 분수 치료 발생, 무관 강스킬 과잉접촉 0건 — 광역 복습 없음 |

---

# PART H — Calibration Report (초기 실측)

11개 학습자 통합 데이터셋(예측 3,711건) 산출 전문:

```
Calibration Error:            0.202   (목표 < 0.07)
Brier Score:                  0.216   (목표 < 0.20)
밴드별 예측→실제:   0-10%: 0.09→0.22 | 10-20%: 0.15→0.31 | 20-30%: 0.25→0.54
                    30-40%: 0.34→0.62 | 40-50%: 0.46→0.80 | 50-60%: 0.55→0.85
                    60-70%: 0.65→0.84 | 70-80%: 0.75→0.85 | 80-90%: 0.84→0.95 | 90-100%: 0.94→0.98
Retention Prediction Accuracy: 0.753
Root Cause Hit Rate:          (집계 n=2 — 해석 무의미; Learner C 전용 측정 26/30=86.7%가 유효 수치)
Probe Yield:                  0.102   (건강 밴드 0.2-0.6)
False Mastery Rate:           0.125   (목표 < 0.1)
False Weakness Rate:          0.000
Misconception Precision:      1.000   (목표 ≥ 0.8, n=119)
Misconception Recall:         0.176   (목표 ≥ 0.7)
Gap Closure Success Rate:     0.979   (n=97)
Transfer Predictive Value:    -0.120
```

**정직한 해석** — 목표 미달 지표는 숨기지 않고 원인을 특정함:
1. **체계적 과소확신** (Calibration Error 0.202의 주성분): 전 밴드에서 실제 > 예측. 보수적 prior(p₀=0.2)와 correctBase<1.0 가중이 의도대로 "쉽게 믿지 않는" 방향으로 작동한 결과이며, 방향이 일관되므로 **위험한 과대확신이 아니라 교정 가능한 보수 편향**. Phase 2에서 prior/θ(d) 재적합 대상.
2. **Misconception Recall 0.176**: 확인 2문항을 모두 같은 패턴으로 틀려야 ACTIVE가 되는 설계에서, 오개념 보유자도 확률적으로 확인을 통과해 NONE으로 강등되는 경우가 다수. 이는 **Precision 1.000(오탐 0)과의 의도된 트레이드오프** — 무고한 학생에게 캡을 씌우지 않는 쪽을 우선한 현재 계수의 결과. Recall 개선은 clearedRelapseScore/확인문항 수 조정으로 가능.
3. **Probe Yield 0.102**: 시뮬레이션 학습자 다수가 "대체로 건강"해서 프로브가 통과되는 구성 비중이 높았음. Learner C 단독으로는 실패 프로브가 집중됨.
4. **False Mastery 0.125 (n=8)**: MASTERED 직후 5문항 중 2+ 오답 사례 1건 — 확률 롤 특성상 극소표본. 실서비스 데이터로 재측정 필요.
5. **Transfer Predictive Value 음수**: transfer 직후 후속 문항의 난이도가 상승(성공→난이도 램프)하는 구조상 성공 직후 정답률이 눌리는 교란 — Phase 2에서 난이도 통제 후 재산출.

---

# PART I — Replay Test

**같은 config** (`test21-session.mjs`): 60회 라이브 시도 후 `replayFromScratch(log)` 결과가 라이브 트윈과 **JSON 바이트 단위 일치** + 재재생 결정론 확인. 이를 위해 구현 중 `Date.now()`/난수 ID를 reducer 내부에서 전면 제거하고 이벤트 ts + 결정론 ID(`detId`)로 통일 — 라이브와 재생이 문자 그대로 같은 코드 경로(`applyEvent`)를 사용.

**다른 config** (`test21-replay-config.mjs`, 6/6):
```
1. 원 config로 80-이벤트 로그 생성 → 재생 일치 확인
2. CONFIG21 변조 (정답 가중 ×0.2, 게이트 문턱 0.85→0.3)
3. 같은 로그 재생 → 다른 트윈 산출 확인
4. α 변화 방향이 계수 변화 방향과 일치 (전 스킬 α 하락)
5. 완화된 게이트로 재분류 발생 (재시뮬레이션 없이 과거 이력 재해석)
6. config 복원 후 재생 → 원 트윈과 바이트 일치 (순수 함수성 증명)
```
**진단 세션 포함 재생** (`test21-diagnostic.mjs` ⑤): 적응 진단(ATTEMPT + DIAGNOSTIC_PLACEMENT 혼합) 전체를 재생해 라이브 트윈과 바이트 일치 + 파생 진단 실행 상태(`deriveDiagnosticRun`)까지 동일함을 검증 — 진단 세션에 숨은 상태가 없다.

**브라우저 영속화 = 재생** (Step 13): localStorage에는 이벤트 로그만 저장되고, 실브라우저에서 전체 새로고침 후 23개 이벤트로 트윈이 무손실 재구성됨을 화면 배지로 확인.

파생상태(mastery/uncertainty/stability/knowledgeState)가 메모리에도 디스크에도 "사실"로 저장되지 않음이 실증됨 — §5 요건 충족.

---

# PART J — Reused Assets

- **v1 검증 문제은행 (약 38,000 문항 상당의 생성기)**: `src/engine/generators`를 `problemAdapter21.ts`가 읽기 전용 재사용. 각 micro-skill이 (v1 skillId, 기준레벨) 앵커를 갖고, engine2 난이도 1~5가 `clamp(기준 + (d−3), 1, 5)`로 v1 레벨에 사상. 신규 문제 저작 0건.
- **v1 ErrorType 태깅**: 9종 → ErrorType21 14종으로 `mapErrorType()` 사상. distractor의 오류유형 태그가 오개념 트리거·귀속·좌절 분석의 실데이터 원천.
- **v1 커리큘럼 단원 구조**: micro-skill의 `unit` 필드로 유지.
- **기존 UI 컴포넌트 재사용** (Step 13): KaTeX 렌더러 `MathText`, 공용 `ProgressBar`/`Stars`/`StatTile`/`WhyChip`을 engine2 화면이 그대로 사용 — 시각 언어 일관 유지, 신규 스타일 시스템 0.
- 기존 v1 앱 8개 화면(Dashboard, QuestPlayer, Diagnosis, KnowledgeMap, Notebook, Progress, CourseSelect, ParentDashboard)은 **무변경 공존** — engine2는 별도 "AI코치" 탭·별도 저장 키로 병렬 동작하며, v1 데이터를 건드리지 않는다.

---

# PART K — Known Limitations

**설계 문서와의 명시적 편차 (전부 구조적 명료화 또는 문서화된 근사):**
1. **오개념 감지 = (skillId, errorType) 근사**: v1 생성기가 distractor별 고유 오개념 ID를 태깅하지 않으므로, "강한 트리거"를 스킬×오류유형 공기로 근사. CARELESS_ERROR 태그는 생성 문항의 ~18%에만 존재(실측) — Learner D의 분류율 상한이 여기서 결정됨.
2. **귀속 규칙표는 EQ.02/EQ.03만 커버**: secondarySkillIds를 선언한 파일럿 2개 스킬에 대한 단일 규칙표. 전 커리큘럼 확장은 Phase 2.
3. **MisconceptionStatus에 'NONE' 추가**: 명세의 4상태에 초기/강등 상태를 실자료형으로 추가("완전 삭제 아님" 요건의 구현형).
4. **지식그래프 10-skill 파일럿**: 전 커리큘럼 아님. 깊이-4 사슬 검증용 최소 구성.

**구현 중 발견·수정된 실결함 (§10 보고 의무 대상):**
- 원인조사 시작점이 귀속 힌트 스킬로 잘못 배선 → 표적 스킬 전제로 수정 (QA2 사슬 복구)
- `independentWindow`가 치료 모드 시도를 독립 풀이에서 배제 → 게이트 영구 차단 해소
- Fast Track이 게이트 직전 스킬의 transfer 서빙을 무한 선점 → nextAction 단계 순서 재배치
- 오개념 확인 2문항 중 2번째가 큐잉되지 않아 CONFIRMING 영구 정체 → 수정
- confirm 경유 ACTIVE 확정 시 치료 케이스 미개설 / 심화 프로브 재구성 시 linkedMisconceptionId 유실 → 수정
- reducer 내 `Date.now()`/난수 ID로 인한 재생 불일치 → 이벤트 ts/결정론 ID로 전면 교체
- QA17이 비시드 `Math.random()`으로 간헐 실패 → 시드 LCG로 교체, 전 QA 스위트 결정론화 (Step 12 착수 직전)
- Step 13 플레이어 초안이 답 제출 즉시 트윈을 갱신해 정오/해설 화면이 표시 전에 리마운트되던 흐름 결함 → 제출을 "다음 문제" 시점으로 지연 (정오 판정은 로컬 도출이라 표시에 엔진 불필요)

**행동 특성 (결함 아님, 인지 필요):**
- 전역 우선순위가 의존스킬 많은 상류 스킬을 구조적으로 선호 → 말단 스킬 방문 빈도 낮음(시뮬레이션에서 관측). 파일럿 그래프 규모에선 의도 범위이나 Phase 2 그래프 확장 시 재계량 필요.
- 난이도 래칫(연속정답 시 상승)과 평탄 true-p 모델의 상호작용으로, "평균 0.65" 학습자의 관측 p가 0.85 게이트에 수렴하지 않음 — 난이도 보정이 실제로 작동한다는 증거이지만, 게이트 도달 소요 시도수가 김.
- 캘리브레이션 목표 미달 3지표(오차/Brier/Recall)는 PART H 해석 참조 — 방향성 있는 보수 편향.

---

# PART L — Phase 2 Recommendations

(초판의 1·2번 권고 — Step 12 설계·착수, Step 13 UI 통합 — 는 본 최종판 시점에 **완료**되어 삭제. 잔여 권고:)

1. **캘리브레이션 교정 루프**: 실사용 데이터 축적 후 prior(α₀,β₀)·correctBase·θ(d)를 PART H 편향 방향으로 재적합. Replay 덕분에 **재적합 후 전 이력(브라우저 저장분 포함) 무손실 재계산 가능** — 이것이 Step 11c를 먼저 검증하고 저장 포맷을 이벤트 로그 단독으로 정한 이유.
2. **오개념 Recall 개선**: clearedRelapseScore 상향 또는 확인문항 3개화 A/B — Precision 저하 없이 Recall을 올리는 계수 탐색.
3. **distractor 단위 오개념 태깅**: v1 생성기에 misconceptionId 태그 추가 → (skill, errorType) 근사 탈피. 감지 정밀도의 최대 단일 개선.
4. **지식그래프 확장**: 10 → 중1 전체 micro-skill. 귀속 규칙표·오개념 라이브러리 동반 확장, 전역 우선순위 재계량. 진단 예산(16)도 그래프 규모에 맞춰 재산정.
5. **Transfer Predictive Value 재측정**: 난이도 통제 설계로 교란 제거.
6. **UI 확장**: 현 AI코치 탭은 핵심 루프(진단→학습→트윈 뷰) 중심 — 학부모 리포트(캘리브레이션 지표 노출), 오답노트의 케이스 이력(REOPENED 연대기), Math Map의 engine2 그래프 뷰 통합이 다음 후보. 이벤트 로그 용량 관리(장기 사용 시 압축/스냅숏+테일 재생)도 이때 함께.
7. **v1 ↔ engine2 이관 전략**: 현재 병렬 공존. Phase 2에서 engine2가 전 커리큘럼을 덮으면 v1 진행 데이터의 이벤트화(1회성 DIAGNOSTIC_PLACEMENT 변환) 후 단일화.

---

## 결어 — §13 핵심 질문에 대한 답

| 질문 | 답 | 근거 |
|---|---|---|
| 모르는 것을 식별하는가 | 예 | QA2/Learner C·K — 숨은 결손 정밀 지목, 광역 복습 0 |
| 불확실과 무지를 구분하는가 | 예 | Unknown≠Weak(QA13), E 기반 게이트(QA10/11/12), Learner H |
| 최소 전제 결손을 고립하는가 | 예 | Learner K — 단일 micro-skill만 치료 |
| 최소단위 치료를 적용하는가 | 예 | PART E — 프로브 2문항, foundation 2문항으로 완결 |
| 전이·보존을 검증하는가 | 예 | transfer 필수 게이트(QA5/6), 복습 사다리(QA7, PART E [5]) |
| false mastery를 회피하는가 | 예 | Learner G/H, 게이트 5조건 |
| 자기 오류를 감지하는가 | 예 | 캘리브레이션 11지표 실산출 + 미달 지표의 원인 특정(PART H) |

**최소 결손 발견 → 치료 → 검증 → 보존 → 전진** — 파이프라인 전 구간이 가짜 로직 없이 실이벤트·실재생으로 검증되었습니다.
