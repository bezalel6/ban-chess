import { Play, Users, Bot, Trophy } from 'lucide-react';
import Link from 'next/link';

const gameModes = [
  {
    id: 'solo-game',
    title: 'Solo Game',
    description: 'Practice by playing both sides',
    icon: Play,
    href: '/play/solo',
    color: 'lichess-orange'
  },
  {
    id: 'play-friend',
    title: 'Play a Friend',
    description: 'Challenge someone you know',
    icon: Users,
    href: '/play/friend',
    color: 'lichess-brown'
  },
  {
    id: 'play-computer',
    title: 'Play Computer',
    description: 'Practice against AI',
    icon: Bot,
    href: '/play/computer',
    color: 'success'
  },
  {
    id: 'tournaments',
    title: 'Tournaments',
    description: 'Compete in organized events',
    icon: Trophy,
    href: '/tournaments',
    color: 'warning'
  },
];

export default function GameModeGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {gameModes.map((mode) => {
        const Icon = mode.icon;
        return (
          <Link
            key={mode.id}
            href={mode.href}
            className="group bg-background-tertiary rounded-lg p-6 hover:bg-background-secondary transition-all hover:scale-105 hover:shadow-lg border border-border"
          >
            <div className={`w-12 h-12 rounded-full bg-${mode.color}-500/20 flex items-center justify-center mb-4 group-hover:bg-${mode.color}-500/30 transition-colors`}>
              <Icon className={`h-6 w-6 text-${mode.color}-500`} />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {mode.title}
            </h3>
            <p className="text-sm text-foreground-muted">
              {mode.description}
            </p>
          </Link>
        );
      })}
    </div>
  );
}