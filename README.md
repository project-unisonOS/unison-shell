# unison-shell

[![Node CI](https://github.com/project-unisonos/unison-shell/actions/workflows/node-ci.yml/badge.svg)](https://github.com/project-unisonos/unison-shell/actions/workflows/node-ci.yml)

Full-screen Electron shell for Developer Mode. Provides a minimal onboarding skeleton and an echo intent tester against the Orchestrator.

## Run locally

```powershell
npm install
npm start
```

## Panels

- Onboarding (skeleton)
  - Select language and click "Save onboarding (Tier B)"
  - Sends to Context: `POST /kv/put` with `{ person_id: 'local-user', tier: 'B', items: { 'local-user:profile:...': ... } }`

- Echo intent
  - Sends an EventEnvelope to Orchestrator `POST /event` with `{ intent: 'echo', payload: { message } }`

## Default endpoints

- Orchestrator: [http://localhost:8080](http://localhost:8080)
- Context: [http://localhost:8081](http://localhost:8081)

## Notes

- If you see CORS errors in a browser context, the services need CORS enabled. Electron typically avoids this, so we skip CORS for now.
