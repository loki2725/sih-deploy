import { ChevronRight } from "lucide-react";
import { T } from "@/models/constant.js";
import { Card } from "@/views/components/common/Primitive.jsx";
import { games } from "@/models/mockdata.js";

export function GameSelection({ onPlay }) {
  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold mb-1" style={{ color: T.ink }}>
        Choose Your Game
      </h1>
      <p className="text-sm mb-6" style={{ color: T.inkSoft }}>
        Recommended for you based on your profile
      </p>
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
