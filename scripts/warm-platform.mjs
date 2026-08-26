const baseUrl = process.env.PLATFORM_WARM_URL || "http://localhost:3000";
const routes = ["/login", "/register"];
const deadline = Date.now() + 120_000;

async function waitForServer() {
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/login`);
      if (response.ok) {
        return true;
      }
    } catch {
      // Server is still booting.
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  return false;
}

async function warmRoute(route) {
  const startedAt = Date.now();
  const response = await fetch(`${baseUrl}${route}`);
  const elapsed = Date.now() - startedAt;
  console.log(`[platform-warm] ${route} -> ${response.status} in ${elapsed}ms`);
}

const ready = await waitForServer();

if (!ready) {
  console.log("[platform-warm] skipped: platform server did not become ready in time");
  process.exit(0);
}

for (const route of routes) {
  try {
    await warmRoute(route);
  } catch (error) {
    console.log(`[platform-warm] ${route} failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}
