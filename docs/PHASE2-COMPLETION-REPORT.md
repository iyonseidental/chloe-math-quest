# CHLOE MATH 2.2 — PHASE 2 COMPLETION REPORT

작성일: 2026-08-19
기준 지시: "PHASE 2 — CALIBRATION HARDENING + FULL M1 EXPANSION + ELITE MATHEMATICS LAYER" (PART 0~48)
실행 순서: PART 43의 0→23을 순서 그대로 이행. GATE A/B/C 각각 조건 충족 후에만 다음 단계 진행.
버전: config `2.2.0` / masteryModel `2.2.0-ability-beta` / curriculum·graph `2.2.0-m1full(35)`
Baseline: `baselines/phase1-baseline.json` (PART 0 동결 — 2.1.0 전 계수·지표 보존, `--force` 없인 불변)

## 게이트 판정 요약

| 게이트 | 조건 (지시문) | 판정 |
|---|---|---|
| **GATE A** | Calibration·진단 유효성이 Phase 1보다 개선 | ✅ 6/6 조건 (아래 A~D) |
| **GATE B** | 중1 전체 그래프의 8개 무결 조건 | ✅ 8/8 (아래 E~F) |
| **GATE C** | Elite 엔진 7개 완료 조건 | ✅ 7/7 (아래 G~J) |
| 최종 스위프 | Phase 1 회귀 14스위트 + Phase 2 4스위트 + 빌드 | ✅ ALL PASS |

**검증 규모**: Phase 1 회귀 284 + qa21 62 + A~K 47, Phase 2 신규 그래프 228 + 동적 67 + ELITE QA 36 + L~R 16 = **총 740개 실행 assert 전부 PASS**. 벤치마크 시행 수천 회 별도.

---

# A. Calibration Before / After

## 원인 분석 (PART 1/3 — 숫자를 숨기지 않고 원인부터)

"전 밴드에서 actual > predicted"의 주범을 가설 4개로 분리 실증 (`calib-rootcause.mjs`):

| 가설 | 검증 방법 | 결론 |
|---|---|---|
| H4 **증거비율 구조 결함** | 정지점 수학: p\*=trueP ⇔ correctBase/wrongBase = exp(θd). 2.1 비율 [0.375~2.667] vs 필요 [0.449~4.482] | **주범**. 전 난이도 미달 → p\*가 참능력 아래 정지, 예측이 θ를 재차 빼 이중계상 (d5에서 −0.106) |
| H2 이중계상 실증 | trueP=0.7·d4 고정 300회 | p가 0.638에 수렴(능력 아님), 정지 상태 과소예측 0.070 실측 |
| H1 prior 지배 초기구간 | 예측 순번 버킷 분해 | 초기 gap +0.28~0.34, 후기에도 +0.11 잔존 (H4 잔류 편향) |
| H3 prior 보수성 | prior 4종 단독 변형 | **단독 효과 미미** (0.113→0.113~0.123) — prior는 주범 아님 |

## 튜닝 규율 (PART 2 — 지표 게이밍 금지)

- 3개 독립 모집단(TRAINING 1xxxx / VALIDATION 5xxxx / STRESS 9xxxx, 시드 공간 분리), 각 3 replicate.
- 후보 6종은 **원인 분석이 지목한 축만** 그리드. 선택은 TRAINING 평균으로만, 승자 1개만 holdout 평가.
- 지표 정의 무변경 (PART 44).

## Before / After (승자 R3: ratio=exp(θd), prior (1,3), cap 2.22)

| 지표 | Before (2.1) | After (2.2) | 비고 |
|---|---|---|---|
| Calibration Error — **VALIDATION(비튜닝)** | 0.123 | **0.087 (−29%)** | 밴드 역전 2→1 |
| Calibration Error — STRESS | 0.194 | 0.161 | |
| Calibration Error — A~K 동결 하네스 | 0.190 | 0.164 | |
| Brier — A~K | 0.219 | **0.195 (목표 0.20 최초 달성)** | |
| Brier — VALIDATION | 0.240 | 0.232 | 하한 0.223 (아래) |
| False Mastery — A~K | 0.125 | **0.045** | |
| False Weakness | 0.000 | 0.000 | 신규 폭증 없음 ✅ |
| Retention Pred. Acc. — A~K | 0.764 | 0.791 | |
| 추측 방어 (STRESS 전부-추측) | 유지 | 유지 (max p 0.322 < 0.85) | |

**정직한 한계 보고 — Brier 하한**: 완벽 캘리브레이션 시 이론 최소 Brier = E[actual(1−actual)]를 함께 산출했다. 우리 모집단에서 **0.215~0.225** — 적응 난이도가 성공률을 의도적으로 중간대(flow)에 유지하는 구조에서 원지시의 0.20은 접근 자체가 빠듯하고, VALIDATION의 0.232는 하한 0.223 대비 격차 0.009로 사실상 포화 상태다. 지표 정의는 바꾸지 않고 이 사실을 기록한다.

**부산물로 잡은 실결함**: `freshTwin21`의 prior 기본값 (1,4) 하드코딩이 CONFIG 변경과 탈동기화 — 미접촉 스킬이 유령 실효증거(E=1)를 갖던 버그. CONFIG 유도로 수정.

---

# B. Misconception Detection Before / After

## 측정의 정직성부터 (Phase 1 수치의 재해석)

Phase 1 보고서의 P=1.0은 **관대한 측정의 산물**이었다. 학습자 단위(보유자 30/미보유 30, 집중 구동 60회)로 재측정하자 기존 two-clean의 실력은 **P≈0.5~0.62** — "언젠가 한 번 패턴 재현이면 ACTIVE"인 생존분석형 구조라, 미보유자도 장기 노출에서 우연 착지(오답의 1/3~2/3이 태깅 distractor)로 결국 오탐된다.

## 구조 개선 3종 (PART 5-1/6)

1. **Distractor-수준 misconceptionId + diagnosticStrength** — v1 생성기의 기계적 오답 6곳에 태깅 (FRAC.ADDDEN, EQ.MOVE×2, EXP.DISTR, EQ.WORDDIR, SIGN.NEGSQ, COORD.ORDER). 이벤트에 `chosenMisconceptionId` + **`offeredMisconceptions`**(문항이 제시한 태그 목록 = 진단 기회의 분모)를 기록.
2. **비율 순차검정('rolling' 정책)** — "일관되게 그 오규칙의 산물을 고르는가"로 판정: 기회≥5에서 가중 매치율 ≥0.6 → ACTIVE / ≤0.35 → NONE(카운터 sticky — 재무장 FP 라운드 차단) / 첫 5기회 중 매치 4 → 조기 ACTIVE. 미보유자의 매치율은 대수법칙으로 1/3 부근에 수렴해 문턱을 영구히 못 넘는다.
3. **확인 문항의 진단형 서빙** — confirm은 태깅 distractor가 실제 생성되는 난이도(diagnosticDifficulty)로, 그리고 태그가 실리는 문항형이 나올 때까지 재생성해 서빙. "매 확인 = 유효 표본."

## A/B/C/D 실험 결과 (TRAINING 선택 → VALIDATION 확정)

| 정책 | TRAINING P/R | VALIDATION P/R |
|---|---|---|
| A two-clean (2.1) | 0.44~0.52 / 0.53~0.70 | 0.618 / 0.700 |
| B three-clean | 0.53 / 0.63 | — |
| C strong-fast | 0.52~0.59 / 0.53~0.67 | — |
| **D rolling (채택)** | **0.900 / 0.600** | **0.867 / 0.867** |

목표(P≥0.85 + R 대폭 개선) 충족 — Precision을 지키면서 Recall을 0.70→0.867로.

**미태깅 항목의 하이브리드**: 태그 없는 라이브러리 항목(신규 7종)은 비율 표본이 없으므로 two-clean 기계를 유지 — rolling에서 영구 CONFIRMING에 갇히는 결함을 차단. 태깅 확대는 PART N 과제.

**부산물 실결함 2건 수정**: ① 인스턴스 skillId가 '시도 스킬'로 기록돼 레벨 창 겹침 시 엉뚱한 스킬에 캡이 걸리던 버그 → 라이브러리 정식 triggerSkillId로 고정. ② 케이스가 타 오개념에 의심-링크된 상태에서 새 ACTIVE가 케이스·링크를 못 받던 누수 → ACTIVE가 비-ACTIVE 링크를 대체.

---

# C. Root Cause Benchmark

9개 유형 × 3개 그래프 위치 × 12시드 = 유형당 24~36, **총 276 trial/설정** (d2/d3 두 설정 = 552). 단순 PASS가 아니라 confusion matrix:

| 유형 (d3 최종) | HIT | target귀결 | 오귀속 | no-case(정답) | 정답률 |
|---|---|---|---|---|---|
| single-gap | 27 | 6 | 3 | — | 0.75 |
| two-competing | 30 | 0 | 6 | — | 0.83 |
| old-forgotten | 23 | 6 | 7 | — | 0.64 |
| current-concept | 36 | — | 0 | — | 1.00 |
| careless-masquerade | — | 14 | — | 22 | 0.61* |
| mis-in-prereq | 21 | 12 | 3 | — | 0.58 |
| unknown-skill | 29 | 3 | 4 | — | 0.81 |
| accidental-probe-fail | 27 | — | 9 | — | 0.75 |
| cross-unit | 10 | 14 | 0 | — | 0.42 |

- **프로브 난이도 d2→d3 채택**: Hit 0.717→**0.736**, Probe Yield 0.348→**0.434** (Phase 1의 0.10~0.15에서 건강 밴드 0.2~0.6 진입). Yield 저조의 구조 원인은 "프로브 d2 하드코딩 — 약한 전제도 쉬운 문항은 통과"였음.
- **벤치마크가 잡아낸 엔진 실결함 2건**: ① careless-masquerade 36/36 오개설 — `needsInvestigation`이 오류 유형 무관하게 연속오답≥2로 발화 → 최근 오답이 전부 비진단성이면 조사 금지(좌절 보호가 담당)로 수정, 0/36→22/36 정답(잔여 14는 CARELESS 태그 미가용 문항형에서 하네스가 순수 실수 학생을 표현 못 한 것 — 표현 가능 케이스는 22/22). ② two-competing 0.22의 24/36 '미확정' — 연속 프로브 가드 시점에 하네스가 절단(엔진은 재개함) → 하네스 연속 수정 후 0.83.
- 잔여 약점(cross-unit 0.42, mis-in-prereq 0.58)은 "경계선 실력(0.3~0.4) 전제가 단일 프로브를 요행 통과"하는 확률 한계 — PART N 권고에 반복-프로브 후보로 기록.

---

# D. Transfer Validation

난이도 교란 제거 설계(PART 8): transfer 직후 [같은 스킬·같은 난이도] NEAR 강제 후속, [하류 스킬·같은 난이도] FAR, [1일 후·같은 난이도] DELAYED — 통과군 vs 실패군 후속 정답률 차:

| 구분 | TRAINING Δ | VALIDATION Δ |
|---|---|---|
| NEAR | +0.087 | +0.099 |
| FAR | +0.071 | +0.079 |
| DELAYED | +0.126 | +0.094 |

**전 지표 양수 전환** — Phase 1의 음수(−0.120)는 transfer 성공→난이도 상승이라는 교란의 산물이었음이 입증됐다. transfer 통과는 난이도를 통제하면 근접·원거리·지연 모두에서 실제 예측력을 가진다.

---

# E. Full M1 Knowledge Graph

- **micro-skill 35개** (파일럿 10 원형 동결 + 신규 25): NUM 5 / ALG 10 / FUN 10 / GEO 5 / STA 5
- **엣지 56개**, 전부 типed + rationale: **REQUIRED 39 / STRONGLY_SUPPORTIVE 10 / SUPPORTIVE 7** — "전부 REQUIRED 금지"(PART 11) 충족. 진단 하강은 REQUIRED+STRONG만 따르고 SUPPORTIVE는 제외(광역 조사 방지).
- 분해 원칙(PART 9/10) 기계 검증: DAG·도달성·전제 실존·rationale 전수·스킬당 진단 문형 ≥3 (`test22-graph.mjs` 228 checks). 문형 부족했던 QSGN은 검사 완화가 아니라 **생성기 보강**(부호 확정 표현식 4종)으로 해결.
- 설계상 말단 2개(ANG.02, CLOCK.01)는 M2 전제 예정으로 명시 선언 — 임의 엣지로 때우지 않음.
- **levelWindow**: 신규 스킬은 주제가 유지되는 v1 레벨 대역만 서빙 (파일럿 10개는 Phase 1 동결 행동 유지 — 이 ±2 블러가 B의 skillId 버그를 드러내기도 했음).

# F. Full M1 Coverage

| 자원 | 규모 |
|---|---|
| 문제 공급 | v1 생성기 7단원×5레벨 전부 활용 (신규 저작 0 — 검증 은행 재사용 원칙) |
| micro-lesson | 35스킬 전수 (idea/why/example/try 4필드) |
| 오개념 라이브러리 | 13종 (파일럿 6 태깅 + 확장 7) |
| 귀속 규칙 | 6개 스킬 (EQ.02/03 + PROP.03, AVG.02, REL.01, POLY.02 — secondary 선언과 쌍) |
| 진단 예산 | 35스킬에 32문항(전수 70의 46%) — 강학생 전 영역 ≥2 판정, 프런티어 '최대 깊이 우선'으로 전환 + 영역 균형 선택 |

**GATE B 동적 검증(`test22-m1full.mjs`)이 잡아낸 실병리 3건과 수정**:
1. **치료 핑퐁 독점**: 중간 실력 학생(0.62)이 d5에서 열린 케이스의 foundation↔similarA를 최대 92회 왕복 — 한 스킬이 600회 중 68% 독점. → **후퇴 시 치료 난이도 단계 하향(deEscalations)** + 케이스 총 시도 상한(22) 유예.
2. **transfer 무한 전면재시작**: maxTransferRestarts(2) 초과 시 케이스 유예(abandoned, 이력 보존) + 유예 스킬 우선순위 쿨다운(×0.15, 1일).
3. **step-4 게이트 스캔의 쿨다운 우회**: 유예 직후 무조건 transfer 재서빙 → 순환 재점화. 스캔에도 쿨다운 적용. 결과: 3시드 최다점유 **중앙값 <40% / 최대 <60%** 안정.
그 외: 단원 경계 원인추적(STA 실패→ALG 사슬 하강) 결정론 검증, Unknown≠Weak(조작 증거 0) 전수 확인.

---

# G. Elite Mathematics Architecture

**Layer 2는 Layer 1을 대체하지 않는다** — 구현에서의 구체적 의미: elite 시도는 micro-skill α/β를 한 번도 건드리지 않으며(EQA4/5/7에서 assert), elite 증거는 `twin.elite` 별도 장부(차원별 Beta)에만 쌓인다.

- **9차원 프로필** (PART 14/15): representation / strategySelection / integration / novelTransfer / flexibility / explanation / generalization / reverseReasoning / justification — 각 {α,β}로 추적, evidence<2면 UI에 "아직 관찰 부족"으로 정직 표기. (Conceptual Depth는 explanation·justification 후속 증거로 흡수 — 별도 축 아님을 명시.)
- **problemMode 10종** (PART 17): 난이도와 직교 — 은행에 d3 elite 존재로 기계 검증.
- **힌트 사다리 A~D** (PART 26): NOTICE→REPRESENT→CONNECT→START, 순서 강제 + **분투 창**(90초, PART 25 — 남은 초를 표시하지 않는 조용한 게이트: 카운트다운 자체가 시간 압박이므로).
- **이원 실패 분류** (PART 29/30): 필요 스킬 부적정(p<0.6) → KNOWLEDGE_FAILURE → 기존 조사 파이프라인. 전부 적정 → REASONING_FAILURE → 8종 root cause(REPRESENTATION/STRATEGY/INTEGRATION/FLEXIBILITY/GENERALIZATION/JUSTIFICATION/COGNITIVE_OVERLOAD/KNOWLEDGE) — 힌트 사용 패턴·전환 흔적·모드·후속 차원으로 판별, **하위학년 하강 금지**, 해당 차원 스캐폴드 후속만 큐잉.
- **ChallengeValue** (PART 27): RelevantMastery × Integration × Novelty(반복 소멸) × ReasoningValue × AppropriateStruggle(분투 대역 0.4~0.7 중심 근접, config) × CurriculumRelevance — breakdown 전부 사유로 노출.
- **비중 자동 조정** (PART 31/EQA10): share = base 0.15 + (진도−elite수준 격차)×0.6, 상한 0.35. `attemptsSinceElite` 카운터는 리듀서에서 파생 — 리플레이 안전.
- **StrategyTrace** (PART 23): 문제당 {첫/최종 전략, 전환 수, 힌트, 해결 여부} — 긴 글쓰기 없음, cap 200.
- **리플레이 무손실**: elite 이벤트(`payload.elite`) 포함 로그의 재생이 라이브 트윈과 바이트 일치 (test + 실브라우저 516이벤트 배지).

**EliteProblemBank** (PART 37~39): **전량 신규 원저작 15문항 + 후속 16문항** (모드 분포: NR 3, MS 2, RV 2, GN 2, EA 2, MU 2, AP 1, PR 1) — 외부 교재·시험 복제 0. `validateEliteBank()`가 구조(4지·유일 정답·필요 스킬 실존·힌트 A-D 완비·MULTIPLE_SOLUTION의 altSolution·MULTI_SKILL의 스킬≥2)를 노출 전 기계 검증. 저작 중 발견한 수치 오류(E.MS.002 평균 문제 비정수 해) 1건은 정합 수치로 재저작.

# H. Elite Profile Example (실측)

실브라우저 세션에서 E.GN.002(일반화) 본문 + 후속 1개를 푼 직후의 트윈:

```
학생 화면(PART 35):  NUM 도전! · ALG 도전! · FUN/GEO/STA 기초
  문제 구조 보기: 탐험 전 | 전략 고르기: 탐험 전 | 개념 연결: 탐험 전
  새로운 문제: Lv 38 | 설명하기: 탐험 전
학부모 화면(PART 36): 일반화 Lv 52, 나머지 "아직 관찰 부족"
  현재 제한 요인: 일반화 — "Elite 도전에서 이 부분의 후속 질문이 자동으로 더 배정됩니다"
Double Helix: 수와연산 Core 87%·게이트 5/5·Elite 가능 / 통계 Core 25%·게이트 0/5·기초
```

Linear-Equation-Mastery-94-vs-Novel-61 형태의 분리(PART 15)가 실데이터로 표시됨.

# I. Elite QA 1~10

`test22-elite.mjs` — **36/36 PASS**. 하이라이트:
- EQA1 전제 강함+비정형 실패 → 케이스 0개, REASONING 진단 + 스캐폴드 ✅
- EQA2 개념 하나 약함 → KNOWLEDGE_GAP + 기존 파이프라인, 추론 스캐폴드 금지 ✅
- EQA4 전환 성공 → flexibility ↑ & **mastery α/β 완전 무변동** ✅
- EQA5 정답+설명 불완전 → justification만 하향, core α 불변 ✅
- EQA7 표준 20성공+비정형 실패 → Core 0.84 vs novelTransfer 그보다 −0.15 이상 낮게 분리 ✅
- EQA8 3× 시간 해결 → 어느 차원도 하락 없음, 추측 오분류 없음 ✅
- EQA9 동일 실패·다른 흔적(a 미학습/b B힌트/c 무힌트) → KNOWLEDGE/REPRESENTATION/STRATEGY 3갈래 상이 처방 ✅
- EQA10 진도↑·elite↓ → share 0.15→0.35 & 일반 학습 비차단 & 얕은 숙달엔 elite 미개방 ✅

# J. Synthetic Elite Learners L~R

`simulate22-elite.mjs` — 은행 2회전(본문+후속 전부 실 submitEliteAttempt) — **16/16 PASS**:

| L | 프로필 | 관측 |
|---|---|---|
| L | Core高·novel弱 | Core 0.8+ 유지, novelTransfer 그보다 −0.2 이상 낮게 분리, KNOWLEDGE 오귀속 0 |
| M | Core 평범·추론 탁월 | elite 차원 평균 ≥0.6 포착, 오귀속 0 |
| N | 표현强·전략弱 | representation − strategySelection > 0.15 분리 |
| O | 첫 전략만·유연성弱 | flexibility가 strategySelection보다 0.15+ 낮음, FLEXIBILITY/STRATEGY 진단 발생 |
| P | 정답력强·설명弱 | justification 0.17 vs 해결력 0.68 분리, JUSTIFICATION_GAP 개입 |
| Q | 진도만 빠른 얕은 숙달 | share 0.15→0.35 상향 + elite 미개방(transfer 미검증) + 일반 학습 계속 |
| R | 느리지만 깊은 추론 | 차원 평균 0.70, 추측 오분류 0, 무불이익 |

# K. Phase 1 Regression Results

`regress-phase1.mjs` — 14개 스위트 **ALL PASS** (최종 스위프에서 재확인): step0 13 / mastery 28 / attribution 9 / misconception 29 / rootcause 29 / remediation 27 / retention 32 / adaptive 20 / calibration 13 / session 13 / replay-config 6 / diagnostic 65 / qa21 62 / A~K 47.

Phase 2 중 갱신된 Phase 1 검사는 3부류뿐이며 전부 사유 기록: ① 상수 고정 해제(prior 0.20 → CONFIG 유도), ② 하네스 결함 수정(driveRetention 조기 break — **Phase 1 시절 A 간헐 실패의 진짜 원인**이었음이 판명, E의 cure 조건, K의 sweep 정의를 caseId 소속 기준으로 정밀화), ③ 정책 전환 반영(진단 프런티어 중간→최대 깊이; misconception 단위검사는 two-clean 명시 고정 + rolling 검사 13개 추가).

# L. Real Browser E2E

Vite dev 서버 + 실클릭 주행. 시나리오: 엔진으로 정직 생성한 513-이벤트 로그(NUM/ALG를 실제 게이트·transfer 통과로 ELITE-ready화)를 **store21 영속화 포맷 그대로** localStorage 주입 → 리로드(=replay) 후:
1. 대시보드: 35스킬 트윈 전수 렌더, Elite Thinking **NUM 도전!·ALG 도전!** 배지, "513개 이벤트 무손실 재구성" 배지.
2. 학습 시작 → step-4 게이트 transfer(평각/맞꼭지각 엇각 문제) 정답 처리 → **Elite 도전 카드 자동 서빙**: GENERALIZATION 모드 배지, ChallengeValue 사유("성장 기대값 1.84, 예상 성공률 63% — 분투 대역 40~70%"), 잠긴 힌트 사다리 A~D("먼저 혼자 탐색해 보세요"), 전략 전환 체크박스, 시간 표시 없음.
3. 정답 → 풀이 표시 → **One Problem Deep 후속**((−2) 시리즈 전이) 자동 체인 → 완료 후 일반 학습 복귀. 이후 Fast Track까지 자연 발동.
4. 홈: "새로운 문제 탐험 전 → **Lv 38**" 실증거 갱신. 학부모 리포트: Double Helix 영역표, 일반화 Lv 52, **제한 요인 자동 식별**.
5. 전체 새로고침 → 516 이벤트 재생으로 elite 증거 포함 전 상태 보존. **콘솔 에러 0**, 프로덕션 빌드 성공.

# M. Known Limitations

1. **Brier 하한**: 적응 난이도 체제에서 이론 최소 0.215~0.225 — 목표 0.20은 A~K 하네스에선 달성(0.195), 일반 모집단에선 하한 자체가 위. 지표 정의 유지한 채 기록.
2. **오개념 태깅 커버리지**: distractor-수준 태그는 6/13종 — 미태깅 7종은 two-clean 하이브리드로 동작(구정책의 FP 특성 잔존). careless 태그 가용률 ~18%도 여전한 어댑터 한계.
3. **Root cause 경계선 한계**: 실력 0.3~0.4 전제의 단일 프로브 요행 통과(cross-unit 0.42, mis-in-prereq 0.58) — 반복 프로브 미도입.
4. **Elite Bank 규모**: 15문항+후속 16 — 파일럿 규모. 장기 novelty 소진에는 부족하며, OPEN_ENDED(복수 정답 지원)는 미저작. COGNITIVE_OVERLOAD 판정은 시간 비율 근사 1종뿐.
5. **Elite 차원 간 오염 가능성**: 모드→차원 매핑이 저작 시 선언 기반 — 시뮬레이션 검증은 했으나 실사용 요인 분석은 미실시.
6. **파일럿 10스킬의 ±2 레벨 블러**: Phase 1 동결 유지 — SIGN.02 d4가 분수 문항을 서빙하는 등의 주제 혼입이 남아 있음 (신규 25개는 levelWindow로 해소).
7. **elite readiness의 transfer 요건**: 현재 도메인당 gated≥2 + transfer 1회 — 세밀한 클러스터(단원 내 그룹) readiness는 미구현.
8. 시뮬레이션 하네스의 학생 모델은 여전히 근사(오답 distractor 선택 분포 등) — 실사용 데이터로의 교정 루프가 최종 검증.

# N. Recommendation for M2 Expansion (PART 48)

**판단 질문**: "Is the M1 system genuinely producing deeper mathematical thinking, not just higher accuracy?"

**현재 답: 구조적으로 YES, 실증적으로 아직 판단 유보.** 시스템은 이제 (a) 정답률과 사고력을 분리 측정하고(EQA7, L/P), (b) 지식 결손과 추론 결손을 다른 처방으로 다루며(EQA1/2/9), (c) 느린 심층 사고를 보상 구조에서 불이익 주지 않고(EQA8, R), (d) 진도-깊이 격차를 스스로 감지해 도전 비중을 조정한다(EQA10, Q). 그러나 이는 **합성 학습자에 대한 구조 검증**이지, 채림이의 실사용에서 사고력이 실제로 깊어진다는 증거는 아직 아니다.

**따라서 M2 대량 확장 전 권고 순서**:
1. **실사용 파일럿 (최우선)**: 채림이 2~4주 실사용 → Calibration Engine을 실데이터로 재산출, elite 차원의 실세계 신뢰도 확인. 재적합이 필요하면 Replay로 전 이력 무손실 재계산.
2. Elite Bank 증편 (모드당 ≥5, OPEN_ENDED 신설, 후속 커버리지 전 문항화) + 오개념 태깅 13/13.
3. 경계선 프로브 반복 정책 (root cause 잔여 약점).
4. 그 후에만 M2 그래프 — 동일 아키텍처(типed edge, levelWindow, 태깅, GATE B 검증 스위트)를 그대로 적용. M1→M2 cross-grade 엣지(예: ANG.02→수선/합동)는 이미 설계상 말단으로 예약됨.

---

## 부록 — Phase 2가 잡아낸 엔진 실결함 총목록 (§10 보고 의무)

| # | 결함 | 발견 경로 | 수정 |
|---|---|---|---|
| 1 | freshTwin prior (1,4) 하드코딩 — CONFIG 탈동기화 | m1full Unknown≠Weak 검사 | CONFIG 유도 |
| 2 | careless 연발을 전제 결손으로 오귀속 (needsInvestigation 무조건 발화) | RC 벤치마크 0/36 | 비진단성-오답-만 가드 |
| 3 | 프로브 d2 하드코딩 → Yield 구조적 저조 | Step 1 분석 + 벤치마크 | probeDifficulty=3 (Hit/Yield 동시 개선) |
| 4 | transfer 전면재시작 무한 루프 | 집중 병리 검사 68% | maxTransferRestarts + 유예 |
| 5 | 치료 핑퐁 (targetDifficulty 고집) | 집중 병리 추적 tl=92 | deEscalations 난이도 하향 + 총시도 상한 |
| 6 | step-4 게이트 스캔의 유예 쿨다운 우회 | 3시드 최대 82% | 스캔에 쿨다운 적용 |
| 7 | 오개념 인스턴스 skillId 오기록 (레벨 창 겹침) | Learner E 시드 58 추적 | 정식 triggerSkillId 고정 |
| 8 | 새 ACTIVE가 타-오개념 링크 케이스에 밀려 방치 | 〃 | ACTIVE가 비-ACTIVE 링크 대체 |
| 9 | (하네스) driveRetention 조기 break — Phase 1 A 간헐실패의 진범 | A 실패 재발 조사 | 비-복습 행동 수행 후 계속 |

**Double Helix의 현재 좌표**: 진도축(중1 전체 Mastery Layer, 35스킬)과 깊이축(Elite Layer, 9차원)이 한 이벤트 원장 위에서 함께 동작하며, 어느 쪽도 다른 쪽의 장부를 오염시키지 않음을 740개 assert가 지키고 있다.
