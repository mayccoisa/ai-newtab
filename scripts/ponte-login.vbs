' Ponte do Diario no login, sem janela.
'
' Existe porque "schtasks /sc onlogon" e negado nesta maquina: o equivalente sem
' privilegio e um atalho para este arquivo na pasta Inicializar (shell:startup).
' Ele so chama scripts\ponte.cmd, que confere se a ponte ja responde e sobe em
' segundo plano se nao. O 0 do Run e o que esconde a janela do console.
'
' Uso:
'   wscript.exe "<raiz>\scripts\ponte-login.vbs"
'
' Nao recebe argumento e nao devolve nada: quem reporta erro e a propria ponte,
' em "pnpm bridge".

Dim sh, fso, raiz
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' ScriptFullName e <raiz>\scripts\ponte-login.vbs: dois niveis acima e a raiz.
raiz = fso.GetParentFolderName(fso.GetParentFolderName(WScript.ScriptFullName))

sh.Run """" & raiz & "\scripts\ponte.cmd""", 0, False
