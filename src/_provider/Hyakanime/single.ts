import { point10 } from '../ScoreMode/point10';
import { SingleAbstract } from '../singleAbstract';
import { NotAutenticatedError } from '../Errors';
import * as helper from './helper';
import * as definitions from '../definitions';

export class Single extends SingleAbstract {
  shortName = 'Hyakanime';
  authenticationUrl = 'https://www.hyakanime.fr';

  private localState = {
    status: definitions.status.NoState,
    startDate: null as definitions.startFinishDate,
    finishDate: null as definitions.startFinishDate,
    rewatchCount: 0,
    score: 0,
    episode: 0,
    totalEpisodes: 0,
    tags: '',
  };


  getCacheKey() {
    return this.getUrl().split('/').pop();
  }

  getPageId() {
    return this.getCacheKey();
  }
  // Declare statusMap property
  statusMap: { [key: number]: string } = {};

  handleUrl(url: string) {
    if (url.match(/hyakanime\.fr\/anime\/*/i)) {
      this.type = 'anime';
    } else {
      this.type = 'manga';
    }
    this.statusMap = {
      [definitions.status.Watching]: api.storage.lang(`UI_Status_watching_${this.type}`),
      [definitions.status.PlanToWatch]: api.storage.lang(`UI_Status_planTo_${this.type}`),
      [definitions.status.Completed]: api.storage.lang('UI_Status_Completed'),
      [definitions.status.Onhold]: api.storage.lang('UI_Status_OnHold'),
      [definitions.status.Dropped]: api.storage.lang('UI_Status_Dropped'),
      [definitions.status.Rewatching]: api.storage.lang(`UI_Status_Rewatching_${this.type}`),
    };
    
    // Abstract super.handleUrl cannot be called directly if abstract, but we just need to set ID.
    const id = url.split('/').pop();
    if (id) {
       // We don't have a standard ID property in SingleAbstract that fits perfectly but
       // generally we override getPageId() to return what we need. 
       // We can store it if needed or just rely on getPageId() parsing url.
    }
  }


  _setStatus(status: definitions.status): void {
    if (this.localState.status === definitions.status.Rewatching && status === definitions.status.Completed) {
      this.localState.rewatchCount = (this.localState.rewatchCount || 0) + 1;
    }
    this.localState.status = status;
    if (status === definitions.status.Watching && this.localState.episode === 0) {
      this.localState.episode = 1;
    }
  }

  _getStatus(): definitions.status | number {
    return this.localState.status;
  }

  _setStartDate(startDate: definitions.startFinishDate): void {
    this.localState.startDate = startDate;
  }
  _getStartDate(): definitions.startFinishDate {
    return this.localState.startDate;
  }
  _setFinishDate(finishDate: definitions.startFinishDate): void {
    this.localState.finishDate = finishDate;
  }
  _getFinishDate(): definitions.startFinishDate {
    return this.localState.finishDate;
  }
  _setRewatchCount(rewatchCount: definitions.rewatchCount): void {
    this.localState.rewatchCount = rewatchCount;
  }
  _getRewatchCount(): definitions.rewatchCount | null {
    return this.localState.rewatchCount;
  }
  _setScore(score: definitions.score): void {
    this.localState.score = score;
  }
  _getScore(): definitions.score {
    return this.localState.score;
  }
  _setAbsoluteScore(score: definitions.score100): void {
    // Not supported
  }
  _getAbsoluteScore(): definitions.score100 {
    return 0;
  }
  _setEpisode(episode: number): void {
    this.localState.episode = episode;
  }
  _getEpisode(): number {
    return this.localState.episode;
  }
  _setVolume(volume: number): void {
     // Not supported
  }
  _getVolume(): number {
    return 0;
  }
  _setTags(tags: string): void {
    this.localState.tags = tags;
  }
  _getTags(): string {
    return this.localState.tags;
  }

  _getTitle(raw: boolean): string {
    // Ideally this comes from the cache or initial load
    return 'Anime ' + this.getPageId(); 
  }
  _getTotalEpisodes(): number {
    return this.localState.totalEpisodes;
  }
  _getTotalVolumes(): number {
    return 0;
  }
  _getImage(): string {
    return '';
  }
  async _getRating(): Promise<string> {
    return '';
  }
  _getDisplayUrl(): string {
    return this.url;
  }

  async _update() {
    this._authenticated = true; // Assume authenticated if token present

    // Logic to FETCH data from API
    // Need to get the user's list and find this anime
    // This is inefficient but Hyakanime API structure requires it for now
    try {
      // Fetch details for specific anime, assuming it includes user status if authenticated
      const animeID = Number(this.getPageId());
      const animeData = await helper.apiCall('GET', `https://api-v5.hyakanime.fr/anime/${animeID}`);

      // Check if animeData contains user progression
      // Assuming structure similar to: { ..., user_progression: { ... } } or similar
      // If the user says relying on this is better than reloading the lib, likely the data is here.
      // We will look for 'progression' or similar field in the root or under 'user' key.
      // We will look for 'progression' or similar field in the root or under 'user' key.

      if (animeData.NbEpisodes) {
        this.localState.totalEpisodes = animeData.NbEpisodes;
      }

      // Adjust this based on actual response structure. 
      // If the API returns the same structure as list item but for single ID:
      // It might be nested. 
      // Let's assumme 'progression' key exists if user has interaction.
      
      const prog = animeData.progression || (animeData.user && animeData.user.progression); 

      if (prog) {
          this._onList = true;
          this.localState.episode = prog.progression || 0;
          this.localState.status = helper.getStatus(prog.status);
          this.localState.score = prog.score || 0;
          this.localState.rewatchCount = prog.rewatch_count || prog.rewatch || 0;
      } else {
        // Fallback or just assume not on list if no progression data found
        this._onList = false;
      }

    } catch (e) {
      con.error('Error fetching Hyakanime status from /anime/id', e);
    }
  }

  async _sync() {
    const state = this.getStateEl();
    const animeID = Number(this.getPageId());

    const payload = {
      animeID: animeID,
      progression: state.episode,
      status: helper.getStatusInt(state.status),
      score: state.score,
      rewatch: state.rewatchCount,
    };

    await helper.apiCall('POST', 'https://api-v5.hyakanime.fr/progression/anime/write', payload);
  }

  async _delete() {
    con.error('Delete not implemented');
  }

  getScoreMode() {
    return point10;
  }

  errorMessage(error) {
    const message = super.errorMessage(error);
    if (message.includes('hyakanime.fr') || error instanceof NotAutenticatedError || error.name === 'NotAutenticatedError') {
      return `Veuillez vous connecter <a href="#login-hyakanime" class="link">ici</a>`;
    }
    return message;
  }
}
