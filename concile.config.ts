import { defineConfig } from "@concile/component";
import { defineAuth } from "@concile/auth";

// Components add features to your backend. Add more with `npx concile add <name>`.
export default defineConfig({ components: [defineAuth()] });
