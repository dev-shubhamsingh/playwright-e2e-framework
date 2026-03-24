export type SignupUser = {
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

export function createSignupUser(): SignupUser {
  const uniqueId = `${Date.now()}-${Math.floor(Math.random() * 100_000)}`;

  return {
    name: "Playwright Tester",
    email: `qa-${uniqueId}@example.com`,
    password: "Password123",
    phone: "+91 98765 43210",
    dob: "2000-01-15",
    city: "mumbai",
    interest: "discover_events",
    notifications: ["email"],
    genres: ["techno", "house"],
    bio: "Seed user for Playwright E2E flows."
  };
}
