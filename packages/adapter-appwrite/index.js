// adapter-appwrites.js
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "url";

const files = fileURLToPath(new URL("./files", import.meta.url).href);

/** @type {import('./index.js').default} */
export default function (opts = {}) {
  const { out = "build", precompress } = opts;

  return {
    name: "adapter-appwrite",

    async adapt(builder) {
      const tmp = builder.getBuildDirectory("adapter-appwrite");

      // Clean up previous builds using builder's rimraf function
      builder.rimraf(tmp);
      builder.rimraf(out);
      builder.mkdirp(tmp);
      builder.mkdirp(out);

      builder.log.minor("Copying assets");
      builder.writeClient(`${out}/client`);
      builder.writePrerendered(`${out}/prerendered`);

      if (precompress) {
        builder.log.minor("Compressing assets");
        await Promise.all([
          builder.compress(`${out}/client`),
          builder.compress(`${out}/prerendered`),
        ]);
      }

      builder.log.minor("Building server");
      builder.writeServer(tmp);

      builder.log.info("Preparing application for Appwrite...");

      let prerendered_entries = Array.from(builder.prerendered.pages.entries());

      if (builder.config.kit.paths.base) {
        prerendered_entries = prerendered_entries.map(([path, { file }]) => [
          path,
          { file: `${builder.config.kit.paths.base}/${file}` },
        ]);
      }

      writeFileSync(
        `${tmp}/manifest.js`,
        [
          `export const manifest = ${builder.generateManifest({
            relativePath: "./",
          })};`,
          `export const prerendered = new Set(${JSON.stringify(
            builder.prerendered.paths
          )});`,
        ].join("\n\n")
      );

      // Use builder.copy to process and move the entry file
      builder.copy(files, out, {
        replace: {
          SERVER: `./server/index.js`,
          MANIFEST: "./server/manifest.js",
        },
      });

      builder.copy(tmp, `${out}/server`, {
        replace: {
          SERVER: `./index.js`,
          MANIFEST: ".//manifest.js",
        },
      });

      builder.log.info("Application prepared for Appwrite");
    },
    supports: {
      read: () => true,
    },
  };
}
