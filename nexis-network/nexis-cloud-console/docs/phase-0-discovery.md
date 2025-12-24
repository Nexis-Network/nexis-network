# Phase 0 Discovery and Contracts (Nexis Cloud Console)

This document captures the verified console baseline, API contracts, and integration facts for Phase 0.
All facts below are derived from the repository state and file paths listed in the Sources section.

## Sources (verifiable)
- nexis-cloud-console/package.json
- nexis-cloud-console/src/app/page.tsx
- nexis-cloud-console/src/app/dashboard/layout.tsx
- nexis-cloud-console/src/app/dashboard/page.tsx
- nexis-cloud-console/src/components/layout/sidebar.tsx
- nexis-cloud/js/package.json
- nexis-cloud/js/src/client.ts
- nexis-cloud/js/src/types/client.ts
- nexis-cloud/js/src/actions/index.ts
- nexis-cloud/js/src/actions/get_current_user.ts
- nexis-cloud/js/src/actions/get_available_nodes.ts
- nexis-cloud/js/src/actions/list-instance-types.ts
- nexis-cloud/js/src/actions/workspaces/list_workspaces.ts
- nexis-cloud/js/src/actions/workspaces/get_workspace.ts
- nexis-cloud/js/src/actions/cvms/*.ts
- nexis-cloud/js/src/actions/kms/*.ts
- nexis-cloud/js/src/types/cvm_info.ts
- nexis-cloud/js/src/types/kms_info.ts
- nexis-cloud/js/src/types/supported_chains.ts
- nexis-cloud/cli/src/commands/login/index.ts

## Console baseline (current state)
- Routes exist: `/` and `/dashboard` only.
  - `/` is still the default Next.js template. Source: `nexis-cloud-console/src/app/page.tsx`.
  - `/dashboard` renders the Overview cards and Quick Actions. Source: `nexis-cloud-console/src/app/dashboard/page.tsx`.
- Dashboard layout uses a fixed header and sidebar. Source: `nexis-cloud-console/src/app/dashboard/layout.tsx`.
- Sidebar links include routes that do not exist yet:
  - `/dashboard/instances`, `/dashboard/images`, `/dashboard/keys`, `/dashboard/billing`, `/dashboard/trust`, `/dashboard/settings`.
  - Source: `nexis-cloud-console/src/components/layout/sidebar.tsx`.
- Client libraries already present in console package.json but unused:
  - `@tanstack/react-query`, `zustand`, `framer-motion`.
  - Source: `nexis-cloud-console/package.json`.

## API client configuration (Nexis Cloud JS SDK)
Sources: `nexis-cloud/js/package.json`, `nexis-cloud/js/src/client.ts`, `nexis-cloud/js/src/types/client.ts`.
- SDK package name in repo: `@nexis/cloud`.
- Base URL default (code): `https://cloud-api.nexis.network/api/v1`.
- Note: `types/client.ts` comments state a default of `https://cloud-api.nexis.network/v1`, which does not match the implementation in `client.ts`.
- Env vars used by SDK:
  - `PHALA_CLOUD_API_KEY` (API key header)
  - `PHALA_CLOUD_API_PREFIX` (base URL override)
- API versions supported: `2025-05-31`, `2025-10-28`.
  - Version is sent via `X-Phala-Version` header.
- Auth modes:
  - API key auth uses `X-API-Key` header when `useCookieAuth` is false.
  - Cookie auth sets `credentials: "include"` and skips `X-API-Key`.

## Auth flows confirmed in repo
Source: `nexis-cloud/js/src/actions/get_current_user.ts`, `nexis-cloud/cli/src/commands/login/index.ts`.
- API key validation: `GET /auth/me` (returns user profile data).
- Device authorization flow (used by CLI):
  - `POST /auth/device/code` with `{ client_id: "phala-cli", scope: "user:profile cvms:* nodes:*" }`.
  - `POST /auth/device/token` with `{ device_code, grant_type: "urn:ietf:params:oauth:grant-type:device_code" }`.
- Console needs a decision on whether to reuse device auth or adopt a browser-first login (not defined in repo).

## API inventory (verified endpoints and methods)
Sources: `nexis-cloud/js/src/actions/index.ts` and the action files referenced below.

### User and workspace
- `GET /auth/me` -> `actions/get_current_user.ts` (CurrentUser)
- `GET /workspaces` -> `actions/workspaces/list_workspaces.ts` (ListWorkspaces)
- `GET /workspaces/{slug}` -> `actions/workspaces/get_workspace.ts` (WorkspaceResponse)

### Nodes and instance types
- `GET /teepods/available` -> `actions/get_available_nodes.ts` (AvailableNodes)
- `GET /instance-types` -> `actions/list-instance-types.ts` (AllFamiliesResponse)
- `GET /instance-types/{family}` -> `actions/list-instance-types.ts` (FamilyInstanceTypesResponse)

### CVM provisioning (two-step)
- `POST /cvms/provision` -> `actions/cvms/provision_cvm.ts` (ProvisionCvm)
- `POST /cvms` -> `actions/cvms/commit_cvm_provision.ts` (CommitCvmProvision)
  - On-chain KMS requires contract-derived `app_id` and `contract_address` + `deployer_address`.

### CVM listing and details
- `GET /cvms/paginated` -> `actions/cvms/get_cvm_list.ts` (GetCvmListResponse)
- `GET /cvms/{id}` -> `actions/cvms/get_cvm_info.ts` (GetCvmInfoResponse)
- `GET /cvms/{id}/stats` -> `actions/cvms/get_cvm_stats.ts` (CvmSystemInfo)
- `GET /cvms/{id}/composition` -> `actions/cvms/get_cvm_containers_stats.ts` (CvmContainersStats)
- `GET /cvms/{id}/network` -> `actions/cvms/get_cvm_network.ts` (CvmNetwork)
- `GET /cvms/{id}/state` -> `actions/cvms/get_cvm_state.ts` (CvmState)
- `GET /cvms/{id}/state?target=...` with `Accept: text/event-stream` -> `actions/cvms/watch_cvm_state.ts` (SSE events)
- `GET /cvms/{id}/attestation` -> `actions/cvms/get_cvm_attestation.ts` (CvmAttestation)

### CVM lifecycle control
- `POST /cvms/{id}/start` -> `actions/cvms/start_cvm.ts`
- `POST /cvms/{id}/stop` -> `actions/cvms/stop_cvm.ts`
- `POST /cvms/{id}/shutdown` -> `actions/cvms/shutdown_cvm.ts`
- `POST /cvms/{id}/restart` -> `actions/cvms/restart_cvm.ts` (accepts `{ force }`)
- `DELETE /cvms/{id}` -> `actions/cvms/delete_cvm.ts`

### CVM configuration and updates
- `GET /cvms/{id}/compose_file` -> `actions/cvms/get_cvm_compose_file.ts`
- `POST /cvms/{id}/compose_file/provision` -> `actions/cvms/provision_cvm_compose_file_update.ts`
- `PATCH /cvms/{id}/compose_file` -> `actions/cvms/commit_cvm_compose_file_update.ts`
- `PATCH /cvms/{id}/docker-compose` -> `actions/cvms/update_docker_compose.ts`
  - Body is YAML (`Content-Type: text/yaml`). Optional headers: `X-Compose-Hash`, `X-Transaction-Hash`.
- `GET /cvms/{id}/docker-compose.yml` -> `actions/cvms/get_cvm_docker_compose.ts`
- `PATCH /cvms/{id}/envs` -> `actions/cvms/update_cvm_envs.ts`
  - Returns `status: precondition_required` when compose hash registration is required (HTTP 465 in code).
- `PATCH /cvms/{id}/pre-launch-script` -> `actions/cvms/update_prelaunch_script.ts`
  - Body is plain text (`Content-Type: text/plain`). Optional headers: `X-Compose-Hash`, `X-Transaction-Hash`.
- `GET /cvms/{id}/pre-launch-script` -> `actions/cvms/get_cvm_prelaunch_script.ts`
- `PATCH /cvms/{id}/resources` -> `actions/cvms/update_cvm_resources.ts`
- `PATCH /cvms/{id}/visibility` -> `actions/cvms/update_cvm_visibility.ts`
- `GET /cvms/{id}/available-os-images` -> `actions/cvms/get_available_os_images.ts`
- `PATCH /cvms/{id}/os-image` -> `actions/cvms/update_os_image.ts`

### KMS
- `GET /kms` -> `actions/kms/get_kms_list.ts` (GetKmsListResponse)
- `GET /kms/{id}` -> `actions/kms/get_kms_info.ts` (KmsInfo)
- `GET /kms/{kms}/pubkey/{app_id}` -> `actions/kms/get_app_env_encrypt_pubkey.ts` (GetAppEnvEncryptPubKey)
- `GET /kms/phala/next_app_id?counts=N` -> `actions/kms/next_app_ids.ts` (NextAppIds)

### On-chain operations (not HTTP endpoints)
- `deployAppAuth` and `addComposeHash` are blockchain actions in `actions/blockchains/*`.
  - These are used for on-chain KMS flows and require chain configuration (`SUPPORTED_CHAINS` in `types/supported_chains.ts`).

## Key data models (fields used by the console)
Sources: `nexis-cloud/js/src/types/cvm_info.ts`, `nexis-cloud/js/src/types/kms_info.ts`, `nexis-cloud/js/src/actions/*.ts`.

### CurrentUser
- `username`, `email`, `credits`, `granted_credits`, `avatar`, `team_name`, `team_tier`.
  - Source: `actions/get_current_user.ts`.

### CVM list item (CvmInfo)
- Core: `name`, `status`, `in_progress`, `listed`.
- Resources: `vcpu`, `memory`, `disk_size`.
- Routing: `gateway_domain`, `public_urls`.
- Ownership: `managed_user`, `project_id`, `project_type`.
- Platform: `node`, `kms_info`, `billing_period`.
  - Source: `types/cvm_info.ts`.

### CVM detail (CvmLegacyDetail)
- Identifiers: `id`, `app_id`, `instance_id`, `vm_uuid`.
- Config: `vcpu`, `memory`, `disk_size`, `base_image`.
- Status: `status`, `in_progress`, `scheduled_delete_at`.
- Access: `public_sysinfo`, `public_logs`, `public_urls`, `gateway_domain`.
  - Source: `types/cvm_info.ts`.

### CVM stats and containers
- System metrics: `cpu_model`, `total_memory`, `used_memory`, `loadavg_*`, disk usage, `uptime`.
  - Source: `actions/cvms/get_cvm_stats.ts`.
- Containers: `names`, `image`, `state`, `status`, `log_endpoint`.
  - Source: `actions/cvms/get_cvm_containers_stats.ts`.

### KMS info
- `id`, `slug`, `url`, `version`, `chain_id`, `kms_contract_address`, `gateway_app_id`.
- Chain metadata attached when `chain_id` matches `SUPPORTED_CHAINS`.
  - Source: `types/kms_info.ts` and `types/supported_chains.ts`.

## Feature-to-API coverage map (from TODO.md)
Source for feature list: `nexis-cloud-console/TODO.md`.

### Covered by existing API/SDK
- CVM lifecycle, metrics, and logs: `getCvmList`, `getCvmInfo`, `getCvmStats`, `getCvmContainersStats`, `getCvmState`, `watchCvmState`.
- CVM actions: `startCvm`, `stopCvm`, `shutdownCvm`, `restartCvm`, `deleteCvm`.
- Deploy flow: `provisionCvm` -> `commitCvmProvision` with optional on-chain KMS flows.
- Images/OS selection: `getAvailableOsImages`, `updateOsImage`.
- SSH / keys: no dedicated endpoint; SSH key management is not present in SDK.
- Trust / attestation: `getCvmAttestation` plus KMS data in `KmsInfo`.

### Not present in SDK or CLI repo (requires new API or other service)
- Billing and invoices (Stripe/crypto, invoices, usage, credits top-up).
- API key management (create/revoke keys) as a user-facing feature.
- Team management and RBAC (invite members, roles) beyond `workspaces` list.
- Agent registry, one-click agent deploy, agent chat UI, knowledge base upload.
- Analytics and Sentry configuration endpoints (integration is client-side but needs project IDs).

### Auth and onboarding gaps
- Only `GET /auth/me` is in the SDK; login/registration is not defined in console repo.
- Device auth endpoints exist in CLI, but there is no console-specific auth flow defined.

## Console route map (derived from TODO and sidebar)
This is the minimum route inventory implied by `TODO.md` and the current sidebar.
- `/dashboard` (Overview)
- `/dashboard/instances` (CVM list)
- `/dashboard/instances/{id}` (CVM details)
- `/dashboard/deploy` (Deploy CVM wizard)
- `/dashboard/images` (OS images)
- `/dashboard/keys` (SSH keys management)
- `/dashboard/billing` (usage, invoices, payments)
- `/dashboard/agents` (registry)
- `/dashboard/agents/{id}` (agent configuration)
- `/dashboard/agents/{id}/chat` (agent chat/debug)
- `/dashboard/api-keys` (API keys management)
- `/dashboard/team` (members, roles)
- `/dashboard/trust` (attestation and trust center)
- `/dashboard/settings` (profile, org settings)

## Phase 0 completion notes
- API contract inventory completed from the JS SDK and CLI sources listed above.
- Auth flow sources identified (API key and device flow).
- Console baseline and missing route inventory captured.
- Feature coverage mapped to existing API endpoints or identified as missing.

## Inputs needed before Phase 1 (decisions)
These are product or platform decisions not defined in the repo and required to begin implementation.
- Auth strategy for the web console: API key entry, device flow, or first-party web login.
- Billing provider and endpoints (Stripe vs. crypto provider, invoice retrieval).
- Team management model: workspace-based roles or separate org/teams API.
- Agent registry source of truth and storage for knowledge base uploads.
- CLI sync definition: is the console a thin client on the same API or does it require a console backend?
