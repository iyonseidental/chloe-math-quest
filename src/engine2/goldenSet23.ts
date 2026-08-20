// CHLOE MATH GOLDEN SET (Phase 3 STEP 14/15, PART 24-28/57).
//
// 훈련에 절대 사용하지 않는 독립 성장 측정 벤치마크. 규칙 (PART 25/47):
//   · Today's Quest / Remediation / Spaced Repetition / Fast Track / Elite training 사용 금지
//   · 결과를 teach/recommend/remediate/update-mastery에 쓰면 FAIL — 오직 measure growth
//   · 시행 중 adaptive feedback 없음 (힌트 없음, 난이도 조정 없음)
// Parallel Forms (PART 26): 같은 구조(parallelGroup)의 A/B/C 변형 — pre/mid/post에서
// 같은 문제의 재사용 없이 동등 난이도로 비교한다.
// 전 문항은 본 프로젝트 원저작이며 훈련 은행(생성기·Elite Bank)과 겹치지 않는다 (PART 57).
import type { EliteDimension } from './elite22.ts';

export type GoldenForm = 'A' | 'B' | 'C';
export type GoldenArea = 'CORE' | 'NEAR_TRANSFER' | 'FAR_TRANSFER' | 'ELITE';

export interface GoldenItem {
  id: string;
  form: GoldenForm;
  parallelGroup: string; // 같은 구조의 3형제 묶음
  area: GoldenArea;
  eliteDimension?: EliteDimension;
  skillIds: string[]; // 커버리지 문서화 (PART 57)
  difficulty: number;
  stem: string;
  choices: string[];
  answerIndex: number;
  estimatedSec: number;
}

const I = (o: GoldenItem) => o;

export const GOLDEN_SET: GoldenItem[] = [
  // ═══════════ CORE — Concept Accuracy / Independent Solving (PART 27) ═══════════
  // C1: 정수 혼합 계산
  I({ id: 'G.A.C1', form: 'A', parallelGroup: 'C1', area: 'CORE', skillIds: ['M1.NUM.SIGN.01', 'M1.NUM.SIGN.02'], difficulty: 3, stem: '다음을 계산하세요.\n7 − 4 × (−3)', choices: ['19', '−5', '−9', '5'], answerIndex: 0, estimatedSec: 45 }),
  I({ id: 'G.B.C1', form: 'B', parallelGroup: 'C1', area: 'CORE', skillIds: ['M1.NUM.SIGN.01', 'M1.NUM.SIGN.02'], difficulty: 3, stem: '다음을 계산하세요.\n5 − 6 × (−2)', choices: ['17', '−7', '2', '−17'], answerIndex: 0, estimatedSec: 45 }),
  I({ id: 'G.C.C1', form: 'C', parallelGroup: 'C1', area: 'CORE', skillIds: ['M1.NUM.SIGN.01', 'M1.NUM.SIGN.02'], difficulty: 3, stem: '다음을 계산하세요.\n9 − 3 × (−5)', choices: ['24', '−6', '−30', '12'], answerIndex: 0, estimatedSec: 45 }),
  // C2: 분수 덧셈
  I({ id: 'G.A.C2', form: 'A', parallelGroup: 'C2', area: 'CORE', skillIds: ['M1.NUM.FRAC.01'], difficulty: 3, stem: '다음을 계산하세요.\n1/2 + 1/3', choices: ['5/6', '2/5', '1/6', '3/5'], answerIndex: 0, estimatedSec: 50 }),
  I({ id: 'G.B.C2', form: 'B', parallelGroup: 'C2', area: 'CORE', skillIds: ['M1.NUM.FRAC.01'], difficulty: 3, stem: '다음을 계산하세요.\n1/4 + 2/3', choices: ['11/12', '3/7', '1/3', '7/12'], answerIndex: 0, estimatedSec: 50 }),
  I({ id: 'G.C.C2', form: 'C', parallelGroup: 'C2', area: 'CORE', skillIds: ['M1.NUM.FRAC.01'], difficulty: 3, stem: '다음을 계산하세요.\n2/5 + 1/2', choices: ['9/10', '3/7', '3/10', '4/5'], answerIndex: 0, estimatedSec: 50 }),
  // C3: 일차방정식
  I({ id: 'G.A.C3', form: 'A', parallelGroup: 'C3', area: 'CORE', skillIds: ['M1.ALG.EQ.AX.01'], difficulty: 3, stem: '방정식을 푸세요.\n3x − 5 = 10', choices: ['x = 5', 'x = 3', 'x = 15', 'x = −5'], answerIndex: 0, estimatedSec: 50 }),
  I({ id: 'G.B.C3', form: 'B', parallelGroup: 'C3', area: 'CORE', skillIds: ['M1.ALG.EQ.AX.01'], difficulty: 3, stem: '방정식을 푸세요.\n4x + 7 = 31', choices: ['x = 6', 'x = 9.5', 'x = 24', 'x = −6'], answerIndex: 0, estimatedSec: 50 }),
  I({ id: 'G.C.C3', form: 'C', parallelGroup: 'C3', area: 'CORE', skillIds: ['M1.ALG.EQ.AX.01'], difficulty: 3, stem: '방정식을 푸세요.\n5x − 8 = 22', choices: ['x = 6', 'x = 2.8', 'x = 30', 'x = −6'], answerIndex: 0, estimatedSec: 50 }),
  // C4: 동류항 정리
  I({ id: 'G.A.C4', form: 'A', parallelGroup: 'C4', area: 'CORE', skillIds: ['M1.ALG.EXP.01'], difficulty: 2, stem: '다음 식을 간단히 하세요.\n5x + 3 − 2x + 4', choices: ['3x + 7', '10x', '3x − 1', '7x + 7'], answerIndex: 0, estimatedSec: 40 }),
  I({ id: 'G.B.C4', form: 'B', parallelGroup: 'C4', area: 'CORE', skillIds: ['M1.ALG.EXP.01'], difficulty: 2, stem: '다음 식을 간단히 하세요.\n7x − 2 − 4x + 6', choices: ['3x + 4', '3x − 8', '11x + 4', '7x'], answerIndex: 0, estimatedSec: 40 }),
  I({ id: 'G.C.C4', form: 'C', parallelGroup: 'C4', area: 'CORE', skillIds: ['M1.ALG.EXP.01'], difficulty: 2, stem: '다음 식을 간단히 하세요.\n6x + 1 − x + 5', choices: ['5x + 6', '5x − 4', '12x', '6x + 6'], answerIndex: 0, estimatedSec: 40 }),
  // C5: 반비례 값
  I({ id: 'G.A.C5', form: 'A', parallelGroup: 'C5', area: 'CORE', skillIds: ['M1.FUN.PROP.03'], difficulty: 3, stem: 'y가 x에 반비례하고 x = 3일 때 y = 8입니다. x = 6일 때 y는?', choices: ['4', '16', '24', '2'], answerIndex: 0, estimatedSec: 60 }),
  I({ id: 'G.B.C5', form: 'B', parallelGroup: 'C5', area: 'CORE', skillIds: ['M1.FUN.PROP.03'], difficulty: 3, stem: 'y가 x에 반비례하고 x = 2일 때 y = 9입니다. x = 6일 때 y는?', choices: ['3', '27', '18', '6'], answerIndex: 0, estimatedSec: 60 }),
  I({ id: 'G.C.C5', form: 'C', parallelGroup: 'C5', area: 'CORE', skillIds: ['M1.FUN.PROP.03'], difficulty: 3, stem: 'y가 x에 반비례하고 x = 4일 때 y = 6입니다. x = 8일 때 y는?', choices: ['3', '12', '24', '6'], answerIndex: 0, estimatedSec: 60 }),
  // C6: 평균 역산
  I({ id: 'G.A.C6', form: 'A', parallelGroup: 'C6', area: 'CORE', skillIds: ['M1.STA.AVG.02'], difficulty: 3, stem: '세 수 4, 9, x의 평균이 7일 때 x는?', choices: ['8', '7', '21', '10'], answerIndex: 0, estimatedSec: 55 }),
  I({ id: 'G.B.C6', form: 'B', parallelGroup: 'C6', area: 'CORE', skillIds: ['M1.STA.AVG.02'], difficulty: 3, stem: '세 수 6, 11, x의 평균이 9일 때 x는?', choices: ['10', '9', '27', '8'], answerIndex: 0, estimatedSec: 55 }),
  I({ id: 'G.C.C6', form: 'C', parallelGroup: 'C6', area: 'CORE', skillIds: ['M1.STA.AVG.02'], difficulty: 3, stem: '세 수 5, 12, x의 평균이 8일 때 x는?', choices: ['7', '8', '24', '6'], answerIndex: 0, estimatedSec: 55 }),

  // ═══════════ NEAR TRANSFER — 배운 개념, 가까운 새 상황 ═══════════
  // T1: 정수 → 실생활 증감
  I({ id: 'G.A.T1', form: 'A', parallelGroup: 'T1', area: 'NEAR_TRANSFER', skillIds: ['M1.NUM.SIGN.01'], difficulty: 3, stem: '아침 기온이 −4°C였습니다. 낮에 9°C 올랐다가 저녁에 6°C 내렸습니다. 지금 기온은?', choices: ['−1°C', '1°C', '−19°C', '11°C'], answerIndex: 0, estimatedSec: 60 }),
  I({ id: 'G.B.T1', form: 'B', parallelGroup: 'T1', area: 'NEAR_TRANSFER', skillIds: ['M1.NUM.SIGN.01'], difficulty: 3, stem: '잠수부가 수면 아래 2m(−2m)에서 8m 올라갔다가 5m 내려갔습니다. 지금 위치는?', choices: ['1m', '−1m', '−15m', '11m'], answerIndex: 0, estimatedSec: 60 }),
  I({ id: 'G.C.T1', form: 'C', parallelGroup: 'T1', area: 'NEAR_TRANSFER', skillIds: ['M1.NUM.SIGN.01'], difficulty: 3, stem: '게임 점수가 −5점에서 12점을 얻고 4점을 잃었습니다. 지금 점수는?', choices: ['3점', '−3점', '−21점', '13점'], answerIndex: 0, estimatedSec: 60 }),
  // T2: 방정식 → 문장 번역
  I({ id: 'G.A.T2', form: 'A', parallelGroup: 'T2', area: 'NEAR_TRANSFER', skillIds: ['M1.ALG.EQ.03'], difficulty: 3, stem: '어떤 수의 3배보다 4 큰 수가 19입니다. 어떤 수는?', choices: ['5', '23/3', '15', '4'], answerIndex: 0, estimatedSec: 70 }),
  I({ id: 'G.B.T2', form: 'B', parallelGroup: 'T2', area: 'NEAR_TRANSFER', skillIds: ['M1.ALG.EQ.03'], difficulty: 3, stem: '어떤 수의 2배보다 7 큰 수가 23입니다. 어떤 수는?', choices: ['8', '15', '16', '6'], answerIndex: 0, estimatedSec: 70 }),
  I({ id: 'G.C.T2', form: 'C', parallelGroup: 'T2', area: 'NEAR_TRANSFER', skillIds: ['M1.ALG.EQ.03'], difficulty: 3, stem: '어떤 수의 5배보다 3 작은 수가 27입니다. 어떤 수는?', choices: ['6', '24/5', '30', '5'], answerIndex: 0, estimatedSec: 70 }),

  // ═══════════ FAR TRANSFER — 배운 구조, 먼 새 상황 ═══════════
  // T3: 반비례 구조의 원거리 적용
  I({ id: 'G.A.T3', form: 'A', parallelGroup: 'T3', area: 'FAR_TRANSFER', skillIds: ['M1.FUN.PROP.03'], difficulty: 4, stem: '맞물린 두 톱니바퀴에서 톱니 40개인 A가 3바퀴 도는 동안, 톱니 24개인 B는 몇 바퀴 돌까요?', choices: ['5바퀴', '1.8바퀴', '3바퀴', '8바퀴'], answerIndex: 0, estimatedSec: 90 }),
  I({ id: 'G.B.T3', form: 'B', parallelGroup: 'T3', area: 'FAR_TRANSFER', skillIds: ['M1.FUN.PROP.03'], difficulty: 4, stem: '넓이가 36cm²로 정해진 직사각형을 만듭니다. 가로가 4cm면 세로는 9cm입니다. 가로를 9cm로 하면 세로는?', choices: ['4cm', '9cm', '5cm', '12cm'], answerIndex: 0, estimatedSec: 90 }),
  I({ id: 'G.C.T3', form: 'C', parallelGroup: 'T3', area: 'FAR_TRANSFER', skillIds: ['M1.FUN.PROP.03'], difficulty: 4, stem: '집에서 도서관까지 시속 20km로 가면 3시간 걸립니다. 시속 30km로 가면 몇 시간 걸릴까요?', choices: ['2시간', '4.5시간', '3시간', '1.5시간'], answerIndex: 0, estimatedSec: 90 }),
  // T4: 가중 평균 구조
  I({ id: 'G.A.T4', form: 'A', parallelGroup: 'T4', area: 'FAR_TRANSFER', skillIds: ['M1.STA.AVG.01', 'M1.STA.AVG.03'], difficulty: 4, stem: '남학생 10명의 평균이 60점, 여학생 30명의 평균이 80점입니다. 전체 40명의 평균은?', choices: ['75점', '70점', '80점', '72점'], answerIndex: 0, estimatedSec: 100 }),
  I({ id: 'G.B.T4', form: 'B', parallelGroup: 'T4', area: 'FAR_TRANSFER', skillIds: ['M1.STA.AVG.01', 'M1.STA.AVG.03'], difficulty: 4, stem: 'A반 10명의 평균이 70점, B반 30명의 평균이 90점입니다. 두 반 전체 40명의 평균은?', choices: ['85점', '80점', '90점', '82점'], answerIndex: 0, estimatedSec: 100 }),
  I({ id: 'G.C.T4', form: 'C', parallelGroup: 'T4', area: 'FAR_TRANSFER', skillIds: ['M1.STA.AVG.01', 'M1.STA.AVG.03'], difficulty: 4, stem: '1모둠 5명의 평균이 64점, 2모둠 15명의 평균이 84점입니다. 전체 20명의 평균은?', choices: ['79점', '74점', '84점', '76점'], answerIndex: 0, estimatedSec: 100 }),

  // ═══════════ ELITE — 사고 차원별 1문항 (PART 27) ═══════════
  // E-REP: 표현 전환 (수직선 중점)
  I({ id: 'G.A.ER', form: 'A', parallelGroup: 'E-REP', area: 'ELITE', eliteDimension: 'representation', skillIds: ['M1.NUM.SIGN.01'], difficulty: 4, stem: '수직선에서 −3과 5의 정확히 한가운데에 있는 수는?', choices: ['1', '2', '−1', '4'], answerIndex: 0, estimatedSec: 90 }),
  I({ id: 'G.B.ER', form: 'B', parallelGroup: 'E-REP', area: 'ELITE', eliteDimension: 'representation', skillIds: ['M1.NUM.SIGN.01'], difficulty: 4, stem: '수직선에서 −7과 3의 정확히 한가운데에 있는 수는?', choices: ['−2', '2', '−5', '5'], answerIndex: 0, estimatedSec: 90 }),
  I({ id: 'G.C.ER', form: 'C', parallelGroup: 'E-REP', area: 'ELITE', eliteDimension: 'representation', skillIds: ['M1.NUM.SIGN.01'], difficulty: 4, stem: '수직선에서 −1과 9의 정확히 한가운데에 있는 수는?', choices: ['4', '5', '−4', '8'], answerIndex: 0, estimatedSec: 90 }),
  // E-STR: 전략 선택 (효율적 분해)
  I({ id: 'G.A.ES', form: 'A', parallelGroup: 'E-STR', area: 'ELITE', eliteDimension: 'strategySelection', skillIds: ['M1.ALG.EXP.02'], difficulty: 4, stem: '25 × 19를 "25 × 20에서 25를 빼기"로 계산하면?', choices: ['475', '500', '450', '495'], answerIndex: 0, estimatedSec: 80 }),
  I({ id: 'G.B.ES', form: 'B', parallelGroup: 'E-STR', area: 'ELITE', eliteDimension: 'strategySelection', skillIds: ['M1.ALG.EXP.02'], difficulty: 4, stem: '98 × 6을 "100 × 6에서 2 × 6을 빼기"로 계산하면?', choices: ['588', '600', '576', '592'], answerIndex: 0, estimatedSec: 80 }),
  I({ id: 'G.C.ES', form: 'C', parallelGroup: 'E-STR', area: 'ELITE', eliteDimension: 'strategySelection', skillIds: ['M1.ALG.EXP.02'], difficulty: 4, stem: '45 × 22를 "45 × 20에 45 × 2를 더하기"로 계산하면?', choices: ['990', '900', '1000', '940'], answerIndex: 0, estimatedSec: 80 }),
  // E-INT: 다개념 통합 (좌표+넓이)
  I({ id: 'G.A.EI', form: 'A', parallelGroup: 'E-INT', area: 'ELITE', eliteDimension: 'integration', skillIds: ['M1.FUN.AREA.01', 'M1.FUN.COORD.01'], difficulty: 4, stem: '세 점 (0,0), (4,0), (4,6)을 꼭짓점으로 하는 삼각형의 넓이는?', choices: ['12', '24', '10', '48'], answerIndex: 0, estimatedSec: 110 }),
  I({ id: 'G.B.EI', form: 'B', parallelGroup: 'E-INT', area: 'ELITE', eliteDimension: 'integration', skillIds: ['M1.FUN.AREA.01', 'M1.FUN.COORD.01'], difficulty: 4, stem: '세 점 (0,0), (6,0), (6,5)를 꼭짓점으로 하는 삼각형의 넓이는?', choices: ['15', '30', '11', '60'], answerIndex: 0, estimatedSec: 110 }),
  I({ id: 'G.C.EI', form: 'C', parallelGroup: 'E-INT', area: 'ELITE', eliteDimension: 'integration', skillIds: ['M1.FUN.AREA.01', 'M1.FUN.COORD.01'], difficulty: 4, stem: '세 점 (0,0), (10,0), (10,4)를 꼭짓점으로 하는 삼각형의 넓이는?', choices: ['20', '40', '14', '80'], answerIndex: 0, estimatedSec: 110 }),
  // E-NOV: 비정형 (새 연산 정의)
  I({ id: 'G.A.EN', form: 'A', parallelGroup: 'E-NOV', area: 'ELITE', eliteDimension: 'novelTransfer', skillIds: ['M1.NUM.SIGN.01', 'M1.NUM.SIGN.02'], difficulty: 4, stem: '새 연산 ★: a ★ b = 2a − b로 정합니다. 3 ★ (−4)의 값은?', choices: ['10', '2', '−10', '11'], answerIndex: 0, estimatedSec: 100 }),
  I({ id: 'G.B.EN', form: 'B', parallelGroup: 'E-NOV', area: 'ELITE', eliteDimension: 'novelTransfer', skillIds: ['M1.NUM.SIGN.01', 'M1.NUM.SIGN.02'], difficulty: 4, stem: '새 연산 ♥: a ♥ b = a × b + a로 정합니다. (−2) ♥ 5의 값은?', choices: ['−12', '−8', '−5', '12'], answerIndex: 0, estimatedSec: 100 }),
  I({ id: 'G.C.EN', form: 'C', parallelGroup: 'E-NOV', area: 'ELITE', eliteDimension: 'novelTransfer', skillIds: ['M1.NUM.SIGN.01', 'M1.NUM.SIGN.02'], difficulty: 4, stem: '새 연산 ◎: a ◎ b = a + b − a × b로 정합니다. 4 ◎ (−3)의 값은?', choices: ['13', '−11', '1', '−13'], answerIndex: 0, estimatedSec: 100 }),
  // E-GEN: 일반화 (성냥개비 일반항 — n=1 함정 공통 설계)
  I({ id: 'G.A.EG', form: 'A', parallelGroup: 'E-GEN', area: 'ELITE', eliteDimension: 'generalization', skillIds: ['M1.ALG.PAT.01'], difficulty: 4, stem: '성냥개비로 정삼각형을 한 줄로 이어 붙입니다. 삼각형 1개엔 3개, 2개엔 5개, 3개엔 7개가 필요합니다. 삼각형 n개에 필요한 성냥개비 수는?', choices: ['2n + 1', '3n', 'n + 2', '2n − 1'], answerIndex: 0, estimatedSec: 120 }),
  I({ id: 'G.B.EG', form: 'B', parallelGroup: 'E-GEN', area: 'ELITE', eliteDimension: 'generalization', skillIds: ['M1.ALG.PAT.01'], difficulty: 4, stem: '성냥개비로 정사각형을 한 줄로 이어 붙입니다. 사각형 1개엔 4개, 2개엔 7개, 3개엔 10개가 필요합니다. 사각형 n개에 필요한 성냥개비 수는?', choices: ['3n + 1', '4n', 'n + 3', '3n − 1'], answerIndex: 0, estimatedSec: 120 }),
  I({ id: 'G.C.EG', form: 'C', parallelGroup: 'E-GEN', area: 'ELITE', eliteDimension: 'generalization', skillIds: ['M1.ALG.PAT.01'], difficulty: 4, stem: '성냥개비로 정오각형을 한 줄로 이어 붙입니다. 오각형 1개엔 5개, 2개엔 9개, 3개엔 13개가 필요합니다. 오각형 n개에 필요한 성냥개비 수는?', choices: ['4n + 1', '5n', 'n + 4', '4n − 1'], answerIndex: 0, estimatedSec: 120 }),
  // E-JUS: 정당화 (완전한 근거 선별)
  I({ id: 'G.A.EJ', form: 'A', parallelGroup: 'E-JUS', area: 'ELITE', eliteDimension: 'justification', skillIds: ['M1.ALG.EXP.01'], difficulty: 4, stem: '"연속한 두 정수의 합은 항상 홀수다"의 근거로 가장 완전한 것은?', choices: ['n + (n+1) = 2n + 1이고, 2n은 짝수이므로 +1을 하면 홀수', '3+4=7, 5+6=11처럼 예에서 확인된다', '연속한 수는 홀짝이 섞이기 때문', '홀수가 더 많기 때문'], answerIndex: 0, estimatedSec: 120 }),
  I({ id: 'G.B.EJ', form: 'B', parallelGroup: 'E-JUS', area: 'ELITE', eliteDimension: 'justification', skillIds: ['M1.ALG.EXP.01'], difficulty: 4, stem: '"짝수와 홀수의 합은 항상 홀수다"의 근거로 가장 완전한 것은?', choices: ['2a + (2b+1) = 2(a+b) + 1 — 짝수 부분에 1이 남는다', '2+3=5, 4+7=11처럼 예에서 확인된다', '홀수가 하나 있으면 합도 홀수가 되는 규칙이 있어서', '짝수와 홀수는 번갈아 나오기 때문'], answerIndex: 0, estimatedSec: 120 }),
  I({ id: 'G.C.EJ', form: 'C', parallelGroup: 'E-JUS', area: 'ELITE', eliteDimension: 'justification', skillIds: ['M1.ALG.EXP.01'], difficulty: 4, stem: '"5의 배수끼리 더하면 항상 5의 배수다"의 근거로 가장 완전한 것은?', choices: ['5a + 5b = 5(a+b) — 합이 5로 묶인다', '10+15=25, 20+5=25처럼 예에서 확인된다', '5의 배수는 끝자리가 0이나 5라서', '배수끼리는 원래 더해도 배수라서'], answerIndex: 0, estimatedSec: 120 }),
];

export const GOLDEN_FORMS: GoldenForm[] = ['A', 'B', 'C'];

export function goldenForm(form: GoldenForm): GoldenItem[] {
  return GOLDEN_SET.filter((i) => i.form === form);
}

// PART 57 — Golden Set 품질 게이트: 훈련 은행보다 엄격하게.
export function validateGoldenSet(trainingStems: string[]): { ok: boolean; issues: string[] } {
  const issues: string[] = [];
  const ids = new Set<string>();
  const groups = new Map<string, GoldenItem[]>();
  for (const it of GOLDEN_SET) {
    if (ids.has(it.id)) issues.push(`${it.id}: 중복 id`);
    ids.add(it.id);
    if (it.choices.length !== 4) issues.push(`${it.id}: 보기 4개 아님`);
    if (new Set(it.choices).size !== 4) issues.push(`${it.id}: 보기 중복`);
    if (it.answerIndex < 0 || it.answerIndex > 3) issues.push(`${it.id}: answerIndex 범위 밖`);
    if (it.area === 'ELITE' && !it.eliteDimension) issues.push(`${it.id}: ELITE인데 차원 미선언`);
    (groups.get(it.parallelGroup) ?? groups.set(it.parallelGroup, []).get(it.parallelGroup)!).push(it);
  }
  // Parallel form 정합: 각 그룹은 A/B/C 정확히 1개씩, 같은 area/difficulty/차원
  for (const [g, items] of groups) {
    if (items.length !== 3 || new Set(items.map((i) => i.form)).size !== 3) issues.push(`group ${g}: A/B/C 각 1문항이 아님`);
    if (new Set(items.map((i) => i.area)).size !== 1) issues.push(`group ${g}: area 불일치`);
    if (new Set(items.map((i) => i.difficulty)).size !== 1) issues.push(`group ${g}: 난이도 불일치`);
    if (new Set(items.map((i) => i.eliteDimension ?? '-')).size !== 1) issues.push(`group ${g}: elite 차원 불일치`);
    // 같은 그룹 안에서 지문이 그대로 재사용되면 pre/post 오염 (PART 26)
    if (new Set(items.map((i) => i.stem)).size !== 3) issues.push(`group ${g}: 폼 간 지문 중복`);
  }
  // 훈련 은행과의 지문 중복 금지 (No training overlap)
  const train = new Set(trainingStems);
  for (const it of GOLDEN_SET) if (train.has(it.stem)) issues.push(`${it.id}: 훈련 은행 지문과 동일`);
  return { ok: issues.length === 0, issues };
}

// 커버리지 문서화 (PART 57): 영역/차원/스킬 커버 요약
export function goldenCoverage() {
  const areas: Record<string, number> = {};
  const dims: Record<string, number> = {};
  const skills = new Set<string>();
  for (const it of GOLDEN_SET) {
    areas[it.area] = (areas[it.area] ?? 0) + 1;
    if (it.eliteDimension) dims[it.eliteDimension] = (dims[it.eliteDimension] ?? 0) + 1;
    for (const s of it.skillIds) skills.add(s);
  }
  return { total: GOLDEN_SET.length, areas, eliteDimensions: dims, skillsCovered: [...skills] };
}
