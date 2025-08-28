import Link from 'next/link';
import { Github, Twitter, Heart } from 'lucide-react';

const footerSections = [
  {
    title: 'About',
    links: [
      { label: 'About Ban Chess', href: '/about' },
      { label: 'FAQ', href: '/faq' },
      { label: 'Contact', href: '/contact' },
      { label: 'Privacy', href: '/privacy' },
    ]
  },
  {
    title: 'Community',
    links: [
      { label: 'Discord', href: '/discord' },
      { label: 'Forum', href: '/forum' },
      { label: 'Blog', href: '/blog' },
      { label: 'Contribute', href: '/contribute' },
    ]
  },
  {
    title: 'Help',
    links: [
      { label: 'Rules', href: '/learn/ban-chess' },
      { label: 'Getting started', href: '/learn/basics' },
      { label: 'Support', href: '/support' },
      { label: 'Bug reports', href: '/bugs' },
    ]
  },
  {
    title: 'Legal',
    links: [
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Source code', href: 'https://github.com/your-repo/ban-chess' },
    ]
  }
];

export default function Footer() {
  return (
    <footer className="bg-background-secondary border-t border-border mt-16">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {footerSections.map((section) => (
            <div key={section.title}>
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4">
                {section.title}
              </h3>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link 
                      href={link.href}
                      className="text-sm text-foreground-muted hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        
        {/* Bottom section */}
        <div className="mt-12 pt-8 border-t border-border">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-1 text-sm text-foreground-muted">
              <span>© 2025 Ban Chess. Made with</span>
              <Heart className="h-3 w-3 text-destructive-400 fill-current" />
              <span>for chess players everywhere.</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <p className="text-sm text-foreground-muted">
                Free, open source chess server
              </p>
              <div className="flex space-x-3">
                <Link
                  href="https://github.com/your-repo/ban-chess"
                  className="text-foreground-muted hover:text-foreground transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Github className="h-4 w-4" />
                </Link>
                <Link
                  href="https://twitter.com/banchess"
                  className="text-foreground-muted hover:text-foreground transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Twitter className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}