export default function HowToPlay() {
  return (
    <div>
      <h3 className="text-2xl font-semibold text-white text-center mb-6">
        How to Play
      </h3>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <Step number={1} description="Black bans one of White's opening moves" />
          <Step number={2} description="White makes their first move (with ban in effect)" />
          <Step number={3} description="White bans one of Black's possible responses" />
        </div>
        <div className="space-y-3">
          <Step number={4} description="Black makes their move (with ban in effect)" />
          <Step number={5} description="Pattern continues: Ban → Move → Ban → Move" />
          <Step number={6} description="Win by checkmating your opponent!" />
        </div>
      </div>
    </div>
  );
}

function Step({ number, description }: { number: number; description: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex-shrink-0 w-8 h-8 bg-green-500/20 border border-green-500/50 rounded-full flex items-center justify-center text-green-400 font-bold text-sm">
        {number}
      </span>
      <p className="text-gray-300">{description}</p>
    </div>
  );
}