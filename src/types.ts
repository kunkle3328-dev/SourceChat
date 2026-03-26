export type Notebook = {
  id: string;
  name: string;
  createdAt: number;
};

export type Source = {
  id: string;
  notebookId?: string;
  name: string;
  type: string;
  data?: string; // base64 encoded data without the data:mime/type;base64, prefix
  url?: string; // for website links
  size?: number;
  createdAt: number;
  status: 'uploading' | 'ready' | 'error';
  progress: number;
  errorText?: string;
  summary?: string;
  isSummarizing?: boolean;
  isActive?: boolean;
};

export type Message = {
  id: string;
  notebookId?: string;
  role: 'user' | 'model';
  text: string;
  createdAt: number;
};
