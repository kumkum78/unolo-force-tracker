# Environment Setup Notes

## Current Issue: Native Module Compilation

**Status:** ⚠️ Blocked - Requires Visual Studio C++ Build Tools

### Problem
Node.js v24.11.0 is installed, but the following packages require native compilation:
- `better-sqlite3` - SQLite database driver
- `bcrypt` (switched to `bcryptjs` as workaround)

### Error
```
gyp ERR! find VS could not find Visual Studio installation
gyp ERR! You need to install the latest version of Visual Studio
gyp ERR! including the "Desktop development with C++" workload.
```

### Solutions

#### Option 1: Install Visual Studio Build Tools (Recommended for Windows)
```powershell
# Download and install Visual Studio Build Tools
# https://visualstudio.microsoft.com/downloads/
# Select "Desktop development with C++" workload
```

#### Option 2: Downgrade Node.js to LTS Version
```powershell
# Use Node.js v20 LTS (has prebuilt binaries for better-sqlite3)
# Download from: https://nodejs.org/
```

#### Option 3: Use WSL2 (Windows Subsystem for Linux)
```bash
# Install WSL2 and run project in Linux environment
wsl --install
```

#### Option 4: Use sql.js (Pure JavaScript SQLite)
Replace `better-sqlite3` with `sql.js` in package.json
- ✅ No compilation needed
- ❌ Slower performance
- ❌ Requires code refactoring

### Temporary Status

**Current Approach:** Documenting this as a known environment issue.  
**Phase 1 Status:** Partially Complete - Tests written but cannot execute due to native module dependency.

### Changes Made to Work Around

1. ✅ Replaced `bcrypt` → `bcryptjs` (pure JavaScript, no compilation)
2. ⚠️ Still need `better-sqlite3` compiled or alternative

### Next Steps

User needs to choose one of the solutions above before proceeding with Phase 1 completion.

For the assignment submission, we recommend:
- **Best:** Option 2 (Downgrade to Node.js v20 LTS)
- **Alternative:** Option 1 (Install VS Build Tools)

---

**Date:** January 26, 2026  
**Time:** 11:30 AM IST
