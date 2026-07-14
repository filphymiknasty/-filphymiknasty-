export type User = {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
};

export type Chat = {
  id: string;
  name: string; // Group name or computed direct chat name
  type: 'direct' | 'group';
  members: string[];
  createdAt: number;
  lastMessage?: string;
  lastMessageAt?: number;
};

export type Message = {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  fileUrl?: string;
  fileName?: string;
  createdAt: number;
};
