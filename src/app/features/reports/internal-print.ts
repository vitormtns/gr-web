/** Imprime somente o quadro integral carregado. O navegador oferece salvar em PDF. */
export function printInternalStatement(
  content: HTMLElement,
  title: string,
  farm: string,
  semantics: string,
): void {
  const frame = document.createElement('iframe');
  frame.title = 'Impressão de relatório gerencial interno';
  frame.style.cssText = 'position:fixed;width:0;height:0;border:0;';
  document.body.append(frame);
  const doc = frame.contentDocument;
  if (!doc || !frame.contentWindow) {
    frame.remove();
    return;
  }
  doc.documentElement.lang = 'pt-BR';
  doc.title = title;
  const heading = doc.createElement('h1');
  heading.textContent = title;
  const context = doc.createElement('p');
  context.textContent = farm;
  const notice = doc.createElement('p');
  notice.textContent = semantics;
  const clone = content.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('nav').forEach((element) => element.remove());
  clone
    .querySelectorAll('button')
    .forEach((element) =>
      element.replaceWith(
        doc.createTextNode(element.textContent?.replace(' · Ver animais', '') ?? ''),
      ),
    );
  const style = doc.createElement('style');
  style.textContent =
    '@page{size:A4 landscape;margin:15mm}body{font:12px Arial,sans-serif;color:#111}h1{font-size:22px}table{width:100%;border-collapse:collapse;margin:16px 0}th,td{border:1px solid #bbb;padding:7px;text-align:left}thead{display:table-header-group}tr{break-inside:avoid}.metric-strip{display:flex;gap:24px}.metric-strip div{display:grid;gap:5px}a{color:inherit;text-decoration:none}';
  doc.head.append(style);
  doc.body.append(heading, context, notice, clone);
  const cleanup = () => frame.remove();
  frame.contentWindow.addEventListener('afterprint', cleanup, { once: true });
  frame.contentWindow.focus();
  frame.contentWindow.print();
  setTimeout(cleanup, 60_000);
}
