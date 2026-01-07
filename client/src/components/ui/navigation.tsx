import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TrustIndicator } from "./trust-indicator";
import { Search, Menu, X, Bell, Settings, Shield } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";

export function Navigation() {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Get current user data (demo user for now)
  const { data: user } = useQuery({
    queryKey: ["/api/users", "demo-user-1"],
    queryFn: () => Promise.resolve({
      id: "demo-user-1",
      username: "john.doe",
      email: "john.doe@example.com",
      trustScore: 85,
    }),
  });

  const navigationItems = [
    { href: "/", label: "Dashboard", active: location === "/" },
    { href: "/upload", label: "Upload", active: location === "/upload" },
    { href: "/cases", label: "Cases", active: location.startsWith("/cases") },
    { href: "/analytics", label: "Analytics", active: location.startsWith("/analytics") },
  ];

  return (
    <nav className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-6 max-w-6xl">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link href="/">
            <div className="flex items-center space-x-4 cursor-pointer group">
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
                  className="pl-10 pr-4 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-background text-foreground placeholder-muted-foreground w-80"
                />
              </div>
            </div>

            {/* Trust Score Display */}
            <div className="hidden md:flex items-center">
              <TrustIndicator 
                score={user?.trustScore || 85} 
                showLabel={true}
              />
            </div>

            {/* Actions */}
            <div className="hidden md:flex items-center space-x-1">
              <Button
                variant="ghost"
                size="default"
                className="text-muted-foreground hover:text-foreground"
              >
                <Bell className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost" 
                size="default"
                className="text-muted-foreground hover:text-foreground"
              >
                <Settings className="w-5 h-5" />
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="default"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-muted-foreground hover:text-foreground"
              >
                {isMobileMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-slate-700 bg-slate-900/95 backdrop-blur-sm py-4">
            <div className="space-y-2 px-4">
              {navigationItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <button
                    className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                      item.active
                        ? "bg-primary-blue/20 text-primary-blue border border-primary-blue/30"
                        : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.label}
                  </button>
                </Link>
              ))}
              <div className="border-t border-slate-700 pt-4 mt-4">
                <div className="flex items-center justify-between px-4">
                  <div>
                    <p className="font-medium text-white">
                      {user?.username || "John Doe"}
                    </p>
                    <p className="text-sm text-slate-400">Legal Professional</p>
                  </div>
                  <TrustIndicator score={user?.trustScore || 85} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Background pattern overlay */}
      <div className="absolute inset-0 bg-noise opacity-20 pointer-events-none"></div>
    </nav>
  );
}
