@echo off
echo Granting full control to current user on F:\bihari...
icacls "F:\bihari" /grant Everyone:(OI)(CI)F /T /C
echo Copying files from C:\Users\lenovo\bihari to F:\bihari...
xcopy "C:\Users\lenovo\bihari\*" "F:\bihari\" /E /I /Y
echo Done! Bihari Orchestra is ready in F:\bihari.
pause
