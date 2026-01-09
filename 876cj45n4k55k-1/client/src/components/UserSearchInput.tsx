import { useState, useRef, useEffect } from "react";
import { useUserSearch } from "@/hooks/use-user-search";
import { Input } from "@/components/ui/input";
import { Search, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface UserSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onSelectUser?: (username: string) => void;
}

export function UserSearchInput({
  value,
  onChange,
  placeholder = "@opponent",
  className,
  onSelectUser,
}: UserSearchInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const { data: users = [], isLoading } = useUserSearch(inputValue.replace("@", ""));
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.trimStart();
    if (val && !val.startsWith("@")) {
      val = "@" + val;
    }
    setInputValue(val);
    onChange(val);
    setIsOpen(val.length > 0);
  };

  const handleSelectUser = (username: string) => {
    const withAt = username.startsWith("@") ? username : `@${username}`;
    setInputValue(withAt);
    onChange(withAt);
    onSelectUser?.(withAt);
    setIsOpen(false);
  };

  const handleClear = () => {
    setInputValue("");
    onChange("");
    setIsOpen(false);
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(inputValue.length > 1)}
          placeholder={placeholder}
          className={cn(
            "bg-muted border-border focus:border-secondary/50 rounded-lg text-xs h-9 px-3 pl-9",
            className
          )}
        />
        {inputValue && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {isOpen && (inputValue.length > 0) && (
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden"
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 p-3 text-xs text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" />
                Searching...
              </div>
            ) : users.length > 0 ? (
              <ul className="max-h-64 overflow-y-auto">
                {users.map((user, idx) => (
                  <li key={`${user.username}-${idx}`}>
                    <button
                      type="button"
                      onClick={() => handleSelectUser(user.username)}
                      className="w-full text-left px-3 py-2 hover:bg-muted transition-colors text-xs flex items-center gap-2 border-b border-border/50 last:border-b-0"
                    >
                      {user.pfp && (
                        <img
                          src={user.pfp}
                          alt={user.username}
                          className="w-6 h-6 rounded-full object-cover"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">@{user.username}</div>
                        {user.displayName && (
                          <div className="text-xs text-muted-foreground truncate">
                            {user.displayName}
                          </div>
                        )}
                      </div>
                      {user.followerCount !== undefined && (
                        <div className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                          {user.followerCount > 1000
                            ? `${(user.followerCount / 1000).toFixed(1)}k`
                            : user.followerCount}
                        </div>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-3 text-xs text-muted-foreground text-center">
                No users found
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
