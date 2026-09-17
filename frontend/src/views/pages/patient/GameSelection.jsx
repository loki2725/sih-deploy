import { useEffect, useState } from "react";
import { ChevronRight, Clock3 } from "lucide-react";
import { T } from "@/models/constant.js";
import { Card } from "@/views/components/common/Primitive.jsx";
import { games } from "@/models/mockdata.js";

export function GameSelection({ onPlay }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const start = new Date(now);
  start.setHours(6, 0, 0, 0);
  const end = new Date(now);
  end.setHours(9, 0, 0, 0);
  const isBeforeWindow = now < start;
  const isWindowOpen = now >= start && now < end;
  const remainingMs = isBeforeWindow ? start - now : isWindowOpen ? end - now : 0;
  const remainingMinutes = Math.ceil(remainingMs / 60000);
  const hours = Math.floor(remainingMinutes / 60);
  const minutes = remainingMinutes % 60;

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold mb-1" style={{ color: T.ink }}>
        Choose Your Game
      </h1>
      <p className="text-sm mb-4" style={{ color: T.inkSoft }}>
        Recommended for you based on your profile
      </p>

      <Card className="mb-6 flex items-center gap-3" style={{ background: T.primarySoft }}>
        <Clock3 size={20} color={T.primary} />
        <div className="min-w-0">
          <div className="text-sm font-semibold" style={{ color: T.ink }}>
            Daily game window: 6:00 AM – 9:00 AM
          </div>
          <div className="text-xs mt-0.5" style={{ color: T.inkSoft }}>
            {isBeforeWindow
              ? `Starts in ${hours}h ${minutes}m`
              : isWindowOpen
                ? `${hours}h ${minutes}m remaining in today's morning window`
                : ""}
          </div>
        </div>
      </Card>
      <div className="flex flex-col gap-3">
        {games.map((g) => (
          <Card
            key={g.key}
            onClick={() => onPlay(g)}
            className="flex items-center justify-between cursor-pointer hover:shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center text-xl"
                style={{ background: T.primarySoft }}
              >
                {g.icon}
              </div>
              <div>
                <div className="text-sm font-semibold" style={{ color: T.ink }}>
                  {g.name}
                </div>
                <div className="text-xs" style={{ color: T.inkSoft }}>
                  {g.desc} · {g.difficulty}
                </div>
              </div>
            </div>
            <ChevronRight size={18} color={T.inkSoft} />
          </Card>
        ))}
      </div>
    </div>
  );
}
