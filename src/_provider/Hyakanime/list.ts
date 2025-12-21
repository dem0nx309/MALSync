import { NotAutenticatedError } from '../Errors';
import { ListAbstract, listElement } from '../listAbstract';
import * as helper from './helper';
import * as definitions from '../definitions';

export class UserList extends ListAbstract {
  name = 'Hyakanime';
  metadataUrl = 'https://api-v5.hyakanime.fr';
  authenticationUrl = '#/login/hyakanime';

  _getSortingOptions() {
    return [
      {
        icon: 'sort_by_alpha',
        title: api.storage.lang('list_sorting_alpha'),
        value: 'alpha',
        asc: true,
      },
      {
        icon: 'history',
        title: api.storage.lang('list_sorting_history'),
        value: 'updated',
        asc: true,
      },
      {
        icon: 'score',
        title: api.storage.lang('list_sorting_score'),
        value: 'score',
        asc: true,
      },
    ];
  }

  getSortingOptions(simple = false) {
    const res = [
      {
        icon: 'filter_list',
        title: api.storage.lang('settings_progress_default'),
        value: 'default',
      },
    ];

    const options = this._getSortingOptions();
    options.forEach(el => {
      if (!simple) {
        if (el.asc) {
          const asc = { ...el };
          delete (asc as any).asc;
          asc.value += '_asc';
          // asc.title += ' Ascending'; // If you want explicit label
          res.push(asc);
        }
        delete (el as any).asc;
      }
      res.push(el);
    });
    return res;
  }

  statusMap = {
    [definitions.status.Watching]: api.storage.lang('UI_Status_watching_anime'),
    [definitions.status.PlanToWatch]: api.storage.lang('UI_Status_planTo_anime'),
    [definitions.status.Completed]: api.storage.lang('UI_Status_Completed'),
    [definitions.status.Onhold]: api.storage.lang('UI_Status_OnHold'),
    [definitions.status.Dropped]: api.storage.lang('UI_Status_Dropped'),
    [definitions.status.Rewatching]: api.storage.lang('UI_Status_Rewatching_anime'),
  };

  private static lastClear = 0;

  constructor(
    protected status: number = 1,
    protected listType: 'anime' | 'manga' = 'anime',
    protected sort: string = 'default',
    forceTimestamp: number = 0
  ) {
    super(status, listType, sort);
    if (forceTimestamp && forceTimestamp > UserList.lastClear) {
        UserList.cache = {};
        UserList.lastClear = forceTimestamp;
    }
  }

  async getUserObject() {
    const user = await this.userRequest();
    return {
      username: user.username,
      picture: user.photoURL || '',
      href: `https://www.hyakanime.fr/profile/${user.username}`,
    };
  }

  async getUserId() {
    if (this.userId) return this.userId;
    const user = await this.userRequest();
    this.userId = user.uid;
    return this.userId;
  }

  private userId: string | null = null;

  private userRequest() {
    const token = api.settings.get('hyakanimeToken');
    if (!token) throw new NotAutenticatedError('Hyakanime Token missing');

    let username = 'Julien'; // Fallback / Dev
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        const payload = JSON.parse(jsonPayload);
        if (payload.username) username = payload.username;
        else if (payload.uid) username = payload.uid; // Username might be same as UID or different
    } catch (e) {
        con.error('Failed to decode Hyakanime token', e);
        // If decode fails, we might try to fetch /user/me if it exists? 
        // Or throw. For now, let's throw if we can't determine user.
        // Actually, let's try to proceed if we have a fallback or valid token, 
        // but since the endpoint REQUIRES username, we must have it.
        // If decoding fails, likely invalid token.
        throw new Error('Invalid Token');
    }

    return helper.apiCall('GET', `https://api-v5.hyakanime.fr/user/${username}`);
  }

  private fullList: any[] = [];
  private fullListFetched = false;

  private static cache: { [uid: string]: { timestamp: number, data: any[] } } = {};

  async getPart() {
    if (!this.fullListFetched) {
        if (this.listType === 'manga') {
            this.fullList = [];
            this.fullListFetched = true;
            this.done = true;
            return [];
        }

        const uid = await this.getUserId();
        if (!uid) {
             throw new Error("User ID not found");
        }
        let data: any[] = [];

        // Check cache (valid for 5 minutes)
        if (UserList.cache[uid] && (Date.now() - UserList.cache[uid].timestamp < 5 * 60 * 1000)) {
            data = UserList.cache[uid].data;
        } else {
            const apiData = await helper.apiCall('GET', `https://api-v5.hyakanime.fr/progression/anime/${uid}`);
            if (Array.isArray(apiData)) {
                data = apiData;
                UserList.cache[uid] = { timestamp: Date.now(), data: data };
            }
        }

        if (Array.isArray(data)) {
            // Tag with original index for stable sorting fallback / inversion
            data.forEach((item, index) => { item._originalIndex = index; });

            // Filter by status AND ensure media exists
            if (this.status !== 7) { 
                this.fullList = data.filter(item => item.media && helper.getStatus(item.progression.status) === this.status);
            } else {
                this.fullList = data.filter(item => item.media);
            }
            
            // Sorting Logic
            if (this.sort === 'alpha' || this.sort === 'alpha_asc') {
                 this.fullList.sort((a, b) => {
                    const getTitle = (m: any) => (m.title || m.titleEN || m.romanji || m.titleJP || '').toLowerCase();
                    const titleA = getTitle(a.media);
                    const titleB = getTitle(b.media);
                    return this.sort === 'alpha_asc' ? titleB.localeCompare(titleA) : titleA.localeCompare(titleB);
                });
            } else if (this.sort === 'score' || this.sort === 'score_asc') {
                this.fullList.sort((a, b) => {
                    const sA = a.progression.score || 0;
                    const sB = b.progression.score || 0;
                    return this.sort === 'score' ? sB - sA : sA - sB;
                });
            } else if (this.sort === 'updated' || this.sort === 'updated_asc') {
                 this.fullList.sort((a, b) => {
                    const getMsgTime = (p: any, m: any) => {
                        const candidates = [
                            p.updatedAt, p.updated_at, p.last_updated, p.date, p.timestamp, p.modifiedAt, p.modified_at,
                            m.updatedAt, m.updated_at, m.startDate 
                        ];
                        for (const c of candidates) {
                            if (!c) continue;
                            const t = new Date(c).getTime();
                            if (!isNaN(t) && t > 0) return t;
                        }
                        return 0;
                    };
                    const dA = getMsgTime(a.progression, a.media);
                    const dB = getMsgTime(b.progression, b.media);
                    
                    if (dA !== dB) {
                        return this.sort === 'updated' ? dB - dA : dA - dB;
                    }
                    
                    // Fallback to original index (API order)
                    // API order is typically Newest First (Updated Descending)
                    // If updated (Desc): Keep original (Ascending Index)
                    // If updated_asc (Asc): Reverse original (Descending Index)
                    return this.sort === 'updated' ? (a._originalIndex - b._originalIndex) : (b._originalIndex - a._originalIndex);
                });
            }
        }
        this.fullListFetched = true;
    }

    const chunk = this.fullList.slice(this.offset, this.offset + 50);
    this.offset += 50;

    if (this.offset >= this.fullList.length) {
      this.done = true;
    }

    return this.prepareData(chunk);
  }

  private async prepareData(data): Promise<listElement[]> {
    const newData = [] as listElement[];
    for (const item of data) {
      if (!item.media) continue; // Skip if media is missing
      
      const el = item.media;
      const prog = item.progression;

      const tempData = await this.fn({
        malId: el.idMAL || NaN, // Assuming idMAL exists based on search response
        apiCacheKey: el.id,
        uid: el.id,
        cacheKey: `hyakanime:${el.id}`,
        type: 'anime',
        title: el.title || el.titleEN || el.romanji || el.titleJP || 'Unknown Title',
        url: `https://www.hyakanime.fr/anime/${el.id}`,
        score: prog.score || 0, // Using score from progression payload example
        watchedEp: prog.progression,
        totalEp: el.NbEpisodes,
        status: helper.getStatus(prog.status),
        image: el.image || '', // Ensure image is not null
        imageLarge: el.image || '',
        tags: '', 
      });

      if (tempData.totalEp === null || tempData.totalEp === undefined) {
        tempData.totalEp = 0;
      }

      newData.push(tempData);
    }
    return newData;
  }
  async deauth() {
    await api.settings.set('hyakanimeToken', '');
  }

  async login(email, password) {
    try {
        const response = await helper.apiCall('POST', 'https://api-v5.hyakanime.fr/auth/login', {
            email: email,
            password: password
        });
        
        
        if (response && response.token) {
            await api.settings.set('hyakanimeToken', response.token);
            return true;
        }
        
        throw new Error('No token returned');
    } catch (e) {
        con.error('Hyakanime Login Failed', e);
        throw e;
    }
  }
}
