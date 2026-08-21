export interface AccountUser {
  id: string;
  email?: string;
  name?: string;
  picture?: string;
}

export interface SavedStrip {
  id: string;
  templateId: string | null;
  layout: string | null;
  width: number | null;
  height: number | null;
  bytes: number;
  createdAt: number;
  /** Path on the API, not a directly loadable URL: reading it needs the session. */
  imageUrl: string;
}

export interface SaveStripInput {
  image: string;
  templateId?: string;
  layout?: string;
  width?: number;
  height?: number;
}
