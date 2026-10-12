import type { Plugin } from 'vite';

/** Inline the single entry's JS and CSS; reject accidental external build assets. */
export function singleFile(): Plugin {
 return {
  name: 'friskoli-single-file',
  apply: 'build',
  enforce: 'post',
  generateBundle(_options, bundle) {
   const entry = bundle['index.html'];
   if (!entry || entry.type !== 'asset') throw new Error('Missing HTML entry');
   let html = String(entry.source);
   const used = new Set<string>();
   html = html.replace(/<script\b[^>]*\bsrc="([^"]+)"[^>]*><\/script>/g, (_tag, url: string) => {
    const name = url.replace(/^\.?\//, '');
    const script = bundle[name];
    if (!script || script.type !== 'chunk') throw new Error(`Unbundled script: ${url}`);
    used.add(name);
    return `<script type="module">${script.code.replace(/<\/script/gi, '<\\/script')}</script>`;
   });
   html = html.replace(/<link\b[^>]*\brel="stylesheet"[^>]*>/g, tag => {
    const url = tag.match(/href="([^"]+)"/)?.[1];
    const name = url?.replace(/^\.?\//, '');
    const style = name ? bundle[name] : undefined;
    if (!name || !style || style.type !== 'asset') throw new Error(`Unbundled stylesheet: ${url}`);
    used.add(name);
    return `<style>${String(style.source).replace(/<\/style/gi, '<\\/style')}</style>`;
   });
   entry.source = html;
   for (const name of used) delete bundle[name];
   const remaining = Object.keys(bundle).filter(name => name !== 'index.html');
   if (remaining.length) throw new Error(`Standalone build contains external assets: ${remaining.join(', ')}`);
  }
 };
}
