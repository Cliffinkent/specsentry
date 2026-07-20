import path from "node:path";

export function dataDirectory() {
  const configured = process.env.SPECSENTRY_DATA_DIR;
  return configured
    ? path.resolve(/* turbopackIgnore: true */ configured)
    : path.join(process.cwd(), "data");
}

export function screenshotsDirectory() {
  return path.join(dataDirectory(), "screenshots");
}
