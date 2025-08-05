import axios from 'axios';
import { PlaylistStorage, Playlist } from './playlist-storage';
import { MusicAPI } from './music-api';

interface SpotifyPlaylistResponse {
  name: string;
  images: { url: string }[];
  tracks: {
    items: {
      track: {
        name: string;
        artists: { name: string }[];
      };
    }[];
  };
}

function extractPlaylistId(input: string): string {
  const match = input.match(/playlist\/(\w+)|([a-zA-Z0-9]{22})/);
  if (!match) throw new Error('Invalid playlist URL or ID');
  return match[1] || match[2];
}

export async function importSpotifyPlaylist(playlistUrl: string): Promise<void> {
  const token = process.env.EXPO_PUBLIC_SPOTIFY_TOKEN;
  if (!token) throw new Error('Spotify token not configured');

  const playlistId = extractPlaylistId(playlistUrl);
  const { data } = await axios.get<SpotifyPlaylistResponse>(`https://api.spotify.com/v1/playlists/${playlistId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const trackIds: string[] = [];
  for (const item of data.tracks.items) {
    const title = item.track.name;
    const artist = item.track.artists[0]?.name ?? '';
    try {
      const res = await MusicAPI.search({ q: `${title} ${artist}`, type: 'track' });
      if (res.tracks && res.tracks.length > 0) {
        trackIds.push(res.tracks[0].id.toString());
      }
    } catch {
      // Ignore individual track errors
    }
  }

  const playlist: Playlist = {
    name: data.name,
    cover: data.images?.[0]?.url || '',
    trackIds,
  };

  await PlaylistStorage.addPlaylist(playlist);
}
