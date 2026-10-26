import fs from "fs/promises";
import { fileURLToPath } from "url";

import { subsetFonts } from "font-subsetter";

const htmlEntities = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

const escapeHtml = (text) =>
  text.replace(/[&<>"']/g, (character) => htmlEntities[character]);

const toLastUpdated = (timestamp) =>
  `<br /><small>Last updated <time datetime="${timestamp}">` +
  new Date(timestamp).toLocaleDateString("en-GB", { dateStyle: "long" }) +
  "</time></small>";

const toListItem = (url, name, description, updatedAt) =>
  `<li><a href="${escapeHtml(url)}"><strong>${escapeHtml(name)}</strong></a>` +
  (updatedAt ? toLastUpdated(updatedAt) : "") +
  (description ? `<br />${escapeHtml(description)}` : "") +
  "</li>";

const read = async (path, isJson = true) => {
  const file = await fs.readFile(new URL(path, import.meta.url), "utf-8");
  if (isJson) return JSON.parse(file);
  return file;
};

// Repos have pushed_at (last code push), gists only have updated_at.
const lastUpdated = (item) => item.pushed_at ?? item.updated_at;

const byNewest = (a, b) => lastUpdated(b).localeCompare(lastUpdated(a));

const outputDirectory = new URL("./dist/", import.meta.url);

(async function () {
  const [repoPages, gistPages, html] = await Promise.all([
    read("./data/repos.json"),
    read("./data/gists.json"),
    read("./index.html", false),
  ]);

  const publicRepos = repoPages
    .flat()
    .filter((repo) => !repo.private)
    .sort(byNewest);

  const toRepoList = (isFork) =>
    publicRepos
      .filter((repo) => repo.fork === isFork)
      .map((repo) =>
        toListItem(
          repo.html_url,
          repo.name,
          repo.description,
          lastUpdated(repo),
        ),
      )
      .join("");

  const repos = toRepoList(false);
  const forks = toRepoList(true);

  const gists = gistPages
    .flat()
    .filter((gist) => gist.public)
    .sort(byNewest)
    .map((gist) => {
      // Gist descriptions are written as "Name - what it does".
      const [name, ...description] = (
        gist.description || Object.keys(gist.files)[0]
      ).split(" - ");

      return toListItem(
        gist.html_url,
        name,
        description.join(" - "),
        lastUpdated(gist),
      );
    })
    .join("");

  const output = html
    .replace("{{repos}}", () => repos)
    .replace("{{gists}}", () => gists)
    .replace("{{forks}}", () => forks);

  await fs.mkdir(outputDirectory, { recursive: true });
  await Promise.all([
    // Without this marker, Pages runs the folder through Jekyll first.
    fs.writeFile(new URL(".nojekyll", outputDirectory), ""),
    fs.writeFile(new URL("index.html", outputDirectory), output),
    subsetFonts({
      html: output,
      stylesheets: [output.match(/<style>([\s\S]*?)<\/style>/)[1]],
      families: { "Noto Sans JP": "noto-sans-jp" },
      sourceDirectory: fileURLToPath(new URL("./fonts/", import.meta.url)),
      outputDirectory: fileURLToPath(new URL("fonts/", outputDirectory)),
    }),
  ]);

  console.log("Done.");
})();
