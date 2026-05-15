@echo off
title JJS Cutscene Setup
echo Checking for Python 'requests' library...
pip install requests --quiet

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Pip failed. Make sure Python is installed and 'Add to PATH' was checked.
    pause
    exit
)

echo.
echo ======================================================
echo  INSTALLATION COMPLETE!
echo ======================================================
echo.
echo  1. Open 'upload_tool.py' manually to start uploading.
echo  2. Follow the instructions in 'guide.txt'.
echo.
echo  This launcher will now self-destruct to clean up.
echo ======================================================
echo.
set /p DUMMY=Press [ENTER] to close and delete this file...

:: This command tells the batch file to delete itself
(goto) 2>nul & del "%~f0"