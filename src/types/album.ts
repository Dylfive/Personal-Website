export interface AlbumEntry {
  Album: string | number;
  Artist: string;
  Rating: number;
  Genre: string;
  "Release Year": number;
  Length: string;
  CoverArt?: string;
  AppleMusicLink?: string;
  TrackCount?: number;
  ExactReleaseDate?: string;
}
