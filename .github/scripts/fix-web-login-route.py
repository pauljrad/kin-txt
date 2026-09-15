from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"Expected snippet not found in {path}")
    p.write_text(text.replace(old, new, 1))


replace_once(
    "src/pages/Index.tsx",
    "  const handleLoginClick = () => {\n    navigate('/login?signup=true');\n  };",
    "  const handleLoginClick = () => {\n    navigate('/login');\n  };",
)

replace_once(
    "src/pages/Login.tsx",
    '''            ) : (\n              <Link\n                to="/pricing"\n                className="text-sm text-muted-foreground hover:text-foreground transition-colors"\n              >\n                New to KiN-TXT?{' '}\n                <span className="underline underline-offset-2 text-foreground">Sign Up to Pro →</span>\n              </Link>\n            )}''',
    '''            ) : isSignUp ? (\n              <button\n                type="button"\n                onClick={() => {\n                  setIsSignUp(false);\n                  setConfirmEmail('');\n                  setConfirmPassword('');\n                  setErrors({});\n                  navigate('/login', { replace: true });\n                }}\n                className="text-sm text-muted-foreground hover:text-foreground transition-colors"\n              >\n                Already have an account?{' '}\n                <span className="underline underline-offset-2 text-foreground">Sign in →</span>\n              </button>\n            ) : (\n              <Link\n                to="/pricing"\n                className="text-sm text-muted-foreground hover:text-foreground transition-colors"\n              >\n                New to KiN-TXT?{' '}\n                <span className="underline underline-offset-2 text-foreground">Sign Up to Pro →</span>\n              </Link>\n            )}''',
)
