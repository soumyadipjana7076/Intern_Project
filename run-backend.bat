@echo off
title Chicken Run - Core Java Backend Server
cd /d "%~dp0"
echo ===============================================================
echo   Compiling and Starting Chicken Run Core Java Backend Server
echo ===============================================================
if not exist "backend\bin" mkdir "backend\bin"
javac -d backend\bin backend\src\Main.java
if %errorlevel% neq 0 (
    echo [ERROR] Java compilation failed! Please ensure Java JDK is installed.
    pause
    exit /b %errorlevel%
)
echo [OK] Backend compiled successfully!
echo [!] Starting Core Java server on port 8080...
start http://localhost:8080/
java -cp backend\bin Main 8080
pause
