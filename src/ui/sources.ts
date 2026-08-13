import { SOURCES } from '../halacha/sources';
import { catalog } from '../i18n/t';
import { getLocale } from '../i18n/locale';
import { renderAppHeader, renderDisclaimer } from './chrome';
import { button, el } from './components';

export interface SourcesMountOptions {
  onBack: () => void;
  onLocale: () => void;
}

export function mountSources(root: HTMLElement, options: SourcesMountOptions): () => void {
  const container = el('div', 'sources-view');
  root.appendChild(container);

  function render(): void {
    container.innerHTML = '';
    const locale = getLocale();
    const c = catalog(locale);
    renderAppHeader(container, {
      title: c.sourcesTitle,
      locale,
      onLocale: options.onLocale,
    });
    renderDisclaimer(container, locale);
    container.appendChild(el('p', 'instructions', c.sourcesIntro));
    container.appendChild(el('p', 'minhag-note', c.minhagNote));

    for (const entry of SOURCES) {
      const card = el('article', 'source-card');
      card.appendChild(el('h3', '', locale === 'he' ? entry.heRef : entry.enRef));
      card.appendChild(
        el('p', 'encoded-badge', entry.encoded ? c.encodedLabel : c.studyOnlyLabel),
      );

      const heBlock = el('blockquote', 'source-he');
      heBlock.lang = 'he';
      heBlock.dir = 'rtl';
      heBlock.textContent = entry.hebrew;
      card.appendChild(heBlock);

      const enBlock = el('blockquote', 'source-en');
      enBlock.lang = 'en';
      enBlock.dir = 'ltr';
      enBlock.textContent = entry.english;
      card.appendChild(enBlock);

      const links = el('p', 'source-links');
      for (const link of entry.links) {
        const a = document.createElement('a');
        a.href = link.href;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.textContent = `${c.openLink}: ${link.label}`;
        links.appendChild(a);
        links.appendChild(document.createTextNode(' '));
      }
      card.appendChild(links);
      container.appendChild(card);
    }

    const back = button(c.back, 'btn secondary');
    back.addEventListener('click', options.onBack);
    container.appendChild(back);
  }

  render();
  return () => container.remove();
}
