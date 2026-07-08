"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/shared/brand-logo";
import { footerAccountLinks, navLinks } from "@/features/landing/data";
import { FadeIn } from "./fade-in";

/** Site footer — brand, nav links, account links, copyright from landing.html. */
export function Footer() {
  return (
    <footer className="border-t border-border/50 py-12">
      <div className="mx-auto max-w-6xl px-6">
        <FadeIn>
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
            <div>
              <Link href="/">
                <BrandLogo />
              </Link>
              <p className="mt-3 max-w-xs text-sm text-muted-foreground">
                AI-powered quotations and lead management for product
                businesses.
              </p>
            </div>

            <div className="flex gap-16">
              <div>
                <p className="mb-3 text-sm font-medium">Product</p>
                <ul className="space-y-2">
                  {navLinks.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="mb-3 text-sm font-medium">Account</p>
                <ul className="space-y-2">
                  {footerAccountLinks.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border/50 pt-8 sm:flex-row">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Quotify AI. All rights reserved.
            </p>
            <p className="text-sm text-muted-foreground">
              Built as a learning project
            </p>
          </div>
        </FadeIn>
      </div>
    </footer>
  );
}
