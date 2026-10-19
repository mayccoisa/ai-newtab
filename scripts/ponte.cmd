@echo off
rem Sobe a ponte local do Diario se ela nao estiver no ar, e sai.
rem Existe para caber numa linha: e o alvo da tarefa de login descrita no README.
cd /d "%~dp0.."
node "scripts\ponte.mjs"
