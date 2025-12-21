import { NotAutenticatedError } from '../Errors';
import * as definitions from '../definitions';

export const DO_NOT_UPLOAD_TOKEN = 'YOUR_BEARER_TOKEN_HERE';

export function getStatus(status: number): definitions.status {
  switch (status) {
    case 1:
      return definitions.status.Watching;
    case 2:
      return definitions.status.PlanToWatch;
    case 3:
      return definitions.status.Completed;
    case 6:
      return definitions.status.Rewatching;
    default:
      return definitions.status.PlanToWatch;
  }
}

export function getStatusInt(status: definitions.status): number {
  switch (status) {
    case definitions.status.Watching:
      return 1;
    case definitions.status.PlanToWatch:
      return 2;
    case definitions.status.Completed:
      return 3;
    case definitions.status.Rewatching:
      return 6;
    default:
      return 1;
  }
}

export function apiCall(method: string, url: string, body: any = null) {
  const token = api.settings.get('hyakanimeToken');
  const headers = {
    'Content-Type': 'application/json',
    Authorization: token,
  };

  const options: RequestInit = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  return fetch(url, options).then(async response => {
    if (!response.ok) {
        const text = await response.text();
        con.error('API Error', url, response.status, text);
        if (response.status === 401) {
            throw new NotAutenticatedError(response.statusText);
        }
        throw new Error(response.statusText + ' ' + text);
    }
    return response.json();
  });
}
