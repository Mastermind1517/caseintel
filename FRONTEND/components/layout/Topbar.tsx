import { Bell, Search } from "lucide-react";

export default function Topbar() {
  return (
    <header className="h-16 border-b bg-white flex items-center justify-between px-6">
      <div className="flex items-center gap-2 border rounded-lg px-3 py-2 w-80">
        <Search size={18} className="text-gray-400" />

        <input
          type="text"
          placeholder="Search cases, documents..."
          className="outline-none text-sm w-full"
        />
      </div>

      <div className="flex items-center gap-5">
        <Bell size={20} />

        <div>
          <p className="text-sm font-medium">Investigator</p>
          <p className="text-xs text-gray-500">Authorized User</p>
        </div>
      </div>
    </header>
  );
}