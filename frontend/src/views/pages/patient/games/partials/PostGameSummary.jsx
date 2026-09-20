import { T } from "@/models/constant.js";
import { Card, Button } from "@/views/components/common/Primitive.jsx";

export function PostGameSummary({ result, onBackHome }) {
  return (
    <div className="max-w-sm text-center mx-auto pt-8">
      <h1 className="text-xl font-semibold mb-1" style={{ color: T.ink }}>
        Great Job! 🎉
      </h1>
      <p className="text-sm mb-6" style={{ color: T.inkSoft }}>
        You completed the game
      </p>
      <div
        className="w-40 h-40 rounded-full mx-auto mb-6 flex flex-col items-center justify-center"
        style={{
          border: `8px solid ${T.primarySoft}`,
          borderTopColor: T.primary,
        }}
      >
        <div className="text-2xl font-semibold" style={{ color: T.ink }}>
          {result.accuracy}%
        </div>
        <div className="text-xs" style={{ color: T.inkSoft }}>
          Accuracy
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Card>
          <div className="text-xs mb-1" style={{ color: T.inkSoft }}>
            Level Reached
          </div>
          <div className="font-semibold" style={{ color: T.ink }}>
            {result.level}
          </div>
        </Card>
        <Card>
          <div className="text-xs mb-1" style={{ color: T.inkSoft }}>
            Mistakes
          </div>
          <div className="font-semibold" style={{ color: T.ink }}>
            {result.mistakes}
          </div>
        </Card>
      </div>
      <Button onClick={onBackHome} className="w-full">
        Back to Home
      </Button>
    </div>
  );
}
