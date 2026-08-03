'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SidebarMenuButton, SidebarMenuSubButton } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import React, { useState, useEffect } from 'react';

export default function NavLink({
  href,
  children,
  className,
  isSubLink = false,
  onClick,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  isSubLink?: boolean;
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    setIsActive(pathname === href);
  }, [pathname, href]);

  const activeClass = isActive
    ? 'border-l-4 border-primary bg-sidebar-accent text-sidebar-accent-foreground'
    : 'border-l-4 border-transparent text-sidebar-foreground';

  if (isSubLink) {
    return (
        <SidebarMenuSubButton
            asChild
            isActive={isActive}
            className={cn(
                'hover:text-sidebar-accent-foreground',
                isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/80',
                className
            )}
            onClick={onClick}
        >
            <Link href={href}>{children}</Link>
        </SidebarMenuSubButton>
    )
  }

  return (
    <SidebarMenuButton
      asChild
      isActive={isActive}
      className={cn(
        'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground justify-start',
        activeClass,
        className
      )}
      onClick={onClick}
    >
      <Link href={href}>{children}</Link>
    </SidebarMenuButton>
  );
}
