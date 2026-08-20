# PHASE 0 AUDIT REPORT

감사 대상: `C:\연세클로드\chaerim-math` (2026-08-13~08-18 프로토타입, React 19 + Vite + Tailwind 4, JavaScript)

## 현황 요약

| 항목 | 상태 | 평가 |
|---|---|---|
| Architecture | 화면 중심 (screens/components/lib) | ⚠️ 엔진-UI 분리 없음. 스펙 §69~70의 engine 분리 구조 미충족 |
| Question Bank | 절차적 생성기 25종 (5영역 × 5레벨), 4지선다 | ✅ 재사용 가치 높음. 단, 오답 선택지에 error-type 태깅 없음 |
| 생성기 검증 | `scripts/verify-generators.mjs` — 7,500문제 구조 검증 통과 | ✅ 유지 |
| Data Model | domain 단위 (수와연산/문자와식/함수/도형/확률통계), 레벨=학년 진도 | ❌ 스펙과 불일치: 스킬 단위 Knowledge Graph + prerequisite 필요. 레벨은 "동일 스킬 내 난이도"여야 함 (§5) |
| Skill ID 체계 | 없음 | ❌ M1.NUM.INT.01 형태 필요 (§4) |
| 승급 로직 | 3연속 정답 → 레벨업 | ❌ Mastery Gate(정답률+Transfer+힌트의존도) 아님 (§12) |
| Mastery Score | 없음 (정답률만) | ❌ 종합 점수 필요 (§7) |
| 오답 분석 | 학생 self-태그 4종만 | ⚠️ WHY WRONG ENGINE(자동 진단 + taxonomy 12종) 없음 (§8) |
| Error Clinic | 없음 (오답 → 해설 → 다음 문제) | ❌ Similar A/B → Transfer → Mastery Check 루프 필요 (§10~11) |
| Spaced Repetition | 없음 (reviewQueue 있으나 소비 로직 없음) | ❌ (§16) |
| 진단평가 | 영역당 2문제 적응형 (L3→L4/L2) | ⚠️ 방향은 맞음, 스킬 단위로 재설계 필요 |
| Knowledge Map | 없음 | ❌ (§17) |
| Today's Quest | 없음 (영역 자유 선택만) | ❌ (§19) |
| Root Cause Analysis | 없음 | ❌ (§18) |
| TypeScript | JavaScript | ⚠️ 스펙 §68은 TS 권장 |
| State | React Context + localStorage | ✅ MVP 규모에 적절. 유지 |
| Technical Debt | `src/assets` 빈 폴더 잠김(무해), `public/icons.svg` 미사용 | 사소 |
| Bugs | 발견 없음 (생성기 스트레스 테스트 통과) | — |

## 결정

1. **새 저장소 `chloe-math-quest`로 재구축** (React + TypeScript + Vite + Tailwind + Recharts + Lucide).
   기존 프로토타입은 데이터 모델(도메인=학년진도)이 스펙의 핵심 전제(스킬=단원, 레벨=난이도, prerequisite 그래프)와 충돌하므로 리팩터보다 재구축이 빠르고 안전함.
2. **이식 자산**: 문제 생성기의 수학 유틸(분수 약분, 근호 단순화, 선택지 셔플러)과 검증 스크립트 방식. 생성기는 스킬×난이도 축으로 재작성하며 **모든 오답 선택지에 error-type을 태깅**해 WHY WRONG ENGINE의 입력으로 사용.
3. 기존 `chaerim-math` 폴더는 참고용으로 보존.
