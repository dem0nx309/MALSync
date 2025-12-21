import list from '../pages/list.json';

export type SyncTypes = 'MAL' | 'ANILIST' | 'KITSU' | 'SIMKL' | 'SHIKI' | 'MALAPI' | 'HYAKANIME';

export function getSyncMode(type = '') {
  const mode = api.settings.get('syncMode');
  con.log('getSyncMode input:', type, 'Global Mode:', mode);
  //
  if (mode === 'SIMKL' && (type === 'manga' || type.indexOf('/manga/') !== -1)) {
    return api.settings.get('syncModeSimkl');
  }

  if (type.indexOf('hyakanime.fr') !== -1) {
    return 'HYAKANIME';
  }
  //
  if (mode === 'HYAKANIME') {
    if (type === 'manga' || type.includes('/manga/')) return 'ANILIST';
    // Check against known sites
    try {
      const pageList = (list as any).default || list;
      if (Array.isArray(pageList)) {
        for (const page of pageList) {
          let domain = page.domain.replace(/^https?:\/\//, '').replace(/^www\./, '');
          if (type.includes(domain)) {
            if (page.type === 'manga') return 'ANILIST';
            break;
          }
        }
      }
    } catch (e) {
      con.error('Error in Hyakanime manga detection', e);
    }
  }

  return mode;
}
