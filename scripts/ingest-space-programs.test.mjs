import assert from "node:assert/strict";
import test from "node:test";
import { classifyBizinfoNotice, classifyKasaNotice, findDeadline } from "./ingest-space-programs.mjs";

test("application tables take priority over eligibility dates and research periods", () => {
  assert.equal(findDeadline("연구기간 2026-11-01 ~ 2027-07-31 접수 기간: 2026.10.20.(화) ~ 2026.11.03.(화) 18시까지"), "2026-11-03");
  assert.equal(findDeadline("마감일 기준 증빙 발급기간 2026.7.1. ~ 2026.7.9. 신청기간 공고 기간2026.7.10. ∼ 8.31. 접수 기간2026.8.3.(월) ∼ 8.31.(월) 18:00까지"), "2026-08-31");
  assert.equal(findDeadline("접수기간▪ 2026. 7. 8. ∼ 2026. 7. 22, 18:00 접수처 이메일 제출"), "2026-07-22");
});

test("KASA designation notices support short years and document receipt dates", () => {
  assert.equal(findDeadline("공고 및 접수기간: '26.10.23.(금)~'26.11.20.(금) 18:00 까지"), "2026-11-20");
  assert.equal(findDeadline("서류 접수 : 2026.10.6.~ 10.21."), "2026-10-21");
  assert.equal(classifyKasaNotice("제4차(2026년도 제3차) 우주신기술지정제 사업 공고").spaceCategory, "space_commercialization");
  assert.equal(classifyKasaNotice("2026년도 임무수요기반 성층권 드론 실증 플랫폼 개발 사업 2단계 신규과제 공고(수정)").spaceCategory, "drone_uam_adjacent");
  assert.equal(classifyKasaNotice("우주항공청 2026년 4분기 발주계획"), undefined);
  assert.equal(classifyKasaNotice("2026년도 우주항공 분야 통합 기술수요조사 공고"), undefined);
});

test("Bizinfo filters homonyms, generic defense, and exhibitions", () => {
  for (const title of [
    "2026년 소방산업 해외인증획득 지원(고비용) 공고",
    "2026년 한국방송통신전파진흥원 중소기업 ESG 지원사업 참여기업 공모",
    "2026년 4차 방산 중소기업 컨설팅 지원사업 지원대상기업 모집 공고",
    "2026년 베트남 최대 방산전시회(VIDEX 2026) 방산홍보사업 참가사 모집 공고"
  ]) assert.equal(classifyBizinfoNotice(title), undefined, title);
  assert.equal(classifyBizinfoNotice("2026년 차세대 항공 기술지원 수혜기업 모집 공고").spaceCategory, "aviation_industry");
  assert.equal(classifyBizinfoNotice("2026년 드론기업 역량강화 지원사업 공고(R&D)").spaceCategory, "drone_uam_adjacent");
});
