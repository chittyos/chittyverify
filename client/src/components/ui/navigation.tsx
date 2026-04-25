import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Search, Menu, X, Shield, LogIn, LogOut } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";

export function Navigation() {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();

  const navigationItems = [
    { href: "/", label: "Dashboard", active: location === "/" || location === "/dashboard" },
    { href: "/upload", label: "Upload", active: location === "/upload" },
  ];

  return (
    <nav className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-6 max-w-6xl">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link href="/">
            <div className="flex items-center space-x-4 cursor-pointer">
              <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
                <Shield className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">
                  <span className="text-foreground">Chitty</span>
                  <span className="text-primary">Verify</span>
                </h1>
              </div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-2">
            {navigationItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <button
                  className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                    item.active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {item.label}
                </button>
              </Link>
            ))}
          </div>

          {/* Right Side */}
          <div className="flex items-center space-x-4">
            {/* Search */}
            <div className="hidden md:flex items-center">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search evidence..."
                  className="pl-10 pr-4 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-background text-foreground placeholder-muted-foreground w-64"
                />
              </div>
            </div>

            {/* Auth */}
            <div className="hidden md:flex items-center space-x-2">
              {isAuthenticated ? (
                <>
                  <span className="text-sm text-muted-foreground">
                    {user?.name}
                  </span>
                  <Button variant="ghost" size="sm" onClick={logout}>
                    <LogOut className="w-4 h-4 mr-1" />
                    Sign out
                  </Button>
                </>
              ) : (
                <Link href="/login">
                  <Button variant="outline" size="sm">
                    <LogIn className="w-4 h-4 mr-1" />
                    Sign in
                  </Button>
                </Link>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="default"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-muted-foreground hover:text-foreground"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-border py-4">
            <div className="space-y-2 px-4">
              {navigationItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <button
                    className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                      item.active
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.label}
                  </button>
                </Link>
              ))}
              <div className="border-t border-border pt-4 mt-4 px-4">
                {isAuthenticated ? (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{user?.name}</span>
                    <Button variant="ghost" size="sm" onClick={logout}>
                      Sign out
                    </Button>
                  </div>
                ) : (
                  <Link href="/login">
                    <Button variant="outline" size="sm" className="w-full">
                      <LogIn className="w-4 h-4 mr-1" />
                      Sign in
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
