export type User = {
  id: string;
  name: string;
  login: string;
  photoUrl: string | null;
  active: boolean;
};

export type LoginRequest = {
  login: string;
  password: string;
};

export type LoginResponse = {
  user: User;
};

export type SignupRequest = {
  name: string;
  login: string;
  password: string;
};

export type ApiError = {
  timestamp: string;
  status: number;
  code: string;
  message: string;
  fieldErrors: Array<{ field: string; message: string }>;
};
