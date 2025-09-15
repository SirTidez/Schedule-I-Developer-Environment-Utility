import { LoggingService } from './LoggingService';

export interface SteamBuildInfo {
  buildId: string;
  timeUpdated: number;
  description: string;
  isCurrent: boolean;
  changenumber?: number;
}

export interface SteamEventInfo {
  event_type: number;
  event_date: number;
  event_text: string;
  event_url?: string;
}

export interface SteamEventsResponse {
  success: boolean;
  events: SteamEventInfo[];
}

export class SteamWebApiService {
  private readonly STEAM_EVENTS_API_URL = 'https://store.steampowered.com/events/ajaxgetadjacentpartnerevents/';
  private readonly STEAM_WEB_API_BASE = 'https://api.steampowered.com';
  private readonly SCHEDULE_I_APP_ID = '3164500';

  constructor(private loggingService: LoggingService) {}

  

  /**
   * Gets build history from Steam's Web API (requires API key)
   * This method is for future use when we have a publisher API key
   */
  public async getBuildHistoryFromWebApi(apiKey: string): Promise<SteamBuildInfo[]> {
    try {
      this.loggingService.debug('Fetching build history from Steam Web API...');
      
      const url = `${this.STEAM_WEB_API_BASE}/ISteamApps/GetAppBuilds/v0001/?appid=${this.SCHEDULE_I_APP_ID}&key=${apiKey}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Schedule I Developer Environment Utility/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      this.loggingService.debug(`Steam Web API response: ${JSON.stringify(data, null, 2)}`);

      if (!data.response || !data.response.builds) {
        this.loggingService.warn('Steam Web API returned no builds');
        return [];
      }

      // Convert API response to build info
      const builds: SteamBuildInfo[] = [];
      
      for (const build of data.response.builds) {
        builds.push({
          buildId: build.buildid.toString(),
          timeUpdated: build.timeupdated,
          description: build.description || `Build ${build.buildid}`,
          isCurrent: false, // Would need to determine current build separately
          changenumber: build.changenumber
        });
      }

      // Sort by build ID (newest first)
      builds.sort((a, b) => parseInt(b.buildId) - parseInt(a.buildId));

      this.loggingService.debug(`Converted ${builds.length} builds from Steam Web API`);
      return builds;

    } catch (error) {
      this.loggingService.error(`Failed to fetch build history from Steam Web API: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return [];
    }
  }

  /**
   * Gets comprehensive build history by combining multiple sources
   */
  public async getComprehensiveBuildHistory(): Promise<SteamBuildInfo[]> {
    this.loggingService.debug('getComprehensiveBuildHistory called, but it is disabled.');
    return [];
  }

  /**
   * Generates a build ID from event date for events that don't have explicit build IDs
   */
  private generateBuildIdFromDate(eventDate: number): string {
    // Convert timestamp to a pseudo-build ID
    // This is a fallback when we can't extract a real build ID
    if (typeof eventDate !== 'number' || isNaN(eventDate)) {
      return `invalid-date-${Date.now()}`;
    }
    const date = new Date(eventDate * 1000);
    if (isNaN(date.getTime())) {
        return `invalid-date-${Date.now()}`;
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}${month}${day}${hour}${minute}`;
  }

  /**
   * Extracts changenumber from event text if present
   */
  private extractChangenumberFromText(text: string): number | undefined {
    const changenumberMatch = text.match(/changenumber\s*(\d+)/i);
    return changenumberMatch ? parseInt(changenumberMatch[1]) : undefined;
  }
}
