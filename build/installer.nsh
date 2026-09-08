!macro customInstall
  FileOpen $0 "$INSTDIR\resources\dropzone-installed" w
  FileWrite $0 "nsis"
  FileClose $0
!macroend
!macro customUnInstall
  Delete "$INSTDIR\resources\dropzone-installed"
!macroend
