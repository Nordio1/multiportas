const host = "multiportas.curitiba.br";
const key = "ae32d1afe727a2330889c89942efbd8c";
const urls = [
  `https://${host}/`,
  `https://${host}/politica-de-privacidade.html`,
];
const keyLocation = `https://${host}/${key}.txt`;

let keyAvailable = false;
for (let attempt = 1; attempt <= 12; attempt += 1) {
  try {
    const verification = await fetch(keyLocation, { cache: "no-store" });
    keyAvailable =
      verification.ok && (await verification.text()).trim() === key;
  } catch {
    keyAvailable = false;
  }

  if (keyAvailable) {
    break;
  }

  console.log(`Waiting for the IndexNow key to be published (${attempt}/12).`);
  await new Promise((resolve) => setTimeout(resolve, 10_000));
}

if (!keyAvailable) {
  throw new Error(`IndexNow key was not available at ${keyLocation}.`);
}

const response = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "content-type": "application/json; charset=utf-8" },
  body: JSON.stringify({
    host,
    key,
    keyLocation,
    urlList: urls,
  }),
});

if (![200, 202].includes(response.status)) {
  const details = await response.text();
  throw new Error(`IndexNow returned ${response.status}: ${details}`);
}

console.log(`IndexNow accepted ${urls.length} URL(s) with status ${response.status}.`);
