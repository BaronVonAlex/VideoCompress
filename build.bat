@echo off
setlocal

echo [1/4] Installing dependencies...
cd backend && bun install --frozen-lockfile >nul 2>&1
cd ../frontend && bun install --frozen-lockfile >nul 2>&1
cd ..

echo [2/4] Building frontend...
cd frontend && bun run build
if errorlevel 1 (
  echo ERROR: Frontend build failed.
  pause & exit /b 1
)
cd ..

echo [3/4] Copying frontend to public\...
if exist public rmdir /s /q public
xcopy /e /i /q frontend\dist public >nul

echo [4/4] Compiling to VideoCompress.exe...
cd backend
bun build --compile --minify src/index.ts --outfile ../VideoCompress.exe
if errorlevel 1 (
  echo ERROR: Compile failed.
  pause & exit /b 1
)
cd ..

if not exist temp mkdir temp

echo.
echo Build complete.
