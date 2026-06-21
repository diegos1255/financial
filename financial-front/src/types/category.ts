export type Category = {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  active: boolean;
  createdDate: string;
  updatedDate: string;
};

export type CategoryRequest = {
  name: string;
  description?: string | null;
  color?: string | null;
};
