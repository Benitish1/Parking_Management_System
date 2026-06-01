@echo off
REM Launch every backend microservice in its OWN terminal window.
REM Run from the backend/ folder (npm run dev / npm run dev:backend handles that).
echo Launching XWZ Parking backend services (7 terminals)...

start "XWZ GATEWAY :4000"  cmd /k "npm run dev:gateway"
start "XWZ AUTH :4001"     cmd /k "npm run dev:auth"
start "XWZ USER :4002"     cmd /k "npm run dev:user"
start "XWZ PARKING :4003"  cmd /k "npm run dev:parking"
start "XWZ CARENTRY :4004" cmd /k "npm run dev:carentry"
start "XWZ REPORT :4005"   cmd /k "npm run dev:report"
start "XWZ NOTIFY :4006"   cmd /k "npm run dev:notification"

echo Done. 7 backend terminals opened.
