@echo off
title Mirch Masala - Database Setup Tool
color 0E

echo =======================================================================
echo              MIRCH MASALA WHATSAPP ORDERING SYSTEM SETUP
echo =======================================================================
echo.
echo This script will set up your local development environment.
echo.
echo Requirements:
echo   1. Node.js must be installed (https://nodejs.org)
echo   2. PostgreSQL must be installed and DATABASE_URL must be set in .env
echo.
echo Press any key to start...
echo.
pause

echo.
echo [1/3] Installing node packages (npm install)...
echo Please wait, this might take a minute...
echo.
call npm install
if errorlevel 1 goto err_npm

echo.
echo [2/3] Syncing PostgreSQL database (prisma db push)...
echo.
call npx prisma db push
if errorlevel 1 goto err_prisma

echo.
echo [3/3] Seeding restaurant categories, menu, and admin users...
call npx prisma db seed
if errorlevel 1 goto err_seed

color 0A
echo.
echo =======================================================================
echo          SUCCESS: Setup completed successfully!
echo =======================================================================
echo.
echo Next steps:
echo   1. Open command prompt in this folder.
echo   2. Run "npm run dev" to start Next.js.
echo   3. Open http://localhost:3000 in your browser.
echo.
goto end

:err_npm
color 0C
echo.
echo -----------------------------------------------------------------------
echo ERROR: "npm install" failed.
echo -----------------------------------------------------------------------
echo Common causes:
echo   - Node.js is not installed on your system.
echo   - Please download and install it from: https://nodejs.org
echo.
goto end

:err_prisma
color 0C
echo.
echo -----------------------------------------------------------------------
echo ERROR: Prisma database push failed.
echo -----------------------------------------------------------------------
echo Common causes:
echo   - Local directory permissions are preventing DB file creation.
echo   - Your database credentials in ".env.local" or ".env" are incorrect.
echo     (Current URL: check your DATABASE_URL value)
echo.
goto end

:err_seed
color 0C
echo.
echo -----------------------------------------------------------------------
echo ERROR: Seeding database failed.
echo -----------------------------------------------------------------------
echo.
goto end

:end
echo.
echo Script execution finished.
echo Press any key to close this window...
pause > nul
