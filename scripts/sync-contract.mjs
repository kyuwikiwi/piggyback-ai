// Pull the API contract and the canonical scenario from the backend repo.
//
// The backend owns both files (docs/01-requirements.md §11 names openapi.yaml
// the contract of record, §10 DEC-02 names the canonical scenario the shared
// input). They are vendored here rather than fetched at build time so a build
// never depends on GitHub being reachable -- but vendored copies drift, so this
// script exists to refresh them deliberately.
//
//   node scripts/sync-contract.mjs            # from main
//   node scripts/sync-contract.mjs some-branch
//
// Run `npm run gen:api` afterwards; a contract change that is not regenerated
// is invisible until something breaks at runtime.

import { writeFile } from "node:fs/promises";
import { argv, exit } from "node:process";

const REPO = "xiuiworld/piggyon_back";
const ref = argv[2] ?? "main";

const FILES = [
  { from: "docs/openapi.yaml", to: "contract/openapi.yaml" },
  {
    from: "data/canonical-v1/scenario.json",
    to: "src/data/canonical-v1/scenario.json",
  },
];

for (const { from, to } of FILES) {
  const url = `https://raw.githubusercontent.com/${REPO}/${ref}/${from}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`${res.status} ${res.statusText} for ${url}`);
    exit(1);
  }
  await writeFile(to, await res.text(), "utf8");
  console.log(`${to}  <-  ${REPO}@${ref}/${from}`);
}
