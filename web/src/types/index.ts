export type UserRole = "ADMIN" | "STAFF";

export interface SessionPayload {
  userId: string;
  role: UserRole;
}

export interface TourFileData {
  url: string;
  publicId: string;
  mimeType: string;
  sortOrder: number;
}

export interface TourWithRelations {
  id: string;
  name: string;
  slug: string;
  thumbnail: string | null;
  price: number;
  published: boolean;
  subRegion: {
    id: string;
    name: string;
    slug: string;
    region: {
      id: string;
      name: string;
      slug: string;
    };
  };
  tags: { id: string; name: string }[];
  files: TourFileData[];
}

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
}
