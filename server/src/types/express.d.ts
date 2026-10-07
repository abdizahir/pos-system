declare namespace Express {
  interface User {
    id: number;
    [key: string]: any;
  }

  interface Request {
    user?: User;
  }
}