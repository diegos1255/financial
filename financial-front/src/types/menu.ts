export type Menu = {
  id: string;
  label: string;
  route: string | null;
  icon: string | null;
  sortOrder: number;
  children: Menu[];
};
