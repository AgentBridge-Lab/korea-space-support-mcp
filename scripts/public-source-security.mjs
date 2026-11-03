import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const allowedHosts = new Set([
  "irtfweb.ifa.hawaii.edu",
  "itech.keit.re.kr",
  "jwst-docs.stsci.edu",
  "nspires.nasaprs.com",
  "pms.dips.or.kr",
  "pms.jntp.or.kr",
  "r.jina.ai",
  "science.nasa.gov",
  "www.add.re.kr",
  "www.bizinfo.go.kr",
  "www.btp.or.kr",
  "www.dapa.go.kr",
  "www.djtp.or.kr",
  "www.gntp.or.kr",
  "www.itp.or.kr",
  "www.jntp.or.kr",
  "www.k-startup.go.kr",
  "www.kaia.re.kr",
  "www.kari.re.kr",
  "www.kasa.go.kr",
  "www.kasi.re.kr",
  "www.kiat.or.kr",
  "www.krit.re.kr",
  "www.smtech.go.kr",
  "xrism.isas.jaxa.jp"
]);

const isBlockedAddress = (address) => {
  const normalized = address.toLowerCase();
  if (normalized === "::" || normalized === "::1") return true;
  if (/^(?:fc|fd|fe[89ab])/.test(normalized)) return true;
  if (normalized.startsWith("::ffff:")) return isBlockedAddress(normalized.slice(7));
  if (isIP(normalized) !== 4) return false;

  const [a, b] = normalized.split(".").map(Number);
  return a === 0
    || a === 10
    || a === 127
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168)
    || a >= 224;
};

export const validatePublicSourceUrl = (value) => {
  const url = new URL(value);
  if (url.protocol !== "https:") throw new Error(`Only HTTPS public sources are allowed: ${value}`);
  if (url.username || url.password) throw new Error(`Credentials are not allowed in source URLs: ${value}`);
  if (!allowedHosts.has(url.hostname.toLowerCase())) {
    throw new Error(`Source hostname is not allowlisted: ${url.hostname}`);
  }
  if (isIP(url.hostname) || url.hostname.toLowerCase() === "localhost") {
    throw new Error(`IP literals and localhost are not allowed: ${url.hostname}`);
  }
  return url;
};

export const isAllowedPublicSourceUrl = (value) => {
  try {
    validatePublicSourceUrl(value);
    return true;
  } catch {
    return false;
  }
};

export const assertPublicSourceUrl = async (value) => {
  const url = validatePublicSourceUrl(value);
  const addresses = await lookup(url.hostname, { all: true, verbatim: true });
  if (addresses.length === 0 || addresses.some(({ address }) => isBlockedAddress(address))) {
    throw new Error(`Source hostname resolved to a blocked address: ${url.hostname}`);
  }
  return url;
};

export const fetchPublicSource = async (value, init = {}) => {
  let current = await assertPublicSourceUrl(value);
  let method = init.method;
  let body = init.body;

  for (let redirectCount = 0; redirectCount <= 5; redirectCount += 1) {
    const response = await fetch(current, { ...init, method, body, redirect: "manual" });
    if (![301, 302, 303, 307, 308].includes(response.status)) return response;

    const location = response.headers.get("location");
    if (!location) throw new Error(`Redirect without Location header: ${current.href}`);
    current = await assertPublicSourceUrl(new URL(location, current).href);
    if (response.status === 303) {
      method = "GET";
      body = undefined;
    }
  }

  throw new Error(`Too many redirects while fetching ${value}`);
};

export const readResponseBytes = async (response, maxBytes) => {
  const contentLength = Number(response.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new Error(`Response exceeds ${maxBytes} byte limit`);
  }
  if (!response.body) return Buffer.alloc(0);

  const reader = response.body.getReader();
  const chunks = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel("response size limit exceeded");
        throw new Error(`Response exceeds ${maxBytes} byte limit`);
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks, totalBytes);
};
