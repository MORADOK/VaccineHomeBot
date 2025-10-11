/**
 * Secure Admin Login Component
 * ✅ No hardcoded credentials
 * ✅ Password validation
 * ✅ Rate limiting
 * ✅ Better error handling
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { useAdminAuth } from '@/hooks/use-admin-auth-secure';

interface AdminLoginProps {
  onSuccess?: () => void;
}

// Rate limiting: Track login attempts
const loginAttempts: Map<string, { count: number; lastAttempt: number }> = new Map();
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

/**
 * Check if user is locked out due to too many failed attempts
 */
function isLockedOut(email: string): boolean {
  const attempts = loginAttempts.get(email);
  if (!attempts) return false;

  const now = Date.now();
  const timeSinceLastAttempt = now - attempts.lastAttempt;

  if (timeSinceLastAttempt > LOCKOUT_DURATION) {
    // Reset attempts after lockout duration
    loginAttempts.delete(email);
    return false;
  }

  return attempts.count >= MAX_ATTEMPTS;
}

/**
 * Record a failed login attempt
 */
function recordFailedAttempt(email: string): void {
  const attempts = loginAttempts.get(email) || { count: 0, lastAttempt: 0 };
  attempts.count += 1;
  attempts.lastAttempt = Date.now();
  loginAttempts.set(email, attempts);
}

/**
 * Reset login attempts on successful login
 */
function resetAttempts(email: string): void {
  loginAttempts.delete(email);
}

/**
 * Get remaining lockout time in minutes
 */
function getRemainingLockoutTime(email: string): number {
  const attempts = loginAttempts.get(email);
  if (!attempts) return 0;

  const now = Date.now();
  const timeSinceLastAttempt = now - attempts.lastAttempt;
  const remainingTime = LOCKOUT_DURATION - timeSinceLastAttempt;

  return Math.ceil(remainingTime / 60000); // Convert to minutes
}

/**
 * Validate password strength (basic validation)
 */
function validatePassword(password: string): string | null {
  if (password.length < 8) {
    return 'รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร';
  }
  return null;
}

/**
 * Validate email format
 */
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function AdminLoginSecure({ onSuccess }: AdminLoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const { login, isLoading, error } = useAdminAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Validate email format
    if (!validateEmail(email)) {
      setValidationError('รูปแบบอีเมลไม่ถูกต้อง');
      return;
    }

    // Validate password
    const passwordError = validatePassword(password);
    if (passwordError) {
      setValidationError(passwordError);
      return;
    }

    // Check rate limiting
    if (isLockedOut(email)) {
      const remainingTime = getRemainingLockoutTime(email);
      setValidationError(
        `บัญชีถูกล็อคชั่วคราว กรุณารออีก ${remainingTime} นาที`
      );
      return;
    }

    try {
      await login(email, password);
      resetAttempts(email);
      onSuccess?.();
    } catch (err) {
      recordFailedAttempt(email);

      const attemptsLeft = MAX_ATTEMPTS - (loginAttempts.get(email)?.count || 0);
      if (attemptsLeft > 0 && attemptsLeft < MAX_ATTEMPTS) {
        setValidationError(`พยายามเข้าสู่ระบบล้มเหลว เหลืออีก ${attemptsLeft} ครั้ง`);
      }
    }
  };

  const displayError = validationError || error;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Shield className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold">Admin Access</CardTitle>
          <CardDescription>
            เข้าสู่ระบบสำหรับผู้ดูแลระบบ
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {displayError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{displayError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
                required
                disabled={isLoading}
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="รหัสผ่าน"
                  required
                  disabled={isLoading}
                  autoComplete="current-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !email || !password}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  กำลังเข้าสู่ระบบ...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  เข้าสู่ระบบ
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="text-sm font-medium text-blue-900 mb-2">
              🔒 Secure Authentication
            </h4>
            <div className="text-xs text-blue-700 space-y-1">
              <div>✅ Passwords are securely hashed</div>
              <div>✅ Rate limiting enabled (5 attempts per 15 min)</div>
              <div>✅ Session timeout after inactivity</div>
              <div>✅ Database-backed role verification</div>
            </div>
            <div className="mt-2 text-xs text-blue-600">
              💡 Contact system administrator to create an admin account
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
