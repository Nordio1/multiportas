const host = "multiportas.curitiba.br";
const key = "ae32d1afe727a2330889c89942efbd8c";
const urls = [
  `https://${host}/`,
  `https://${host}/portas-padrao-mogno-curitiba/`,
  `https://${host}/politica-de-privacidade.html`,
];
const keyLocation = `https://${host}/${key}.txt`;
const verificationAttempts = 12;
const verificationTimeoutMs = 8_000;
const submissionTimeoutMs = 15_000;
const retryDelayMs = 10_000;

const wait = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

for (const url of urls) {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || parsed.host !== host) {
    throw new Error(`IndexNow URL does not belong to ${host}: ${url}`);
  }
}

let keyAvailable = false;
let pagesAvailable = false;
for (let attempt = 1; attempt <= verificationAttempts; attempt += 1) {
  try {
    const verification = await fetch(keyLocation, {
      cache: "no-store",
      signal: AbortSignal.timeout(verificationTimeoutMs),
    });
    keyAvailable =
      verification.ok && (await verification.text()).trim() === key;
    const pages = await Promise.all(urls.map((url) => fetch(url, {
      method: "HEAD", cache: "no-store", signal: AbortSignal.timeout(verificationTimeoutMs),
    })));
    pagesAvailable = pages.every((page) => page.ok);
  } catch {
    keyAvailable = false;
    pagesAvailable = false;
  }

  if (keyAvailable && pagesAvailable) {
    break;
  }

  if (attempt < verificationAttempts) {
    console.log(
      `Waiting for the indexable pages and IndexNow key (${attempt}/${verificationAttempts}).`,
    );
    await wait(retryDelayMs);
  }
}

if (!keyAvailable || !pagesAvailable) {
  throw new Error(`IndexNow key or submitted pages were not publicly available for ${host}.`);
}

let response;
try {
  response = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host,
      key,
      keyLocation,
      urlList: urls,
    }),
    signal: AbortSignal.timeout(submissionTimeoutMs),
  });
} catch (error) {
  const reason = error instanceof Error ? error.message : String(error);
  throw new Error(`IndexNow submission failed: ${reason}`, { cause: error });
}

if (![200, 202].includes(response.status)) {
  const details = (await response.text()).trim();
  const retryAfter = response.headers.get("retry-after");
  const retryHint = retryAfter ? ` Retry after ${retryAfter}.` : "";
  const detailsHint = details ? `: ${details}` : "";
  throw new Error(`IndexNow returned ${response.status}${detailsHint}.${retryHint}`);
}

console.log(`IndexNow accepted ${urls.length} URL(s) with status ${response.status}.`);
