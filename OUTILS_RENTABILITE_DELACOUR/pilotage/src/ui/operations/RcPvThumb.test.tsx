// F-8 (L7-GLOBAL part): the thumbnails of the PV (160 px on the screen, 38 mm on paper) read the small copy of 480 px; the photo that proves a reservation or a refusal, 80 mm wide, keeps the one of 1 600 px.
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { demoState } from '../../domain/templates';
import { allReservesOf } from '../../domain/receptions';
import { PvView } from './RcPv';

const seen = vi.hoisted(() => ({ pics: [] as { value: string; size?: string }[] }));
vi.mock('../../photo/Pic', async orig => ({ ...(await orig<typeof import('../../photo/Pic')>()), Pic: (p: { value: string; size?: string }) => { seen.pics.push({ value: p.value, size: p.size }); return null; } }));

describe('the photos of the PV ask the size they are shown at', () => {
  it('480 px for the thumbnails (state at delivery, check, paper PV, repair, lift), 1 600 px for the finding of a reservation and of a refusal', () => {
    const s = demoState(new Date(2026, 8, 25, 10, 0)), d = s.deliveries.dl_demo_3, r = allReservesOf(d)[0];
    const withPhotos = {
      ...d, pvPhoto: 'photo:paper',
      milestones: d.milestones.map((m, i) => (i === 0 ? { ...m, photo: 'photo:check' } : m)),
      reception: { ...d.reception, photos: ['photo:state'], reserves: d.reception.reserves!.map(x => (x.id === r.id ? { ...x, photo: 'photo:finding', repairPhoto: 'photo:repair' } : x)) },
    };
    seen.pics.length = 0;
    renderToStaticMarkup(<PvView d={withPhotos} state={{ ...s, deliveries: { ...s.deliveries, [d.id]: withPhotos } }} />);
    const size = (v: string) => seen.pics.find(p => p.value === v)?.size;
    expect([size('photo:state'), size('photo:check'), size('photo:paper'), size('photo:repair')]).toEqual(['t', 't', 't', 't']);
    expect(size('photo:finding')).toBe('v');
  });
  it('the refusal photo is the proof of the PV: 1 600 px', () => {
    const s = demoState(new Date(2026, 8, 25, 10, 0)), d = s.deliveries.dl_demo_12;
    const refused = { ...d, reception: { ...d.reception, refusal: { ...d.reception.refusal!, photo: 'photo:refusal' } } };
    seen.pics.length = 0;
    renderToStaticMarkup(<PvView d={refused} state={{ ...s, deliveries: { ...s.deliveries, [d.id]: refused } }} />);
    expect(seen.pics.find(p => p.value === 'photo:refusal')?.size).toBe('v');
  });
});
