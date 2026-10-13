<!-- concile:start -->
## Concile backend

This project uses Concile, a self-hosted reactive TypeScript backend.

- Backend functions live in `concile/`. Queries read, mutations write (one transaction each), actions call the outside world.
- `concile/_generated/` is generated. Never edit it. Run `npx concile codegen` (or keep `npx concile dev` running).
- Schema: `concile/schema.ts`. Components (auth, scheduler, ...): `concile.config.ts`. Add one with `npx concile add <name>`.
- Clients subscribe with `useQuery(api.module.fn)`; results update live, no polling.
- Docs: https://concile.dev/docs
<!-- concile:end -->
