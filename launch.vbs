' VideoCompress launcher
' First run: builds the app automatically.
' Every run: starts VideoCompress.exe silently (it opens the browser itself).

Dim fso
Set fso = CreateObject("Scripting.FileSystemObject")

Dim appDir
appDir = fso.GetParentFolderName(WScript.ScriptFullName)

Dim exePath
exePath = appDir & "\VideoCompress.exe"

Dim shell
Set shell = CreateObject("WScript.Shell")
shell.CurrentDirectory = appDir

' ── First-run build ──────────────────────────────────────────────────────────
Dim needsBuild
needsBuild = Not fso.FileExists(exePath) Or Not fso.FolderExists(appDir & "\public")

If needsBuild Then
  Dim bunCheck
  bunCheck = shell.Run("cmd /c bun --version >nul 2>&1", 0, True)
  If bunCheck <> 0 Then
    MsgBox "Bun is not installed or not in PATH." & vbCrLf & vbCrLf & _
           "Install it from https://bun.sh then try again.", _
           vbExclamation, "VideoCompress"
    WScript.Quit
  End If

  MsgBox "First run — the app will now build." & vbCrLf & vbCrLf & _
         "A terminal window will open and close automatically when done." & vbCrLf & _
         "This only happens once.", vbInformation, "VideoCompress"

  Dim buildResult
  buildResult = shell.Run("cmd /c """ & appDir & "\build.bat""", 1, True)

  If buildResult <> 0 Then
    MsgBox "Build failed. Check the terminal output for errors.", vbCritical, "VideoCompress"
    WScript.Quit
  End If

  If Not fso.FileExists(exePath) Or Not fso.FolderExists(appDir & "\public") Then
    MsgBox "Build finished but expected files are missing.", vbCritical, "VideoCompress"
    WScript.Quit
  End If
End If

' ── Kill any existing instance so the port is free ───────────────────────────
shell.Run "cmd /c taskkill /F /IM VideoCompress.exe >nul 2>&1", 0, True

' ── Start silently — the exe opens the browser itself ────────────────────────
shell.Run Chr(34) & exePath & Chr(34), 0, False
