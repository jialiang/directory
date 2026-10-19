import fs from "fs/promises";
import { spawn } from "child_process";
import { fileURLToPath } from "url";

const htmlEntities = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
};

const decodeHtml = (html) =>
  html.replace(/&(amp|lt|gt|quot|#39);/g, (entity) => htmlEntities[entity]);

const toText = (html) => decodeHtml(html.replace(/<[^>]*>/g, ""));

const boldElements = /<(h1|h2|h3|strong)\b[^>]*>([\s\S]*?)<\/\1>/g;

const toUniqueCharacters = (text) =>
  [...new Set(text.replace(/\s+/g, " "))].join("");

const toPath = (relativePath, base = import.meta.url) =>
  fileURLToPath(new URL(relativePath, base));

const pyftsubset = toPath("../.venv/Scripts/pyftsubset.exe");

const subset = (fontName, text, format, outputDirectory) =>
  new Promise((resolve, reject) => {
    // No shell, so quotes in repo descriptions reach --text intact.
    const childProcess = spawn(pyftsubset, [
      toPath(`./${fontName}.ttf`),
      `--text=${text}`,
      "--no-ignore-missing-unicodes",
      `--output-file=${toPath(`${fontName}.${format}`, outputDirectory)}`,
      `--flavor=${format}`,
      "--with-zopfli",
      "--harfbuzz-repacker",
    ]);

    childProcess.stderr.pipe(process.stderr);
    childProcess.on("error", reject);
    childProcess.on("exit", (code) => {
      if (code === 0) return resolve();

      reject(
        new Error(`Subset ${fontName}.${format} exited with code ${code}.`),
      );
    });
  });

const subsetFonts = async (html, outputDirectory) => {
  const body = html.slice(html.indexOf("<body"));
  const boldHtml = [...body.matchAll(boldElements)].map(([element]) => element);

  const fontToText = {
    "noto-sans-jp-regular": toText(body.replace(boldElements, "")),
    "noto-sans-jp-bold": toText(boldHtml.join(" ")),
  };

  const fontsDirectory = new URL("fonts/", outputDirectory);
  await fs.mkdir(fontsDirectory, { recursive: true });

  const subsetTasks = Object.entries(fontToText).flatMap(([fontName, text]) =>
    ["woff", "woff2"].map((format) =>
      subset(fontName, toUniqueCharacters(text), format, fontsDirectory),
    ),
  );

  await Promise.all(subsetTasks);
};

export default { subsetFonts };
