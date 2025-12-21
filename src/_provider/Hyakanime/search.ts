import { searchInterface } from '../definitions';
import * as helper from './helper';

export const search: searchInterface = async function (
  keyword,
  type,
) {
  if (type === 'manga') return []; // Hyakanime seems to be anime focused based on endpoints

  return helper
    .apiCall('GET', `https://api-v5.hyakanime.fr/search/anime/${encodeURIComponent(keyword)}`)
    .then(res => {
      const resItems: any = [];
      res.forEach(function (item) {
        resItems.push({
          id: item.id,
          name: item.title,
          altNames: item.alt || [],
          url: `https://www.hyakanime.fr/anime/${item.id}`,
          malUrl: async () => null,
          image: item.image || '',
          imageLarge: item.image || '',
          media_type: item.type,
          score: item.EpAverage, // Not exactly score, but provided in example
          year: item.start ? item.start.year : null,
          totalEp: item.NbEpisodes || 0,
        });
      });
      return resItems;
    });
};
