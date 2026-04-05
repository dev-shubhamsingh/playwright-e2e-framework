export type AppUser = {
  name: string;
  email: string;
  password: string;
  phone: string;
  dob: string;
  city: string;
  interest: string;
  notifications: string[];
  genres: string[];
  bio: string;
};

export type AppEvent = {
  id: string;
  name: string;
  city: string;
  genre: string;
  date: string;
  venue: string;
  owner: string;
};

export type AppSearchFilters = {
  city: string;
  genre: string;
};

export type TestSessionOptions = {
  users?: AppUser[];
  events?: AppEvent[];
  currentUserEmail?: string | null;
  searchFilters?: Partial<AppSearchFilters> | null;
};
