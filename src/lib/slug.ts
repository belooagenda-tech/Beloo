export function slugify(input: string): string {
  const withoutAccents = input
    .normalize("NFD")
    .split("")
    .filter((char) => {
      const code = char.charCodeAt(0);
      return code < 0x0300 || code > 0x036f;
    })
    .join("");

  return withoutAccents
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}
