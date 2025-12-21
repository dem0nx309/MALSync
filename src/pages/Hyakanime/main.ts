import { pageInterface } from '../pageInterface';

console.log('MALSync [Hyakanime]: Script LOADER executed.');

export const Hyakanime: pageInterface = {
  name: 'Hyakanime',
  domain: 'https://www.hyakanime.fr',
  languages: ['French'],
  type: 'anime',
  isSyncPage(url) {
    return false;
  },
  sync: {
    getTitle(url) { return ''; },
    getIdentifier(url) { return ''; },
    getOverviewUrl(url) { return ''; },
    getEpisode(url) { return 0; },
    nextEpUrl(url) { return ''; },
  },
  init(page) {
    console.log('MALSync [Hyakanime]: Init called.');
  },
};
