import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${pathname}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the finished Beach Road Pizza homepage", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /Beach Road Pizza/);
  assert.match(html, /Great pizzas, great prices, for a great community\./);
  assert.match(html, /2024 Onkaparinga Business Award winner/);
  assert.match(html, /Straight from the menu/);
  assert.match(html, /\$25 Large Deal/);
  assert.match(html, /pizza-cheese-pull-v1\.mp4/);
  assert.match(html, /pasta-over-flame-v1\.mp4/);
  assert.match(html, /href="\/menu"/);
  assert.doesNotMatch(html, /href="\/catering"/);
  assert.match(html, /href="\/our-story"/);
  assert.match(html, /href="\/enquire"/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("server-renders the compact searchable menu with real categories, photos and prices", async () => {
  const response = await render("/menu");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /Search the menu/);
  assert.match(html, /Traditional pizzas/);
  assert.match(html, /Gourmet pizzas/);
  assert.match(html, /Vegan pizzas/);
  assert.match(html, /Cheese Lover/);
  assert.match(html, /Beach Road Pizza_Cheesy Double\.jpg/);
  assert.match(html, /Pastas/);
  assert.match(html, /Schnitzels/);
  assert.match(html, /From \$14\.50/);
  assert.match(html, /Small \$14\.50 \| Large \$18\.50/);
  assert.match(html, /schnitzel-and-chips-pexels\.jpg/);
});

test("removes all temporary starter files and dependencies", async () => {
  const packageJson = await readFile(new URL("../package.json", import.meta.url), "utf8");
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  await assert.rejects(access(new URL("../app/_sites-preview/SkeletonPreview.tsx", import.meta.url)));
  await assert.rejects(access(new URL("../app/_sites-preview/preview.css", import.meta.url)));
});
