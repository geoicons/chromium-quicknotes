@echo off
echo Installing Python dependencies...
pip install -r requirements.txt

echo.
echo Resizing icons...
python resize_icons.py

echo.
echo Press any key to exit...
pause

