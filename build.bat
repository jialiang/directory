@echo off
setlocal

set "user_endpoint=users/jialiang"
set "data=%~dp0data"

if not exist "%data%" mkdir "%data%"

echo Fetching repos and gists from %user_endpoint%...
gh api --paginate --slurp "%user_endpoint%/repos?per_page=100" > "%data%\repos.json" || exit /b 1
gh api --paginate --slurp "%user_endpoint%/gists?per_page=100" > "%data%\gists.json" || exit /b 1

node "%~dp0build.js" || exit /b 1
