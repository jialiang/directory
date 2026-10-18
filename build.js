import fs from "fs/promises";

const li = `<li><a href="{{html_url}}">{{name}}</a></li>`;

const read = async (path, isJson = true) => {
  const file = await fs.readFile(new URL(path, import.meta.url), "utf-8");
  if (isJson) return JSON.parse(file);
  return file;
};

const byNewest = (a, b) =>
  (b.pushed_at ?? b.updated_at).localeCompare(a.pushed_at ?? a.updated_at);

const outputDirectory = new URL("./docs/", import.meta.url);

(async function () {
  const [repoPages, gistPages, html] = await Promise.all([
    read("./data/repos.json"),
    read("./data/gists.json"),
    read("./index.html", false),
  ]);

  const repos = repoPages
    .flat()
    .filter((repo) => !repo.private)
    .sort(byNewest)
    .map((repo) =>
      li
        .replace("{{html_url}}", () => repo.html_url)
        .replace("{{name}}", () => repo.name),
    )
    .join("");

  const gists = gistPages
    .flat()
    .filter((gist) => gist.public)
    .sort(byNewest)
    .map((gist) =>
      li
        .replace("{{html_url}}", () => gist.html_url)
        .replace(
          "{{name}}",
          () =>
            (gist.description || Object.keys(gist.files)[0]).split(" - ")[0],
        ),
    )
    .join("");

  const output = html
    .replace("{{repos}}", () => repos)
    .replace("{{gists}}", () => gists);

  await fs.mkdir(outputDirectory, { recursive: true });
  await Promise.all([
    // Without this marker, Pages runs the folder through Jekyll first.
    fs.writeFile(new URL(".nojekyll", outputDirectory), ""),
    fs.writeFile(new URL("index.html", outputDirectory), output),
  ]);

  console.log("Done.");
})();
