import { createContext, useContext, useState, ReactNode } from 'react';

type ChatContextType = {
  isOpen: boolean;
  openChat: () => void;
  closeChat: () => void;
};

const ChatContext = createContext<ChatContextType>({
  isOpen: false,
  openChat: () => {},
  closeChat: () => {},
});

export function ChatProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <ChatContext.Provider value={{ isOpen, openChat: () => setIsOpen(true), closeChat: () => setIsOpen(false) }}>
      {children}
    </ChatContext.Provider>
  );
}

export const useChat = () => useContext(ChatContext);
