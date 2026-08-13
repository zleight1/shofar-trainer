import type { ClassifiedBlast } from '../halacha/types';
import { downloadWav } from '../audio/wav';
import type { Locale } from '../i18n/locale';
import { blastLabel, catalog } from '../i18n/t';
import { clearRoomProfile, getRoomProfile } from '../store/diagnostics';
import { button, el } from './components';

export interface BlastAudioClip {
  type: ClassifiedBlast['type'];
  samples: Float32Array;
  sampleRate: number;
}

export function renderDiagnosticsPanel(
  parent: HTMLElement,
  blasts: ClassifiedBlast[],
  clips: BlastAudioClip[],
  locale: Locale,
  onRoomCleared?: () => void,
): HTMLElement {
  const c = catalog(locale);
  const wrap = el('section', 'diagnostics-panel');
  wrap.appendChild(el('h3', '', c.diagnosticsTitle));

  const profile = getRoomProfile();
  const teruah = blasts.find((b) => b.type === 'teruah' && b.diagnosis);
  const diag = teruah?.diagnosis;
  const dropped = blasts.reduce((n, b) => n + (b.diagnosis?.droppedEchoCount ?? 0), 0);
  const lagMs = Math.round((diag?.echoLagSec ?? profile?.echoLagSec ?? 0) * 1000);

  if (lagMs > 0 && dropped > 0) {
    wrap.appendChild(el('p', '', c.diagnosticsRoomEcho({ ms: lagMs, dropped })));
  } else if (profile) {
    wrap.appendChild(el('p', '', c.diagnosticsRoomSaved({ ms: Math.round(profile.echoLagSec * 1000) })));
  } else {
    wrap.appendChild(el('p', 'diagnostics-muted', c.diagnosticsNoEcho));
  }

  for (const blast of blasts) {
    const d = blast.diagnosis;
    if (!d) continue;
    const label = blastLabel(blast.type, locale);
    wrap.appendChild(
      el('p', 'diagnostics-peaks', c.diagnosticsPeaks({ label, raw: d.rawPeakCount, kept: d.keptCount })),
    );
    if (d.onsetSec.length > 0) {
      const times = d.onsetSec.map((t) => t.toFixed(2)).join(', ');
      wrap.appendChild(el('p', 'diagnostics-onsets', c.diagnosticsOnsets({ times })));
    }
  }

  const actions = el('div', 'diagnostics-actions');
  clips.forEach((clip, i) => {
    if (clip.samples.length === 0) return;
    const label = blastLabel(clip.type, locale);
    const btn = button(c.diagnosticsDownload({ label }), 'btn secondary');
    btn.addEventListener('click', () => {
      downloadWav(`shofar-${clip.type}-${i + 1}.wav`, clip.samples, clip.sampleRate);
    });
    actions.appendChild(btn);
  });
  if (profile) {
    const clearBtn = button(c.diagnosticsClearRoom, 'btn secondary');
    clearBtn.addEventListener('click', () => {
      clearRoomProfile();
      onRoomCleared?.();
    });
    actions.appendChild(clearBtn);
  }
  wrap.appendChild(actions);
  parent.appendChild(wrap);
  return wrap;
}
