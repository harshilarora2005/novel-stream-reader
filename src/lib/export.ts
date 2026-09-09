import JSZip from "jszip";

export type ExportBook = {
  title: string;
  author: string;
  cover_url?: string | null;
  slug: string;
};
export type ExportChapter = { n: number; title: string; content: string };

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function paras(content: string) {
  return content
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function exportText(book: ExportBook, chapters: ExportChapter[]) {
  const body = [
    book.title,
    book.author,
    "",
    ...chapters.flatMap((c) => [`\n\n${c.title}\n`, ...paras(c.content)]),
  ].join("\n\n");
  download(new Blob([body], { type: "text/plain;charset=utf-8" }), `${book.slug}.txt`);
}

export function exportMarkdown(book: ExportBook, chapters: ExportChapter[]) {
  const body = [
    `# ${book.title}`,
    `*by ${book.author}*`,
    ...chapters.flatMap((c) => [`\n## ${c.title}`, ...paras(c.content)]),
  ].join("\n\n");
  download(new Blob([body], { type: "text/markdown;charset=utf-8" }), `${book.slug}.md`);
}

export async function exportEpub(book: ExportBook, chapters: ExportChapter[]) {
  const zip = new JSZip();
  zip.file("mimetype", "application/epub+zip", { compression: "STORE" });
  zip.folder("META-INF")!.file(
    "container.xml",
    `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>`,
  );

  const oebps = zip.folder("OEBPS")!;
  let coverItem = "";
  let coverMeta = "";
  if (book.cover_url) {
    try {
      const res = await fetch(book.cover_url);
      if (res.ok) {
        const buf = await res.arrayBuffer();
        const type = res.headers.get("content-type") ?? "image/jpeg";
        const ext = type.includes("png") ? "png" : "jpg";
        oebps.file(`cover.${ext}`, buf);
        coverItem = `<item id="cover-image" href="cover.${ext}" media-type="${type}" properties="cover-image"/>`;
        coverMeta = `<meta name="cover" content="cover-image"/>`;
      }
    } catch {
      /* cover is optional */
    }
  }

  chapters.forEach((c, i) => {
    const html = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml"><head><title>${esc(c.title)}</title>
<style>body{font-family:Georgia,serif;line-height:1.6;margin:5%}h1{font-size:1.4em}p{text-indent:1.2em;margin:0 0 .8em}</style>
</head><body><h1>${esc(c.title)}</h1>${paras(c.content)
      .map((p) => `<p>${esc(p)}</p>`)
      .join("")}</body></html>`;
    oebps.file(`ch${String(i + 1).padStart(4, "0")}.xhtml`, html);
  });

  const items = chapters
    .map(
      (_, i) =>
        `<item id="ch${i + 1}" href="ch${String(i + 1).padStart(4, "0")}.xhtml" media-type="application/xhtml+xml"/>`,
    )
    .join("");
  const spine = chapters.map((_, i) => `<itemref idref="ch${i + 1}"/>`).join("");
  const nav = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>Contents</title></head>
<body><nav epub:type="toc"><h1>Contents</h1><ol>${chapters
    .map(
      (c, i) =>
        `<li><a href="ch${String(i + 1).padStart(4, "0")}.xhtml">${esc(c.title)}</a></li>`,
    )
    .join("")}</ol></nav></body></html>`;
  oebps.file("nav.xhtml", nav);

  oebps.file(
    "content.opf",
    `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid">
 <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
  <dc:identifier id="bookid">urn:uuid:${crypto.randomUUID()}</dc:identifier>
  <dc:title>${esc(book.title)}</dc:title>
  <dc:creator>${esc(book.author)}</dc:creator>
  <dc:language>en</dc:language>
  <meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d+Z$/, "Z")}</meta>
  ${coverMeta}
 </metadata>
 <manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>${coverItem}${items}</manifest>
 <spine>${spine}</spine>
</package>`,
  );

  const blob = await zip.generateAsync({ type: "blob", mimeType: "application/epub+zip" });
  download(blob, `${book.slug}.epub`);
}

/** PDF via the browser's print-to-PDF, with a clean printable document. */
export function exportPdf(book: ExportBook, chapters: ExportChapter[]) {
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(book.title)}</title>
<style>
@page{margin:18mm}
body{font-family:Georgia,serif;line-height:1.65;color:#111}
h1.book{font-size:32px;text-align:center;margin:30vh 0 0}
p.by{text-align:center;font-style:italic;margin-top:8px}
h2{page-break-before:always;font-size:20px;margin:0 0 16px}
p{margin:0 0 10px;text-indent:1.2em}
</style></head><body>
<h1 class="book">${esc(book.title)}</h1><p class="by">${esc(book.author)}</p>
${chapters
    .map(
      (c) =>
        `<h2>${esc(c.title)}</h2>${paras(c.content)
          .map((p) => `<p>${esc(p)}</p>`)
          .join("")}`,
    )
    .join("")}
</body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 400);
}
