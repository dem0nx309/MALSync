import { MetaOverviewAbstract } from '../metaOverviewAbstract';
import { UrlNotSupportedError } from '../Errors';
import * as helper from './helper';
import { IntlDateTime } from '../../utils/IntlWrapper';
import * as utils from '../../utils/general';

export class MetaOverview extends MetaOverviewAbstract {
  constructor(url) {
    super(url);
    this.logger = this.logger.m('Hyakanime');

    // URL pattern: https://www.hyakanime.fr/anime/{id}
    const match = url.match(/hyakanime\.fr\/anime\/(\d+)/i);
    if (match) {
      this.type = 'anime';
      this.id = Number(match[1]);
      return this;
    }

    throw new UrlNotSupportedError(url);
  }

  protected readonly type: 'anime' | 'manga';
  private readonly id: number;

  async _init() {
    this.logger.log('Retrieve', this.type, this.id);

    try {
      // Trying to fetch detailed info from API
      // Assumption: GET https://api-v5.hyakanime.fr/anime/{id} exists
      const data = await this.apiCall('GET', `https://api-v5.hyakanime.fr/anime/${this.id}`);
      this.logger.log('Data', data);

      if (data) {
        this.populate(data);
      }
    } catch (e) {
      con.error('Hyakanime MetaOverview Error', e);
      // Fallback or just empty
    }
  }

  private populate(data: any) {
    if (data.title) this.meta.title = data.title;
    if (data.synopsis) this.meta.description = data.synopsis;

    // Images
    this.meta.image = data.image || '';
    this.meta.imageLarge = data.image || ''; // Use same for large if no specific large
    if (data.bannerURL) this.meta.imageBanner = data.bannerURL;

    // Alternative Titles
    const alts = new Set<string>();
    if (data.titleEN) alts.add(data.titleEN);
    if (data.titleJP) alts.add(data.titleJP);
    if (data.romanji) alts.add(data.romanji);
    if (Array.isArray(data.alt)) {
      data.alt.forEach((a: string) => alts.add(a));
    }
    this.meta.alternativeTitle = Array.from(alts);

    // Statistics
    if (data.score_distribution && data.score_distribution.accumulator && data.score_distribution.total) {
      const avg = (data.score_distribution.accumulator / data.score_distribution.total).toFixed(2);
      this.meta.statistics.push({
        title: api.storage.lang('overview_sidebar_Score'),
        body: avg,
      });
    }

    // Info Section
    if (data.type) {
      this.meta.info.push({
        title: api.storage.lang('overview_sidebar_Format'),
        body: [{ text: data.type }],
      });
    }

    if (data.NbEpisodes) {
      this.meta.info.push({
        title: api.storage.lang('overview_sidebar_Episodes'),
        body: [{ text: String(data.NbEpisodes) }],
      });
    }

    if (data.EpAverage) {
       this.meta.info.push({
        title: api.storage.lang('overview_sidebar_Duration'),
        body: [{ text: `${data.EpAverage} mins` }],
       });
    }

    if (data.status !== undefined) {
      let statusText = 'Unknown';
      if (data.status === 1) statusText = 'En cours'; 
      else if (data.status === 2) statusText = 'À venir';
      else if (data.status === 3) statusText = 'Terminé'; 
      else if (data.status === 4) statusText = 'Abandonné';
      else statusText = String(data.status); // Fallback to raw value
      
      this.meta.info.push({
        title: api.storage.lang('overview_sidebar_Status'),
        body: [{ text: statusText }],
      });
    }

    if (data.start && data.start.year) {
      const dateStr = new IntlDateTime(new Date(data.start.year, data.start.month - 1, data.start.day)).getDateTimeText();
      this.meta.info.push({
        title: api.storage.lang('overview_sidebar_Start_Date'),
        body: [{ text: dateStr }],
      });
    }

    if (data.season) {
       this.meta.info.push({
        title: api.storage.lang('overview_sidebar_Season'),
        body: [{ text: data.season }],
       });
    }

    if (data.studios) {
      this.meta.info.push({
        title: api.storage.lang('overview_sidebar_Studios'),
        body: [{ text: data.studios, url: '' }],
      });
    }

    if (data.source) {
      this.meta.info.push({
        title: api.storage.lang('overview_sidebar_Source'),
        body: [{ text: data.source }],
      });
    }

    if (data.genre && Array.isArray(data.genre)) {
      const genres = data.genre.map((g: string) => ({
        text: g,
        url: `https://www.hyakanime.fr/explore?genre=${encodeURIComponent(g)}`
      }));
      this.meta.info.push({
        title: api.storage.lang('overview_sidebar_Genres'),
        body: genres,
      });
    }

    // External Links (Links + Streaming)
    const externalLinks: any[] = [];
    
    if (data.links && Array.isArray(data.links)) {
        data.links.forEach((l: any) => {
            externalLinks.push({
                text: l.source.charAt(0).toUpperCase() + l.source.slice(1),
                url: l.url
            });
        });
    }

    if (data.streaming && Array.isArray(data.streaming)) {
         data.streaming.forEach((s: any) => {
            externalLinks.push({
                text: s.source.charAt(0).toUpperCase() + s.source.slice(1),
                url: s.url
            });
        });
    }
    
    if (data.idMAL) {
        externalLinks.push({ text: 'MyAnimeList', url: `https://myanimelist.net/anime/${data.idMAL}` });
    }
    if (data.idAnilist) {
        externalLinks.push({ text: 'AniList', url: `https://anilist.co/anime/${data.idAnilist}` });
    }


    if (externalLinks.length) {
      this.meta.info.push({
        title: api.storage.lang('overview_sidebar_external_links'),
        body: externalLinks,
      });
    }
  }

  protected apiCall = helper.apiCall;
}
