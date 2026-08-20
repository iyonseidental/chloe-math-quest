# CHLOE MATH 2.3 — PHASE 3 PILOT-READY REPORT

작성일: 2026-08-20
기준 지시: "PHASE 3 — REAL-WORLD VALIDATION + ELITE DEPTH HARDENING" (PART 0-63)
실행 순서: PART 54의 STEP 0→22 그대로. GATE D1/D2 각각 조건 충족 후 진행. M2 확장 미착수 (PART 59).
버전: config `2.3.0` / masteryModel `2.2.0-ability-beta`(무변경) / curriculum `2.3.0-m1full-pure` / graph `2.2.0-m1full35`(구조 무변경)
Baseline: `baselines/phase2-baseline.json` (STEP 0 — v2.2 전 지표·계수·스위트 결과 동결, `--force` 없인 불변)

## 게이트 판정 요약

| 게이트 | 조건 | 판정 |
|---|---|---|
| **GATE D1** (PART 55) | 태깅 13/13 · 블러 제거 · 경계선 방어 · RC 벤치 개선/한계 설명 · BRR 보고 · 전 회귀 PASS | ✅ 6/6 |
| **GATE D2** (PART 56) | 은행 ≥50 · 10모드 전수 · OPEN_ENDED 동작 · 9차원 판별 · 클러스터 readiness · 이원분류/장부격리/저속무불이익 유지 · elite 회귀 PASS | ✅ 9/9 |
| 최종 스위프 | Phase 1(14) + Phase 2(4) + Phase 3(6) 스위트 + tsc + 프로덕션 빌드 | ✅ ALL PASS |

**검증 규모**: Phase 1 394 + Phase 2 357 + Phase 3 신규 166 = **총 ~917개 실행 assert 전부 PASS** (`scripts/regress-all.mjs`가 상시 게이트). Root Cause Benchmark 2.0 별도 1,860+ trial.

---

# PART A. v2.2 → v2.3 변경 사항

| # | 변경 | 근거 지시 |
|---|---|---|
| 1 | 파일럿 10스킬 levelWindow 도입 — ±2 블러 제거, 주제 순수화 | PART 11 |
| 2 | MIS.SIGN.NEGSQ trigger를 SIGN.02→POW.01로 이관 (블러 산물 교정) | PART 11 |
| 3 | 오개념 라이브러리 13/13 감사 필드(mechanism/diagnosticStrength/confirmProblemTemplates) + 전수 distractor 태깅 | PART 4/5 |
| 4 | MIS.CLOCK.HOUR → MIS.GEO.PARCON 교체 + CLOCK.01 라벨 교정 (진단 불가 태그 거부) | PART 5 |
| 5 | engine2 서빙의 v1 큐레이션 은행 우회 (주제 순수성·태깅 보장) | PART 11 |
| 6 | 경계선 4상태(CLEAR_PASS/CLEAR_FAIL/BORDERLINE/UNKNOWN) + 직교 확인 프로브(transfer 표현, 케이스당 1회) | PART 6-9 |
| 7 | 프로브 오답의 비진단성 오류(실수/추측/시간압박) → AC11 재확인 경로 | PART 10 벤치 실측 |
| 8 | Elite Evidence Attribution 2.0 — 문제별 evidenceMap(주/부/배제 차원), 자동 교차오염 차단 | PART 19/20 |
| 9 | Skill Cluster 11종 + 클러스터 단위 elite 자격 (영역 평균이 약한 클러스터를 못 가림) | PART 22/23 |
| 10 | Elite Bank 2.0 — 15→**50문항** (10모드×5), novelty signature + 유사복제 기계 거부 | PART 12-14 |
| 11 | OPEN_ENDED 모드 신설 (5문항) + 문제별 5단계 rubric + 설명 가능한 규칙 채점(NEEDS_REVIEW 포함) | PART 15-17 |
| 12 | One Problem Deep 2.0 — DeepValue 5요소로 후속 "하나"만 선택 (전 후속 체인 폐지) | PART 39/40 |
| 13 | Productive Struggle 4분류 + 계측 필드, COGNITIVE_OVERLOAD 복수 신호 요건 (시간 단독 판정 금지) | PART 36-38 |
| 14 | Golden Holdout Set (48문항, Form A/B/C) + HOLDOUT_ASSESSMENT 이벤트 + 구조적 격리 | PART 24-28 |
| 15 | Growth 지표 (영역 분리 + Wilson CI + INSUFFICIENT 정직 보고) | PART 29/30/53 |
| 16 | Pilot 계측 (Valid Session/커버리지) + REAL DATA 대시보드 + Golden 러너 UI | PART 31-33/44-46 |
| 17 | **결함 수정**: 리플레이 발산(recentAgendaKinds 리듀서 이동), Fast Track d5 무한 재발화(elite 기아), Golden 러너 훅 위반·보기 셔플 부재 | §부록 |

# PART B. Regression 결과

전 스위트 ALL PASS (`baselines/phase3-final-regression.txt`):
Phase 1 — step0 13 / mastery 28 / attribution 9 / misconception 29 / rootcause 30 / remediation 27 / retention 32 / adaptive 20 / calibration 13 / session 13 / replay-config 6 / diagnostic 65 / QA1-20 62 / A~K 47.
Phase 2 — graph 238 / m1full 67 / ELITE QA 36 / L~R 16.
Phase 3 신규 — levelwindow 11 / tagging 43 / borderline 20 / elite2 59 / golden 21 / pilot 12.
프로덕션 빌드·tsc 클린. Phase 1/2 검사 중 갱신된 것은 전부 "계약이 실제로 바뀐 곳"뿐이며 사유를 검사 코드에 주석으로 남김 (경계선 면죄 계약, OPD 2.0 단일 후속, QA8/A의 Fast Track 계약, QA15/16의 태깅 distractor 명시 선택).

# PART C. Misconception Coverage 13/13

- 13/13 전 항목: `mechanism`(오규칙 그 자체) + `diagnosticStrength` + `confirmProblemTemplates`(생성 조건 명시) + `diagnosticDifficulty` 완비 — 43개 검사로 기계 검증.
- 신규 태깅 7종은 전부 **기존 distractor가 이미 오규칙의 기계적 산물인 곳**에만 부여 (REL.FLIP/GEO.POLYN/PROP.INV/ABS.DROP/VAL.NEGSQ). AVG.COUNT만 기계적 산물 distractor를 생성기에 신설.
- **거짓 태깅 거부 2건 (PART 5 집행)**:
  1. MIS.CLOCK.HOUR — "시침 정시 가정"의 산물을 제공하는 문항이 은행에 없음 → 그 스킬이 실제로 서빙·진단해 온 평행선 각 혼동(MIS.GEO.PARCON)으로 교체. 스킬 라벨도 실체에 맞게 교정(id는 이벤트 호환 유지).
  2. MIS.COORD.ORDER — 사분면 답으로는 순서쌍 스왑이 부호 대칭 오답과 **수학적으로 비구별**임을 발견(스왑 결과가 항상 대칭점과 동일 사분면). 사분면 태그를 제거하고, 순서 혼동만이 그 답을 만드는 '좌표 읽기' 서브템플릿을 신설해 진단형을 공급.
- 검증: 13종 전부 trigger 스킬×진단 난이도에서 실제 제공률 ≥10% (300표본), 정답 선택지 오태깅 0, 생성기 방출 태그의 라이브러리 실존 전수 확인. 부산물: EQ.WORDDIR의 진단형이 EQ.03 표준 문장제에 없던 구멍 발견 → 번역형(translate) 문장제 신설.

# PART D. Root Cause Benchmark 2.0 — Before / After

기존 9유형 + 신규 6유형(경계선 요행/이중 경계선/단원 너머 미시 결손/원거리 오개념/강한 후보+부주의 프로브/미접촉 요행). 유형×위치×12시드, 설정당 228~408 trial. Before = 직교 방어 OFF(2.2 동작), After = ON(2.3). 생성기 무시드 랜덤으로 실행 간 분산이 있어 **4회 실행 평균**으로 보고:

| KPI (신규 6유형) | BEFORE (2.2) | AFTER (2.3) | Δ |
|---|---|---|---|
| Hit Rate | 0.469 | **0.562** | **+0.093** |
| Wrong Attribution | 0.166 | 0.214 | +0.048 |
| Broad Remediation Rate | 0.170 | 0.229 | +0.059 |
| Probe Count (중앙값) | 2 | 3 | +1 (상한 5 불변) |

| KPI (기존 9유형, 2.3 전체 구성) | 2.2 baseline | 2.3 |
|---|---|---|
| Hit Rate | 0.736 | **~0.78** |
| Wrong Attribution | — | ~0.14 |
| Broad Remediation Rate | — | ~0.15 |
| Probe Yield | 0.434 | ~0.37 (건강 밴드 유지) |

**정직한 트레이드오프 기록**: 직교 방어는 요행 통과를 벗겨 Hit를 크게 올리지만(경계선 유형 +9.3pt, 기존 유형 +4.4pt), 더 깊이 파는 만큼 실제-강한 심층 후보의 요행-실패 노출도 늘어 오귀속·BRR이 +5pt 안팎 오른다. 이 비용을 줄이기 위해 (a) 직교 실패도 AC11 재확인을 거치게 하고 (b) 직교를 케이스당 1회로 제한했다 — 초기 구현(후보당 1회)은 BRR을 +10pt까지 올렸고 벤치마크가 이를 적발해 수정했다. 잔여 한계는 PART P.
개별 유형: borderline-lucky HIT 23→30/48, unknown-lucky 26→34/48, two-borderline 20→29/48. strong-careless-probe는 방어에도 오귀속 ~28/48 잔존 — 프로브 부주의율 30%는 극단 시나리오이고, 부주의 신호가 CARELESS distractor로 표면화될 때만 엔진이 볼 수 있음(비진단성 재확인 경로 신설에도 v1 문항의 CARELESS 표면화율이 낮음). PART P 기록.

# PART E. Elite Problem Bank 2.0

| 항목 | 수치 |
|---|---|
| 본문 문항 | **50** (파일럿 15 + 신규 원저작 35) |
| 모드 분포 | 10모드 전수 각 **5문항** (STANDARD/APPLICATION/MULTI_SKILL/NON_ROUTINE/REVERSE/GENERALIZATION/PROOF/MULTIPLE_SOLUTION/ERROR_ANALYSIS/**OPEN_ENDED**) |
| 후속 문항 | 28 (Near/Deep/스캐폴드) |
| novelty 검증 | 전 문항 NoveltySignature(표현형/스킬조합/지배 추론 동작/구조 패턴/풀이 계열) 선언 — 같은 모드에서 (추론 동작 × 구조 패턴) 중복 시 validateEliteBank가 기계 거부 |
| 증거 지도 | 전 문항 evidenceMap(주 차원 + 부 차원 비율 + 배제 차원) — 미선언·모순 시 노출 거부 |
| 저작권 | 전량 본 프로젝트 신규 원저작, 외부 교재·시험 복제 0 (PART 42) |

# PART F. Elite Dimension Discrimination — 9×9

차원별 합성 학습자(그 차원이 주 부하인 항목만 성공) × 은행 전량(본문 50 + 후속 28) 주입:

```
        repres strate integr novelT flexib explan genera revers justif
repres   0.58   0.13   0.09   0.13   0.09   0.10   0.06   0.09   0.06
strate   0.11   0.50   0.09   0.19   0.17   0.10   0.09   0.13   0.06
integr   0.18   0.18   0.77   0.13   0.09   0.10   0.06   0.09   0.06
novelT   0.28   0.13   0.07   0.60   0.09   0.10   0.06   0.09   0.06
flexib   0.14   0.18   0.07   0.13   0.72   0.10   0.06   0.09   0.06
explan   0.08   0.07   0.07   0.13   0.09   0.52   0.06   0.09   0.06
genera   0.12   0.11   0.07   0.13   0.09   0.10   0.80   0.09   0.07
revers   0.10   0.11   0.09   0.13   0.09   0.10   0.06   0.74   0.06
justif   0.13   0.07   0.09   0.13   0.09   0.38   0.10   0.09   0.85
```

- **9/9 전 차원 대각 지배** (자기 차원이 행 최고 + 타 차원 대비 ≥0.10 분리 — 기계 검증). Phase 2 은행(15문항)에서는 strategySelection·representation이 주 부하 부족으로 판별 불가였던 것이 은행 2.0으로 해소.
- 남은 교차부하는 전부 **선언된** 것: novelT 학습자의 repres 0.28(비정형 해결의 표현 부수 증거), justif 학습자의 explan 0.38(근거·설명의 저작 선언 부분 중첩). 미선언 차원의 자동 상승은 배제 목록이 차단함을 단위 검증 (전환-성공의 flexibility 가점조차 배제 문제에서는 0).

# PART G. Cluster-Level Elite Readiness

- **11개 클러스터** (NUM 2 / ALG 3 / FUN 2 / GEO 2 / STA 2) — 전 스킬이 정확히 하나에 속함(기계 검증).
- 클러스터 readiness = Core 안정(avgP≥0.72) + 게이트 수(클러스터 크기 적응) + transfer 실증 ≥1 + 활성 오개념 0.
- Elite 도전 자격 = **문제의 필요 스킬이 걸친 모든 클러스터가 ELITE** (PART 23). 핵심 반례 검증: ALG 영역 평균이 높아도 방정식 클러스터가 약하면 방정식 요구 문제는 부적격, 문자식만 요구하는 문제는 적격. 활성 오개념은 해당 클러스터만 차단.
- domainReadiness는 UI 배지용으로 유지 (판단은 클러스터가 지배).

# PART H. OPEN_ENDED Scoring Architecture

- 3층 구조 (PART 16): ① 결정적 검증 — 주장 판정/반례 식별/전수 탐색을 4지 구조화 ② 문제별 5단계 rubric(0=무근거 ~ 4=일반 구조 진술) ③ AI 해석 계층은 **계약(interface)만 정의, 현재 미사용** — 사용하는 날에도 confidence/reason/rubricDimension 없는 판정은 무효.
- 규칙 채점 `gradeOpenEnded`: 본문×근거후속×일반화후속의 결정적 조합 → level 0~4 + 근거 문자열. **D(START) 힌트까지 쓴 정답과 근거 미관찰은 NEEDS_REVIEW** — 불투명 확신 금지.
- **PART 18 집행**: Answer Correctness와 Reasoning Quality 분리 — OE 본문의 evidenceMap이 justification/explanation을 배제 차원으로 강제하여, 정답만으로는 근거 점수가 오를 수 없음을 5문항 전수 기계 검증. 근거 증거는 오직 후속 관찰에서만.

# PART I. One Problem Deep 2.0

- 본문 정답 → 후속 **전부가 아니라 하나** (PART 39): DeepValue = 약한차원(1−level) × 관련숙달 × novelty(재탕 0.2) × 노출격차(1/(1+evidence)) × 인지부하적합(본문 힌트 0-1개 1.0 / 2개 0.6 / 3+개 0.3) — 5요소 breakdown 전부 노출.
- 검증: justification 강한 학생 → generalization 후속 선택(역도 성립); 중립 프로필에서 최근 후속은 novelty 소멸로 교체; 극단 약점 프로필에서는 약점 강화가 novelty를 이기는 것이 옳음(의도된 우선순위). 후속 완료 후 추가 체인 없음 — E2E 실측: "가장 부족한 사고(justification, 수준 25)를 지금 맥락에서 강화" 사유가 화면 노출.
- 본문 오답의 REASONING 실패는 종전대로 차원-일치 스캐폴드 후속 (하위학년 하강 금지 유지).

# PART J. Productive Struggle / Cognitive Overload

- **계측 (PART 36)**: timeToFirstActionSec / strategySwitches / hintsUsed(사다리 단계) / solvedWithoutSolutionReveal / returnedAfterPause — 이벤트 payload와 StrategyTrace에 기록. Speed Score가 아니며 어떤 증거 가중에도 쓰지 않는다.
- **분투의 질 (PART 37)** — 설명 가능한 규칙 4분류(각 판정에 근거 문자열): KNOWLEDGE_BLOCK(개념 부적정 — 분투 아님) / RANDOM_TRIAL(예상 30% 미만 + 무탐색 오답) / PRODUCTIVE_STRUGGLE(체류 + 전환·단계 힌트·해결의 움직임 — 실패여도) / STUCK_NO_PROGRESS(무움직임 정체 — 개입 후보). 학생 홈의 "깊게 생각한 문제" 배지가 이것을 성취 언어로 노출 (PART 48).
- **OVERLOAD (PART 38)**: 시간 단독 판정 금지 — 장시간 정체 + {전략 폐기≥2, 힌트 사다리≥3, 다중 구조} 중 **2개 이상** 겹칠 때만. "느리게 풀었을 뿐"인 학생은 OVERLOAD가 아님을 단위 검증 (PART 24의 저속 무불이익과 정합).

# PART K. Golden Set

- **CHLOE MATH GOLDEN SET**: 16 parallel group × Form A/B/C = **48문항** 전량 신규 원저작. 커버리지: CORE 18(6영역 구조) / NEAR 6 / FAR 6 / ELITE 18(6차원×3) — 14개 스킬 문서화.
- **Parallel Form 정합 (PART 26/57)**: 그룹마다 A/B/C 정확히 1문항, 같은 구조·area·난이도·차원, 폼 간 지문 중복 0, 훈련 은행(생성기+Elite Bank) 지문 중복 0 — 전부 기계 검증.
- **격리 보증 (PART 25/28/47)**: `HOLDOUT_ASSESSMENT` 이벤트는 리듀서에서 **holdout 장부에만** 기록 — mastery α/β·agenda·elite·오개념·케이스·adaptive 추천의 JSON 완전 무변동을 assert (오답 8개를 섞어도 remediation 0건). Golden 결과를 읽는 코드는 성장 리포트뿐.
- 시행 UI: 힌트·정오답 피드백·난이도 조정 없음, 일정 하드코딩 없음(학부모 영역 수동 시행, PART 46), 보기 결정적 셔플(저작 순서 노출 결함을 E2E에서 발견·수정).

# PART L. Pilot Instrumentation — 실제 수집 데이터

앱의 기존 이벤트 원장이 곧 계측이다(새 이벤트 타입 없이 리플레이 호환 유지):
- **세션 파생**: 이벤트 간격 30분 초과 시 분절. **Valid Session** = 유의 시도 ≥5 또는 학습 ≥10분, 그리고 중앙 풀이시간 <4초의 고속클릭 세션 배제 — 전 수치 config (PART 33).
- 수집 항목: 시도 전량(모드/변형/난이도/정오/오류태그/오개념태그/시간/힌트/재시도), Elite(전략 흔적/분투 데이터/힌트 사다리), 치료(케이스/프로브/직교/성과), 복습/전이, Golden 시행. Confidence는 payload에 예약 필드 존재(UI 미수집 — PART P).
- **REAL 라벨 강제**: `analyzePilot`은 실이벤트 로그만 읽고 dataSource='REAL'을 박는다. synthetic 결과와 합산·혼합 불가 (PART 43/53). 캘리브레이션 커버리지 LOW(<60 유효시도)/MEDIUM(<200)/SUFFICIENT(≥200+12스킬+복습5) — 근거 문자열 동반.

# PART M. Real-World Metrics

- **Growth Report** (PART 29/30): Core / Near / Far / Elite(+차원별 분해) 각각 {n, 정답률, Wilson 95% CI, 시행 폼} — 원시 % 단독 제시 없음. CI 겹침이면 confident=false로 "표본이 작아 확정적이지 않음" 명시. Retention Growth(실로그 전/후반 복습 통과율, <8회면 INSUFFICIENT)와 Gap Closure(해결/재발/내구/유예)는 별도 축.
- **조작 불가 (PART 53)**: 시행 <2회면 `INSUFFICIENT_REAL_WORLD_DATA` — 현재 채림이의 실사용 데이터는 **없으며**, 본 보고서의 어떤 수치도 실사용 성장을 주장하지 않는다. E2E의 성장 표시는 러너 검증용 모의 시행임을 명시한다.

# PART N. Browser E2E

Vite dev 서버 실클릭 주행 (엔진으로 정직 생성한 513-이벤트 ELITE-ready 로그 주입):
1. 대시보드: 35스킬 트윈, "513개 이벤트 무손실 재구성" (이번엔 recentAgendaKinds까지 포함한 **완전 일치** — 종전의 strip 우회 제거).
2. **Elite [OPEN_ENDED]** 도전이 클러스터 자격으로 홈 추천에 등장 (성장 기대값 1.90) → 힌트 사다리 잠금·시간 표시 없음 → 정답 → **OPD 2.0 단일 후속** ("가장 부족한 사고 justification 수준 25 강화" 사유 노출) → 정답 → 일반 학습 복귀 (추가 체인 없음 ✓).
3. 학부모 리포트: REAL DATA 패널(유효 세션/학습 분/시도/커버리지 MEDIUM+근거), Golden Set 섹션 — 시행 전 **INSUFFICIENT REAL-WORLD DATA** 정직 표기.
4. Golden Form A(부분)·Form B(16문항 전량) 실클릭 시행 → 성장 비교 렌더: 기본 개념 67%→83%, 먼 전이 50%→100%, Elite 사고 60%→83% — 전부 "표본이 작아 확정적이지 않음" 동반.
5. 전체 새로고침 → **548 이벤트**(holdout 30건 포함) 무손실 재구성, 새 탭 **콘솔 에러 0**, 프로덕션 빌드 성공.
E2E가 적발해 수정한 결함 3건: Fast Track d5 무한 재발화(elite 기아), Golden 러너 훅 순서 위반, Golden 보기 무셔플(정답 항상 1번).

# PART O. Replay / Recompute

- **holdout 포함 전체 로그의 byte-fidelity**: live 트윈 vs replayFromScratch JSON 완전 일치 (테스트 + 실브라우저 548이벤트).
- **잠복 발산 결함 수정**: recentAgendaKinds(과잉검사 가드 근거)가 live 래퍼에서만 갱신되고 리듀서엔 없어 재구성 후 가드 상태가 유실되던 발산을 Phase 3 격리 테스트가 적발 — payload.mode의 순수 함수로 리듀서 이동, UI replayCheck의 strip 우회 제거로 완전 일치 요구.
- 2.2 시절 생성 로그(구 이벤트)의 재생 호환 유지: 서빙 정책(levelWindow/은행 우회)은 미래 서빙만 바꾸며 과거 이벤트 해석 불변 — 명시 검증.

# PART P. Known Limitations

1. **직교 방어의 비용**: 경계선 유형에서 오귀속 +4.8pt/BRR +5.9pt (Hit +9.3pt의 대가). 프로브 예산 중앙값 2→3.
2. **strong-careless-probe 잔존 오귀속 ~0.58**: 부주의가 CARELESS distractor로 표면화될 때만 엔진이 인지 — v1 문항의 CARELESS 표면화율이 낮음.
3. **Elite 판별의 잔여 교차부하**: justif↔explan 0.38 등 저작 선언 중첩 — 실사용 요인 분석 미실시.
4. Golden Set 규모: 영역당 폼별 2~6문항 — 개인 성장 판정은 CI가 넓다(도구가 이를 정직하게 표기). ELITE 항목의 MCQ 형식은 추론 과정 자체가 아닌 결과 관찰.
5. Confidence(자신감) 수집 필드는 예약만 — UI 미구현 (PART 31 목록 중 유일한 미수집).
6. returnedAfterPause는 탭 이탈만 감지(앱 내 멈춤 미구분). timeToFirstAction은 첫 클릭 근사.
7. OPEN_ENDED는 구조화 선택형 — 진짜 자유서술 평가는 AI 계층(계약만 정의) 도입 전까지 불가.
8. 시뮬레이션 학생 모델의 근사는 여전함 — 실사용 데이터만이 최종 답 (그래서 이 파일럿).
9. RC 벤치마크는 생성기 무시드 랜덤으로 실행 간 ±3pt 분산 — 보고는 4회 평균.

# PART Q. Is the system now ready for Chloe's real-use pilot? — **YES**

**근거**:
1. **측정 도구가 준비됨**: 훈련과 구조적으로 격리된 Golden Set(격리를 assert가 지킴) + parallel forms + CI 동반 성장 지표 — "성장을 가정하지 않고 측정"(PART 63)할 수단이 실제로 돌아간다 (E2E 실증).
2. **수집이 준비됨**: 모든 학습 행동이 리플레이 가능한 이벤트로 남고, Valid Session·커버리지 판정이 실데이터 규모를 정직하게 등급화한다. 재적합이 필요해지면 전 이력 무손실 재계산 가능.
3. **진단이 더 정직해짐**: 13/13 태깅(거짓 태깅 2건 거부 포함), 경계선 요행 방어, 주제 순수 서빙 — 실학생의 오답이 더 정확한 곳에 귀속된다.
4. **깊이 층이 판별력 있음**: 9/9 차원 대각 지배 + 클러스터 자격 + OPD 2.0 — "약한 사고를 그 맥락에서" 조준하는 기계가 검증됨.
5. **안전장치**: 시간 무불이익, 분투 창, 좌절 보호, 진단 부담 상한, 학생 화면의 성취 언어 — 아이가 실험 대상으로 느끼지 않게 하는 요건(PART 32) 충족.

**조건부 단서**: (a) Confidence 수집과 자유서술 평가는 파일럿 범위 밖 — 파일럿 중 필요성 판단. (b) 첫 시행은 Form A로 시작하고 중간 B/종료 C 권장 — 일정은 학부모가 결정(하드코딩 없음). (c) 실데이터 커버리지가 SUFFICIENT에 도달하기 전까지 어떤 실세계 결론도 내리지 않는다.

**다음 단계는 코드가 아니다** (PART 59/60): 여기서 멈춘다. GATE E(실세계 검증)의 9개 질문은 채림이의 실사용 데이터가 쌓인 뒤에만 답한다. M2 확장은 GATE E가 충분히 긍정적일 때만, 동일 원칙으로.

---

## 부록 — Phase 3가 적발·수정한 엔진 실결함

| # | 결함 | 발견 경로 | 수정 |
|---|---|---|---|
| 1 | 리플레이 발산: recentAgendaKinds가 live 전용 (재구성 후 과잉검사 가드 유실, UI는 strip으로 우회 중이었음) | Golden 격리 byte-fidelity 테스트 | 리듀서로 이동, strip 제거 |
| 2 | Fast Track d5 무한 재발화 — 건너뛸 레벨이 없는데 도전 루프로 elite(5.5)·하위 단계 영구 기아 | 실브라우저 E2E (21연속 정답 스킬이 세션 독점) | current<5 가드; QA8/A를 새 계약으로 |
| 3 | 직교 프로브가 AC11 재확인 우회 — 실제-강한 UNKNOWN 후보의 요행-실패 노출 2배 | RC 벤치 2.0 오귀속 악화 | 직교 실패도 놀라운-실패/비진단성이면 재확인 |
| 4 | 직교 확인 후보당 1회 → 케이스 내 연쇄 노출로 예산 소진·과잉 하강 | RC 벤치 2.0 BRR +10pt | 케이스당 1회로 제한 |
| 5 | 프로브 오답의 오류 태그 무시 — 부주의 실수가 즉시 하강 | strong-careless-probe 유형 | 비진단성 오류 → 재확인 경로 |
| 6 | MIS.COORD.ORDER 태그가 수학적으로 도달 불능 (스왑≡대칭 항등으로 항상 중복 제거됨) | tagging 제공률 검증 0/300 | 판별 가능한 좌표 읽기 템플릿 신설 |
| 7 | VAL.02 창 [2,4] — 동류항·분배 혼입 (신규 스킬의 블러 잔재) | tagging 순수성 검증 | [4,4] 교정 |
| 8 | v1 큐레이션 은행이 micro-skill 주제를 벗어난 문항 공급 (35% 확률) | VAL.02 순수성 검증 | engine2 서빙의 은행 우회 |
| 9 | Golden 러너: 훅 순서 위반 크래시 + 보기 무셔플(정답 항상 1번) | 실브라우저 E2E | 훅 이동 + 결정적 셔플·역매핑 |

**Double Helix 좌표**: 진도축(중1 35스킬 Mastery)과 깊이축(Elite 9차원)이 한 이벤트 원장 위에서 서로의 장부를 오염시키지 않고, 이제 그 성장을 **훈련 밖의 자로 잴 준비**까지 마쳤다. 남은 것은 코드가 아니라 채림이의 시간이다.
