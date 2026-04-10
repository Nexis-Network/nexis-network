export function inferNextDistDir(argv = process.argv) {
  if (argv.includes("dev")) {
    return ".next-dev";
  }

  if (argv.includes("build") || argv.includes("start")) {
    return ".next-build";
  }

  return ".next";
}
