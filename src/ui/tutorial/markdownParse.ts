/** Divide o Markdown do tutorial em blocos (títulos, parágrafos, listas, citações). */
export type Block =
  | { kind: 'h'; level: 1 | 2 | 3; text: string }
  | { kind: 'p'; text: string }
  | { kind: 'ul'; items: string[] }
  | { kind: 'quote'; text: string };

export function parseBlocks(source: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let list: string[] | null = null;
  const flush = () => {
    if (paragraph.length > 0) blocks.push({ kind: 'p', text: paragraph.join(' ') });
    paragraph = [];
    if (list) blocks.push({ kind: 'ul', items: list });
    list = null;
  };
  for (const raw of source.split(/\r?\n/)) {
    const line = raw.trim();
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (line === '') {
      flush();
    } else if (heading) {
      flush();
      blocks.push({
        kind: 'h',
        level: (heading[1]?.length ?? 1) as 1 | 2 | 3,
        text: heading[2] ?? '',
      });
    } else if (line.startsWith('- ')) {
      if (paragraph.length > 0) {
        blocks.push({ kind: 'p', text: paragraph.join(' ') });
        paragraph = [];
      }
      list ??= [];
      list.push(line.slice(2));
    } else if (line.startsWith('> ')) {
      flush();
      blocks.push({ kind: 'quote', text: line.slice(2) });
    } else if (list) {
      list[list.length - 1] += ` ${line}`;
    } else {
      paragraph.push(line);
    }
  }
  flush();
  return blocks;
}
