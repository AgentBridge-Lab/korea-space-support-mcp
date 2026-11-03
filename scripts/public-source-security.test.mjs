import assert from "node:assert/strict";
import test from "node:test";
import {
  isAllowedPublicSourceUrl,
  readResponseBytes,
  validatePublicSourceUrl
} from "./public-source-security.mjs";

test("public source allowlist accepts official HTTPS hosts", () => {
  assert.equal(isAllowedPublicSourceUrl("https://www.kasa.go.kr/bbs/notice"), true);
  assert.equal(isAllowedPublicSourceUrl("https://science.nasa.gov/researchers/"), true);
});

test("response reader stops while streaming past the byte limit", async () => {
  const response = new Response(new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(8));
      controller.enqueue(new Uint8Array(8));
      controller.close();
    }
  }));
  await assert.rejects(() => readResponseBytes(response, 10), /byte limit/);
});

test("public source allowlist blocks SSRF targets and credentials", () => {
  for (const url of [
    "http://www.kasa.go.kr/bbs/notice",
    "https://127.0.0.1/internal",
    "https://169.254.169.254/latest/meta-data",
    "https://localhost/admin",
    "https://user:pass@www.kasa.go.kr/bbs/notice",
    "https://evil.example/redirect"
  ]) {
    assert.throws(() => validatePublicSourceUrl(url), undefined, url);
  }
});
